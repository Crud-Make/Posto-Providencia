import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
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
      globals: globals.browser,
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
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
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/static-components": "error",
      "react-hooks/immutability": "error",
      "react-hooks/preserve-manual-memoization": "error",
    },
  },
];

