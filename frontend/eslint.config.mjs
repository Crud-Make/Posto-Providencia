import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import neverthrow from "@bufferings/eslint-plugin-neverthrow";
import boundaries from "eslint-plugin-boundaries";
import globals from "globals";

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
      // É também o que os deixa FORA dos tetos de tamanho (Q-2/Q-3): ignorados aqui, não
      // entram na catraca; com `--no-ignore` o canário ainda os alcança.
      "**/__canarios__/**",
      // Gerados pelo Supabase (2517 e 1611 linhas): não são código escrito à mão, ficam fora
      // dos tetos de tamanho (Q-2) e de tudo o mais. Eram só ignorados pelo oxlint até 19/09.
      "**/types/database/generated.ts",
      "**/database.types.ts",
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
      // Data de calendário NUNCA sai de `toISOString()`. O posto está em GMT-3: a partir
      // das 21h locais o UTC já é o dia seguinte, então `.split('T')[0]` devolve amanhã e
      // `.slice(0, 7)` pula o mês na virada. Isso apagou o painel do proprietário inteiro
      // todas as noites (das 21h à meia-noite) até 31/07/2026. Use `hojeIso()` /
      // `paraIsoLocal()` de `apps/web/src/utils/periodo.ts`.
      //
      // A regra mira só a extração de data/mês. `toISOString()` inteiro em campo de
      // INSTANTE (`created_at`, `ultima_atualizacao`, `timestamp`) continua correto — ali
      // UTC é exatamente o que se quer.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.callee.property.name='toISOString'][callee.property.name=/^(split|slice|substring|substr)$/]",
          message:
            "Data de calendário via toISOString() usa UTC e pula um dia depois das 21h (GMT-3). Use hojeIso()/paraIsoLocal() de utils/periodo.",
        },
      ],
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
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: "^(@/?(pages|widgets|features|entities)/[^/]+/.+|(\\.\\./)+(pages|widgets|features|entities)/[^/]+/.+)$",
              message: "Importe o slice pela Public API (o index.ts dele), não o arquivo interno.",
            },
          ],
        },
      ],
      "neverthrow/must-use-result": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/static-components": "error",
      "react-hooks/immutability": "error",
      "react-hooks/preserve-manual-memoization": "error",
      // Q-1 (docs/arquitetura/regras.md): complexidade ciclomática ≤ 10, o mesmo teto do PHPMD no
      // backend. Até 19/09 morava no oxlint com teto 20 e 13 arquivos isentos em 35 — e o oxlint
      // não passa pela catraca nem pelo `--no-inline-config`. Aqui a regra entra sob a catraca de
      // MEDIDA (scripts/catraca.mjs): as 67 funções acima do teto (66 em produção + 1 golden) ficam
      // congeladas com o VALOR em `.catraca/eslint.json`; função nova acima de 10 reprova, e função
      // congelada que CRESCE reprova. Vale também para teste e golden: CCN alta num teste é teste
      // que ninguém entende. Canário: __canarios__/complexidade-11.fixture.ts.
      complexity: ["error", 10],
    },
  },
  // Q-2 e Q-3: tetos de TAMANHO, só para código de produção. Teste e golden ficam de fora
  // (decisão do dono, 19/09): tabela de golden e `describe` inflam linha sem inflar risco.
  // Os canários (`**/__canarios__/**`) já estão fora pelo `ignores` global acima.
  //
  // Convenção de contagem (a única que reproduz os números medidos — 26 arquivos, 161 funções):
  //   • arquivo: linha FÍSICA (skipBlankLines/skipComments false) — 300 linhas é 300 linhas;
  //   • função: linha ÚTIL (skipBlankLines/skipComments true) — comentário e linha em branco
  //     não contam, para não punir função bem documentada.
  // As duas entram sob a catraca de medida como a complexity: dívida congelada com o valor,
  // arquivo/função que cresce reprova. Canários: __canarios__/funcao-61-linhas.fixture.ts e o
  // arquivo de 301 linhas gerado em travas.test.ts.
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "types/**/*.{ts,tsx}"],
    ignores: ["**/*.test.*", "**/*.spec.*"],
    rules: {
      "max-lines": ["error", { max: 300, skipBlankLines: false, skipComments: false }],
      "max-lines-per-function": ["error", { max: 60, skipBlankLines: true, skipComments: true }],
    },
  },
];

