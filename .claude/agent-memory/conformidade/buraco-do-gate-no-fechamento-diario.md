---
name: buraco-do-gate-no-fechamento-diario
description: Por que o módulo fechamento-diario passa verde em todos os gates apesar de violar CCN, tamanho e FSD — três isenções nomeadas, não ausência de violação
metadata:
  type: project
---

Medido em **20/09/2026** no módulo `apps/web/src/components/fechamento-diario`. O
módulo passa `bun run lint`, `type-check`, `test` e `test:golden`. Isso **não** quer
dizer que ele está em conformidade: quer dizer que três isenções nomeadas cobrem
exatamente as violações que ele tem.

**1. Um arquivo do módulo está na lista de escape do oxlint** — o único acima do teto
global de 20, listado no `overrides` de 35. **O NOME MUDOU em 21/09/2026:** era
`useSubmissaoFechamento.ts`; o commit `a03714c` (#103 P11) extraiu o caminho legado
para `hooks/gravacaoLegadaSupabase.ts` e a linha do override foi junto. Hoje
`useSubmissaoFechamento.ts` mede **abaixo de 10** e `gravarPeloSupabase` mede **23**.
Não citar o nome de memória — ler o arquivo. Tirar a linha deixa o gate vermelho,
esse é o canário:
```bash
cd frontend && grep -n 'fechamento-diario' .oxlintrc.json
echo '{"categories":{"correctness":"off"},"rules":{"eslint/complexity":["error",20]}}' > /tmp/c20.json
./node_modules/.bin/oxlint -c /tmp/c20.json -f unix apps/web/src/components/fechamento-diario | grep complexity
```

**2. `components/` está FORA do `boundaries` do ESLint, por desenho.** O
`eslint.config.mjs` só declara elementos em `apps/web/src/{app,pages,widgets,features,entities,shared}`
e o comentário diz "pastas fora das camadas (components/, services/, utils/…) são o
legado do strangler e ficam fora da regra até migrarem". Logo **nenhuma** regra FSD
roda neste módulo — import lateral entre slices de `components/` não é acusado por
ninguém:
```bash
cd frontend && grep -n 'boundaries/elements' -A10 eslint.config.mjs
```

**3. `strict-boolean-expressions` e `no-floating-promises` estão CONGELADOS pela
catraca** neste módulo — o erro que já existia não reprova, só o novo:
```bash
cd frontend && grep -o 'fechamento-diario[^"]*' .catraca/eslint.json | sort | uniq -c
```

**Nenhum teto de linha é gate.** O `.oxlintrc.json` trava `max-lines` em **900** e não
trava `max-lines-per-function` de jeito nenhum; os tetos que o dono decidiu em 19/09
(300 por arquivo, 60 por função) **não têm trava**. Recontar o módulo contra eles:
```bash
cd frontend && echo '{"categories":{"correctness":"off"},"rules":{"eslint/max-lines-per-function":["error",{"max":60,"skipBlankLines":true,"skipComments":true}],"eslint/max-lines":["error",{"max":300,"skipBlankLines":true,"skipComments":true}]}}' > /tmp/len.json
./node_modules/.bin/oxlint -c /tmp/len.json -f unix apps/web/src/components/fechamento-diario | grep -vE '\.(test|spec)\.'
```

**O lado backend é o oposto, e isso é o argumento da migração.** Em 20/09,
`app/Fechamento` (15 arquivos PHP) devolve **zero** de PHPMD, zero `throw`, zero acesso
cru a `$request`, dinheiro 100 % em `decimal:2` e controllers de 24–30 linhas. Reconferir:
```bash
cd backend && vendor/bin/phpmd app/Fechamento text phpmd.xml; echo "exit=$?"
grep -rn 'throw \|$request->\(input\|get\|all\|query\)(' app/Fechamento/
```

Ver [[dois-parsers-de-encerrante-divergem]]. O histórico completo deste agente está em
`.claude/agent-memory/conformidade/` na **raiz** do repo, não aqui.
