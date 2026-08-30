---
name: aggregator-nasceu-como-legacy-service
description: O aggregator.service.ts é o resto não modularizado do api.ts — nasceu legacy.service.ts em 4a908c1 (09/01/2026) e foi rebatizado de "Facade" 1 dia depois em 548a19c, sem nunca ser quebrado
metadata:
  type: project
---

`apps/web/src/services/api/aggregator.service.ts` — **963 linhas em 28/08/2026,
20 commits em toda a vida.**

**Nasceu como sobra, não como projeto.** `4a908c1` (09/01/2026,
*"refactor(api): modularizacao do api.ts em services especificos (Issue #8)"*,
corpo vazio) partiu o `services/api.ts` em services por entidade; o que não
coube virou `legacy.service.ts`. No dia seguinte `548a19c` (10/01/2026,
*"refactor(api): rename legacy to aggregator service (#10)"*) o rebatizou:

> - Renames legacy.service.ts to aggregator.service.ts
> - Implements Facade pattern documentation
> - Updates index exports preserving legacy alias

Ou seja: **o resto foi promovido a padrão de projeto em vez de dissolvido.** O
alias sobreviveu — `apps/web/src/services/api/index.ts:45` ainda exporta
`aggregatorService as legacyService`, e `:117` mantém `legacy: aggregatorService`.

**Nunca houve tentativa abandonada de quebrá-lo.** Não existe branch, PR ou
commit revertido com esse objetivo. O que houve foi extração **de fórmula**, com
sucesso e sem reverter:
- `db8aa5d` (26/07/2026) — `conferido`/`cartao` passam a vir de `@posto/utils`
- `2a97224` (26/07/2026) — mata o `0,45/L` fixo de 2018, usa
  `despesaOperacionalMensal` de `@posto/utils`

Depois de julho ele só recebeu correção pontual: `8aff33c` (31/07, fuso),
`c1e90b3` (31/07, gráfico), `422ab4e` (30/07, remove empréstimo/CPF),
`0138841` (19/08, realtime/preço digitado — último toque).

**Ainda lê `custo_medio` cru em 3 pontos:** linhas 427, 804 e 935. É por onde a
fórmula de escrita ponderada vaza para o painel — ver
[[custo-duas-formulas-quem-nasceu-primeiro]].

**How to apply:** ao propor quebrar o aggregator, saber que não se está
desfazendo uma decisão de arquitetura — o "Facade" de `548a19c` é etiqueta
posterior colada num resto de refactor. E que o caminho já validado nesta base é
**extrair a fórmula para `packages/utils` primeiro**, deixando o arquivo grande
onde está (ordem que o §2 do CLAUDE.md também exige).
