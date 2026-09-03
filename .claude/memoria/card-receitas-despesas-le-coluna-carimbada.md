---
name: card-receitas-despesas-le-coluna-carimbada
description: "O card da aba Receitas e Despesas soma colunas de lucro carimbadas em Fechamento (custo_combustiveis, taxas_pagamento) que a UI NUNCA grava — durante o replay elas são 0, então o card é não-confiável"
metadata: 
  node_type: memory
  type: reference
  originSessionId: a76892f6-3d8e-4527-b36b-dd5cb48882a8
  modified: 2026-08-21T22:52:35.887Z
---

**[21/08/2026]** Investigando por que a "Despesas Totais" da aba Receitas e Despesas mostrava
R$ 22.466,98 e não os R$ 22.158,46 lançados (ver [[replay-janeiro-compras-despesas-lancadas]]).

**Causa (confirmada por grafo + teste de banco):** `getLucroPorPeriodo`
(`apps/web/src/services/api/fechamento.service.ts:222`) NÃO calcula nada — só faz `SUM` de
colunas **já gravadas** em `Fechamento`: `custo_combustiveis`, `lucro_bruto`,
`taxas_pagamento`, `lucro_liquido`. Essas colunas só são preenchidas pelo script offline
`scripts/auditoria-lucro-mes.py` (aplicado à mão via `--sql`). A gravação da UI
(`useSubmissaoFechamento`) grava só `total_vendas/total_recebido/diferenca/status` — nunca as de
lucro. Como janeiro é replay pela UI, `custo_combustiveis = null → 0`. `taxas_pagamento` **não
tem escritor nenhum** no repo — é 0 estruturalmente, sempre.

Por isso `useFinanceiro.ts:253` (`custo 0 + taxas 0 + faltas 308,52 + despesasOps 22.158,46`) =
22.466,98. Os **308,52 são a falta de caixa do 01/01, contados UMA vez, e isso é correto** (a
receita é a venda cheia do concentrador, a falta é dinheiro que não entrou — subtrair uma vez é
certo, não é dupla contagem). `calcular_lucro_fechamento(704)` (RPC que usa `preco_custo`) daria
custo 8.587 / taxas 21,71 / faltas 308,52 — mas NÃO é o que o card usa.

**Conclusão:** o card Receitas e Despesas (Despesas Totais e Lucro Líquido) é **não-confiável no
replay** — depende de coluna carimbada que o replay não preenche, e ainda é incoerente
(`despesasTotal` soma faltas, mas o `lucro_liquido` exibido vem de coluna que não desconta). As
fontes confiáveis de lucro são a **Planilha do Mês** e a **Visão Proprietário**, que calculam ao
vivo de Leitura+Compra+Despesa. Ver [[custo-e-por-mes-nao-estoque-anterior]],
[[fix-preco-litro-historico]].

**Se for consertar:** refatorar o card para calcular ao vivo é mexer em dinheiro → tarefa própria
com golden master (§0.6). Carimbar via script de auditoria também é operação de dinheiro. Decisão
do dono; não fazer no meio do replay.

**Adendo 03/09/2026 — corrigido na branch `fix/lucro-fonte-unica` (`b38680c` + `88f2fc6`), sem merge.**
O card calcula da fonte: `Leitura` + `custoLitrosVendidos` (novo em `@posto/utils/lucro`, golden pela
identidade `lucro = venda − custo − despesas` no mês 01) + `Despesa`. **Falta de caixa saiu da conta**
por decisão do dono — o agente `planilha` provou que a planilha não desconta `Falta.` e que a fórmula
fecha em 0,00 com o `J11` dela. Janeiro no card: 13.272,20 (planilha: 25.337,92 — diferença é preço
fixo 6,38 × preço do dia, e a lista de despesa do app × da planilha, decisão pendente desde 16/08).
