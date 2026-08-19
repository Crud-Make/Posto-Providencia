---
name: fix-preco-litro-historico
description: "Bug do \"preço único\" corrigido na branch fix/preco-litro-historico (dbb38bb) — dia passado lia preco_venda de hoje; falta validar na tela, e aggregator + custo carimbado ficaram como dívida"
metadata: 
  node_type: memory
  type: project
  originSessionId: e14ef858-7750-49c5-99d4-ecbc9f8e8f49
  modified: 2026-08-14T11:28:27.437Z
---

**Achado pelo dono em 14/08/2026:** janeiro aparecia a R$ 6,98/L (preço atual do
cadastro) em vez de 6,28–6,48. O preço oscila **dentro** do mês (março: 8 preços
distintos na gasolina) — modelo "preço por mês" não serve; o grão é o dia, e
`Leitura.preco_litro`/`valor_total` já carimbam certo na submissão.

**Corrigido em `fix/preco-litro-historico`, commit `dbb38bb`** (testes: 5 novos
em `useRelatorioDiario.test.ts` com o dia 01/01 real; suíte 200 vitest + 454
golden verde na hora do commit):

- `useRelatorioDiario` calcula venda/lucro por `vendaLucroDaLeitura()` — usa o
  carimbado, cadastro só como fallback de linha sem preço.
- Reabrir dia salvo restaura o preço do dia na tela: `useLeituras` ganhou o
  callback `aoRestaurarPrecoDoDia`, ligado ao `updateBicoPrice` (que edita preço
  **só em memória** da tela) em `fechamento-diario/index.tsx:73`.

**Não validado pelo dono na tela ainda** (regra de ouro do §9 — sem ok, sem
merge). **Dívidas registradas no CHANGELOG:** `aggregator.service.ts` ainda usa
preço/custo do cadastro nas margens históricas do dashboard (exige golden antes
de mexer); o **custo** por litro não é carimbado na leitura (custo histórico
correto vive na RPC `get_dashboard_proprietario`). Ideia futura do dono aprovada
em conceito: tabela de **vigência de preço** apenas como default de
preenchimento — nunca como fonte de cálculo, e nunca modal que altere preço de
período já gravado.

Obs.: o dono estava no meio do WIP `feat/calendario-unico` (working tree com
`shared/ui/calendario/` e 8 telas tocadas, type-check quebrando em 4) — não
misturar com esta branch.
