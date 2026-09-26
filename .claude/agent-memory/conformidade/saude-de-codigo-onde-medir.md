---
name: saude-de-codigo-onde-medir
description: Receitas e armadilhas da auditoria de saúde (CCN, tamanho, SRP, catraca) — override do oxlint apodrece, widgets FSD falam com o Supabase direto, backend quase sem CCN, docs/data em worktree trava a limpeza
metadata:
  type: reference
---

Levantado em **19/09/2026** sobre `origin/fase-a` (40abfee). Os números mudam; as
receitas e as armadilhas não.

**Worktree descartável + golden: NÃO fazer symlink de `docs/data`.** O golden precisa
de `docs/data/` (gitignored). Em 19/09 criei `ln -s …/docs/data docs/data` na worktree,
o golden rodou verde — e o `rm docs/data` da limpeza foi **bloqueado pelo hook
`protege-dados`** (casa o caminho, não distingue symlink). Resultado: a worktree ficou
para o dono remover. Alternativa: rodar `bun run test:golden` no checkout que já tem
`docs/data`, ou deixar o golden de fora da worktree e dizer isso.

**CCN por função com oxlint (mais rápido que a receita do ESLint).** Teto 0 faz o
oxlint reportar TODA função — dá histograma e denominador sem ESLint:
```bash
echo '{"ignorePatterns":["**/node_modules/**","**/dist/**","**/database.types.ts","**/types/database/generated.ts"],"rules":{"eslint/complexity":["error",0]}}' > $SCRATCH/ox0.json
cd frontend && ./node_modules/.bin/oxlint -c $SCRATCH/ox0.json -f unix apps packages \
  | grep 'eslint(complexity)' | grep -vE '\.(test|spec)\.tsx?:' \
  | sed -E 's/^([^:]+):([0-9]+):[0-9]+: .*complexity of ([0-9]+).*/\3\t\1:\2/' | sort -rn
```
Função anônima (`useCallback`, `.map`, `React.FC` em const) sai **sem nome** — pegar o
nome com `sed -n "${linha}p" arquivo`. `eslint/max-lines-per-function` também existe no
oxlint (`{"max":60,"skipBlankLines":true,"skipComments":true}`); ele conta a função
externa inteira, então componente e hook-fábrica (`criarAcessoEncerrante`) inflam.

**O `overrides` de 35 do `.oxlintrc.json` apodrece.** Em 19/09, dos 13 arquivos
isentos, 1 já não existia (`shared/ui/ValidationAlert.tsx`, apagado em `1a46009`) e 4
tinham CCN máx ≤ 20 (a isenção não servia mais). Reconferir cruzando a lista com o CCN
atual de cada arquivo (receita acima) — arquivo sem hit no teto 0 = apagado.

**Widgets FSD são os piores em SRP, não o legado.** Os `model/*.ts` de
`widgets/planilha-do-mes`, `resumo-mensal` e `impacto-troca-preco` chamam
`supabase.from(...)` direto + `useState` + `@posto/utils`; não há segmento `api/`.
A taxa de função > 10 em `widgets/` era ~2× a de `components/`. Caçar:
```bash
for f in $(grep -rlE "supabase\.(from|rpc)\(" apps --include=*.ts --include=*.tsx); do grep -qE 'useState|useReducer' $f && echo $f; done
```

**Backend: PHPMD passa, CCN máx por módulo era 3.** Distribuição com reportLevel 1
(o de 10 do `phpmd.xml` nunca acusa nada nesse tamanho):
```bash
cd backend && vendor/bin/phpmd app text <ruleset com CyclomaticComplexity reportLevel=1> \
  | sed -E 's#^.*/app/([^/]+)/.*Complexity of ([0-9]+).*#\2 \1#' | sort -rn | head
```
Dinheiro no backend é `decimal:2` do Eloquent / string numeric — **não há Value Object
de dinheiro**, por decisão documentada (DadosDoPeriodo: "nunca float, DECISÃO 1").

**Duplicação byte a byte entre PWAs:** `components/ReloadPrompt.tsx` e `lib/supabase.ts`
idênticos em `pwa-frentista` e `pwa-dono`: `diff apps/pwa-frentista/src/components/ReloadPrompt.tsx apps/pwa-dono/src/components/ReloadPrompt.tsx`.

**`totalTaxas` (valor × taxa/100) tem 2 cópias sem `emCentavos`** —
`usePagamentos.ts` e `useFechamento.ts`; é a mesma divergência de
[[taxa-cartao-deduzida-duas-vezes]], categoria domínio.

Ver [[medir-complexidade-ccn]], [[formula-duplicada-fora-utils]], [[golden-master-como-conferir]].
