---
name: medir-complexidade-ccn
description: Como medir CCN neste monorepo — oxlint SUPORTA eslint/complexity (mas `--rules` não lista nada); receita do ESLint com teto 0 para pegar toda função; as duas ferramentas concordam
metadata:
  type: reference
---

Medido em **17/09/2026**. O §6 do CLAUDE.md cobra "ESLint complexity rules" no
frontend, e a pergunta "qual teto?" volta sempre. Isto é como obter o número, não o
número.

**A armadilha do ferramental:** `oxlint --rules` imprime **zero linhas** (saída vazia,
exit 0). Isso faz parecer que o oxlint não tem regra de complexidade. **Tem.** A única
forma de descobrir é sondar rodando com `-c`:
```bash
cd frontend && export PATH="$HOME/.bun/bin:$PATH"
echo '{ "rules": { "eslint/complexity": ["error", 10], "eslint/max-lines": ["error", 400] } }' > /tmp/ox.json
./node_modules/.bin/oxlint -c /tmp/ox.json packages/utils/src/troca-preco.ts
```
Não existe `.oxlintrc.json` no repo — então `bun run lint` (= `oxlint .`) roda só o
preset de *correctness* padrão. **Complexidade não é medida por nenhum gate hoje.**

**Receita do ESLint para o histograma completo.** A regra `complexity` só reporta
quem passa do teto; com `max: 0` ela reporta **toda** função com o CCN no texto, que é
o que permite montar o histograma e o denominador de funções:
```bash
cd frontend && ./node_modules/.bin/eslint apps packages -c <config> -f json > ccn.json
# parse: /^(.*?) has a complexity of (\d+)\./
```
Duas pegadinhas na config: (a) se o arquivo de config mora **fora** do repo, o
`import` do `@typescript-eslint/parser` falha com `ERR_MODULE_NOT_FOUND` — usar
caminho absoluto para `frontend/node_modules/@typescript-eslint/parser/dist/index.js`;
(b) `parserOptions.ecmaFeatures.jsx = true` é obrigatório ou todo `.tsx` vira erro de
parse e some da contagem (falso "zero funções complexas").

**As duas ferramentas concordam.** Em 17/09/2026 oxlint e ESLint devolveram o
**mesmo** conjunto de funções acima de 10 e os **mesmos** valores de CCN, topo a topo.
Então não vale rodar as duas: medir com ESLint (histograma), travar o gate no oxlint
(é o que já está no `bun run lint`).

**Sempre separar teste de produção** — os `*.golden.spec.ts` geram muita função
trivial e diluem o percentil. O corpus de teste é ~1/3 das funções e praticamente não
tem complexidade (o maior mora num helper de golden, não em asserção).

Recontar o histograma e a curva de calibração (teto → funções → arquivos):
```bash
cd frontend && ./node_modules/.bin/oxlint -c /tmp/ox.json apps packages 2>&1 \
  | grep 'eslint(complexity)' | grep -vE '\.(test|spec)\.tsx?:' \
  | sed -E 's/.*complexity of ([0-9]+).*/\1/' | sort -rn | uniq -c
```

Ver [[divida-aceita]] e [[falsos-positivos-varredura]].
