import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import neverthrow from "@bufferings/eslint-plugin-neverthrow";
import boundaries from "eslint-plugin-boundaries";
import globals from "globals";

// Public API do slice (FSD-3): de fora, só pelo index. Cobre os aliases do web (`@pages/x/…`
// e `@/pages/x/…`), o do pwa-frentista (`@frentista/pages/x/…`) e o caminho relativo — inclusive
// `./pages/x/…` feito da raiz do src, onde App.tsx e main.tsx moram (brecha fechada em 19/09).
// É constante porque `no-restricted-imports` NÃO se soma entre blocos: o bloco do pwa substitui
// o da base e precisa repetir este padrão.
const PUBLIC_API = {
  regex: "^((@/?|@frentista/)(pages|widgets|features|entities)/[^/]+/.+|(\\.\\.?/)+(pages|widgets|features|entities)/[^/]+/.+)$",
  message: "Importe o slice pela Public API (o index.ts dele), não o arquivo interno.",
};

// Sintaxe proibida em todo app/pacote. Constante pelo mesmo motivo: o bloco RES do pwa
// acrescenta `throw`/`try` e tem de repetir estas.
const SINTAXE_PROIBIDA = [
  // Data de calendário NUNCA sai de `toISOString()`. O posto está em GMT-3: a partir
  // das 21h locais o UTC já é o dia seguinte, então `.split('T')[0]` devolve amanhã e
  // `.slice(0, 7)` pula o mês na virada. Isso apagou o painel do proprietário inteiro
  // todas as noites (das 21h à meia-noite) até 31/07/2026. Use `hojeIso()` /
  // `paraIsoLocal()` de `apps/web/src/utils/periodo.ts`.
  //
  // A regra mira só a extração de data/mês. `toISOString()` inteiro em campo de
  // INSTANTE (`created_at`, `ultima_atualizacao`, `timestamp`) continua correto — ali
  // UTC é exatamente o que se quer.
  {
    selector:
      "CallExpression[callee.object.callee.property.name='toISOString'][callee.property.name=/^(split|slice|substring|substr)$/]",
    message:
      "Data de calendário via toISOString() usa UTC e pula um dia depois das 21h (GMT-3). Use hojeIso()/paraIsoLocal() de utils/periodo.",
  },
  // TS-8 (docs/arquitetura/regras.md): `enum` não é sintaxe apagável (`erasableSyntaxOnly`
  // dos PWAs) e gera objeto em runtime. Medido em 19/09: zero ocorrências em apps/ e
  // packages/ — entra com 0 dívida.
  {
    selector: "TSEnumDeclaration",
    message: "enum é proibido (TS-8): use união de literais ou objeto `as const`.",
  },
];

