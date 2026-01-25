import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: [
      "supabase_migrations/**",
      "supabase/.temp/**",
      "public/**",
      "posto-mobile/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      parser: tsParser,
    },
    rules: {},
  },
];

