---
name: taxa-cartao-e-despesa-do-mes
description: "Dono confirmou em 26/08/2026 que a taxa de cartão entra como item da lista de despesas do mês (modelo da planilha); o card Receitas/Despesas desconta de novo pelo carimbo `Fechamento.taxas_pagamento`"
metadata: 
  node_type: memory
  type: project
  originSessionId: cf4365d5-3c36-4a18-87a7-d79074f3cbd6
  modified: 2026-08-26T12:41:39.182Z
---

**[26/08/2026]** Pergunta feita ao dono: "a taxa do cartão você põe na lista de despesas do
mês?" — **sim**. Logo, o modelo certo é o de `frontend/packages/utils/src/lucro.ts`: taxa NÃO é
dedução por transação, é mais uma despesa mensal rateada por litro. Compras e Planilha do
Mês já fazem isso (leem só a tabela `Despesa`).

**O que diverge:** o card Receitas/Despesas (`useFinanceiro.ts`) calcula
`lucro líquido = bruto − taxas_pagamento − faltas − despesas`, onde `taxas_pagamento` é o
carimbo que a aba Fechamento Financeiro grava (`valor × FormaPagamento.taxa/100`, via
`usePagamentos`). Quando a fatura da adquirente também está lançada em `Despesa`, o card
**desconta a taxa duas vezes**. É mudança de fórmula → golden + decisão do dono antes de
mexer (§0.6). Ver [[card-receitas-despesas-le-coluna-carimbada]] e
[[duas-formulas-de-custo-divergem-no-mes]].

**Why:** dois modelos de taxa no mesmo sistema dão dois lucros para o mesmo mês.
**How to apply:** ao apresentar lucro ao dono, usar Compras/Planilha do Mês; tratar o card
como não-confiável até unificar. Não confirmei se a Lista A de janeiro (15 itens) inclui a
taxa da adquirente — conferir na planilha antes do replay.