export default [
  {
    ignores: [
      "supabase_migrations/**",
      "supabase/.temp/**",
      "supabase/functions/**", // roda em Deno, fora do escopo desta config (Node/bundler)
      "public/**",
      "posto-mobile/**",
      "scripts/**", // scripts ad-hoc, não fazem parte do build dos apps
      "spikes/**", // spikes descartáveis
      "**/dist/**",
      // Canários das travas (PROC-5). Violam regra de propósito e são lintados só pelo
      // teste ao lado, com `--no-ignore`. Ver apps/web/src/__canarios__/travas.test.ts.
      "**/__canarios__/**",
      // Slice vizinho do canário do pwa (widgets/__canario-vizinho__): o boundaries só acusa
      // import entre elementos DIFERENTES, então o vizinho não pode morar dentro de __canarios__.
      "**/__canario-vizinho__/**",
      // Canário da FSD-3 pela raiz do src do pwa (`./pages/x/y` de onde App.tsx mora). Só
      // este arquivo: um glob `**/*.fixture.ts` deixaria qualquer arquivo real com esse
      // sufixo invisível ao ESLint. Os outros fixtures já moram em __canarios__.
      "apps/pwa-frentista/src/raiz.fixture.ts",
    ],
  },
  // Código de app/pacote (apps/*, packages/*) — TS/TSX, ESM, React.
  // Fonte única de regra do monorepo: nenhuma config por app deve divergir disto.
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "types/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tsParser,
      // Type-aware linting. Sem isto o typescript-eslint não enxerga TIPO, e toda regra
      // que dependa dele vira no-op silencioso — foi o que a sonda de 17/09 mostrou: o
      // oxlint ACEITA `no-floating-promises` na config e reporta zero, porque lê sintaxe
      // e não tipos. `neverthrow/must-use-result` é uma dessas: precisa do tipo de
      // retorno para saber que a função devolve um `Result`.
      // Exige `strict` no tsconfig (ligado em 18/09) — sem `strictNullChecks` o
      // typescript-eslint DESLIGA as regras type-aware com um aviso e segue.
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.browser,
    },
    settings: {
      // Camadas do FSD em apps/web/src. Cada pasta dentro da camada é um slice (elemento).
      "boundaries/elements": [
        { type: "app", pattern: "apps/web/src/app" },
        { type: "pages", pattern: "apps/web/src/pages/*" },
        { type: "widgets", pattern: "apps/web/src/widgets/*" },
        { type: "features", pattern: "apps/web/src/features/*" },
        { type: "entities", pattern: "apps/web/src/entities/*" },
        { type: "shared", pattern: "apps/web/src/shared" },
        // Camadas do FSD em apps/pwa-frentista/src (19/09/2026). Mesmos tipos: as policies
        // abaixo valem para os dois apps. Pastas legadas (lib/, screens/, services/,
        // components/) ficam fora até migrarem — strangler, como no web.
        { type: "app", pattern: "apps/pwa-frentista/src/app" },
        { type: "pages", pattern: "apps/pwa-frentista/src/pages/*" },
        { type: "widgets", pattern: "apps/pwa-frentista/src/widgets/*" },
        { type: "features", pattern: "apps/pwa-frentista/src/features/*" },
        { type: "entities", pattern: "apps/pwa-frentista/src/entities/*" },
        { type: "shared", pattern: "apps/pwa-frentista/src/shared" },
      ],
      "import/resolver": { typescript: { project: import.meta.dirname + "/tsconfig.json" } },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      neverthrow,
      boundaries,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // TS já cobre isso; no-undef dá falso-positivo com tipos globais do DOM/lib.
      "no-undef": "off",
      // Dívida zerada em 2026-07-26 (151→0 warnings) — regras travadas em "error" pra
      // barrar regressão no CI. Ver memória `eslint-zero-divida-tecnica` pro histórico.
      "react-refresh/only-export-components": "error",
      "@typescript-eslint/no-explicit-any": "error",
      // ignoreRestSiblings: permite `const { id: _id, ...resto } = obj` pra excluir uma
      // chave via destructuring — o binding descartado é o próprio ponto do padrão, não
      // é dívida. Sem essa opção, o fix "correto" vira `delete obj.id`, que não estreita
      // o tipo (perde o `id` só em runtime, não na checagem estática).
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "@typescript-eslint/no-empty-object-type": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      // toISOString() de calendário e `enum` (TS-8) — o porquê está em SINTAXE_PROIBIDA, no topo.
      "no-restricted-syntax": ["error", ...SINTAXE_PROIBIDA],
      // Result Pattern (docs/arquitetura/regras.md, RES-2). Um `Result` devolvido e não
      // consumido é um erro engolido: o caminho de falha simplesmente não acontece, e
      // ninguém fica sabendo. A regra obriga `.match()`, `.unwrapOr()` ou, quando for
      // mesmo o caso, `._unsafeUnwrap()` — que ao menos é explícito no nome.
      //
      // Entra VERDE: hoje nenhuma função do monorepo devolve `Result`. É trava para o
      // código novo, não migração. Converter o que existe (RES-1: falha de negócio
      // retorna Result, `throw` só para infraestrutura) muda assinatura de função de
      // domínio e não toca dinheiro sem golden verde antes e depois.
      //
      // Plugin: o `eslint-plugin-neverthrow` oficial está parado desde maio/2022, é
      // anterior ao flat config e depende de `eslint-utils@3`/`tsutils` legados. O fork
      // `@ninoseki` é o mais novo mas exige eslint >= 10 (estamos no 9). O `@bufferings`
      // pede eslint >= 9 e parser >= 8.48, que é o que temos.
      // TS-3 do registro. Custo ZERO hoje: medido em 18/09, zero ocorrências no
      // monorepo. As irmãs ficaram de fora porque não são de graça, e a medição está
      // na issue: strict-boolean-expressions = 433 erros, no-floating-promises = 69,
      // require-await = 25. Entram uma por vez, cada uma com seu PR.
      "@typescript-eslint/await-thenable": "error",
      // Entraram em 18/09/2026 sob CATRACA (scripts/catraca.mjs, lista em .catraca/eslint.json):
      // o erro que já existia fica congelado, o NOVO reprova. Custo medido na entrada:
      // strict-boolean-expressions ≈ 433, no-floating-promises ≈ 69.
      //
      // strict-boolean-expressions: `if (valor)` com número é o bug clássico do dinheiro —
      // R$ 0,00 é falsy e o ramo "não tem valor" roda para um valor que existe. Por isso
      // `allowNumber: false`: o padrão da regra DEIXA número passar, e o canário mostrou que
      // assim ela não acusava `valor ? … : …` — o caso que motivou a trava.
      "@typescript-eslint/strict-boolean-expressions": ["error", { allowNumber: false }],
      // Promise solta é erro engolido: a gravação falha e a tela diz que salvou.
      "@typescript-eslint/no-floating-promises": "error",
      // FSD (docs/arquitetura/regras.md). Camada só importa camada ABAIXO; slice não importa
      // slice vizinho da mesma camada. Pastas fora das camadas (components/, services/,
      // utils/…) são o legado do strangler e ficam fora da regra até migrarem.
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          policies: [
            { from: { element: { type: "shared" } }, disallow: { to: { element: { types: { anyOf: ["entities", "features", "widgets", "pages", "app"] } } } } },
            { from: { element: { type: "entities" } }, disallow: { to: { element: { types: { anyOf: ["entities", "features", "widgets", "pages", "app"] } } } } },
            { from: { element: { type: "features" } }, disallow: { to: { element: { types: { anyOf: ["features", "widgets", "pages", "app"] } } } } },
            { from: { element: { type: "widgets" } }, disallow: { to: { element: { types: { anyOf: ["widgets", "pages", "app"] } } } } },
            { from: { element: { type: "pages" } }, disallow: { to: { element: { types: { anyOf: ["pages", "app"] } } } } },
          ],
        },
      ],
      // Public API do slice: de fora, só pelo index. `@widgets/x/ui/y` fura o encapsulamento —
      // e `@/widgets/x/ui/y` também: o tsconfig tem os dois aliases (`@/*` e `@widgets/*`), e a
      // primeira versão desta regex só olhava o segundo (revisão do PR #119, 18/09).
      "no-restricted-imports": ["error", { patterns: [PUBLIC_API] }],
      "neverthrow/must-use-result": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/static-components": "error",
      "react-hooks/immutability": "error",
      "react-hooks/preserve-manual-memoization": "error",
    },
  },
  // pwa-frentista (19/09/2026) — FSD-5 e FSD-6. O app tem alias próprio, `@frentista/`, porque
  // `@/`, `@pages/`, `@shared/`… são do apps/web no tsconfig raiz: um `@/` aqui compilava no
  // Vite (que apontava para o src do pwa) e era conferido contra o web no tsc e no vitest.
  // App não importa outro app — o que é comum vai para packages/* — e subir dois níveis de
  // `../` é o sinal de que o alias devia ter sido usado. Medido na entrada: 0 ocorrências de
  // cada padrão no pwa; entra sem dívida. Canário: apps/pwa-frentista/src/__canarios__/travas.test.ts.
  {
    files: ["apps/pwa-frentista/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            PUBLIC_API,
            {
              regex: "^@/",
              message: "No pwa-frentista `@/` é o apps/web (tsconfig raiz). O alias deste app é `@frentista/` (FSD-5/FSD-6).",
            },
            {
              regex: "^@(app|pages|widgets|features|entities|shared)/",
              message: "`@pages/`, `@shared/`… são aliases do apps/web. Use `@frentista/<camada>/…` (FSD-5).",
            },
            {
              regex: "apps/(web|pwa-dono)/",
              message: "App não importa outro app: o que é comum vai para packages/* (FSD-5).",
            },
            {
              regex: "^(\\.\\./){2,}",
              message: "Import relativo subindo dois níveis ou mais: use o alias `@frentista/` (FSD-6).",
            },
          ],
        },
      ],
    },
  },
  // pwa-frentista (19/09/2026) — RES-1 e RES-3 (docs/arquitetura/regras.md). Regra de negócio
  // não usa `throw` nem `try/catch`: devolve `Result`/`ResultAsync` do neverthrow, com o erro
  // como união discriminada. `try/catch` fica só na borda que fala com o mundo (fetch, SDK),
  // e ali vira `ResultAsync.fromPromise(...)` — por isso `shared/api` (e só ela) fica FORA deste bloco de
  // propósito; `shared/lib` e `shared/ui` estão dentro (mesmo desenho de apps/web/src/services/api/base.ts). Entra verde: as camadas
  // ainda não existem no pwa; o legado (lib/, screens/, services/, App.tsx) fica fora até
  // migrar. `no-restricted-syntax` não se soma entre blocos, daí SINTAXE_PROIBIDA repetida.
  {
    files: [
      "apps/pwa-frentista/src/{pages,widgets,features,entities}/**/*.{ts,tsx}",
      "apps/pwa-frentista/src/shared/{lib,ui}/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        ...SINTAXE_PROIBIDA,
        {
          selector: "ThrowStatement",
          message: "Regra de negócio devolve Result (neverthrow), não lança (RES-1). throw só em shared/api, na borda.",
        },
        {
          selector: "TryStatement",
          message: "Regra de negócio devolve Result (neverthrow); try/catch só em shared/api, na borda, virando ResultAsync.fromPromise (RES-3).",
        },
      ],
    },
  },
];

