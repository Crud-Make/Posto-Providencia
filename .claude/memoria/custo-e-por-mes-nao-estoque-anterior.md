---
name: custo-e-por-mes-nao-estoque-anterior
description: "A planilha custeia a venda pela compra do MESMO mês, não pelo estoque do mês anterior — o lucro de janeiro NÃO precisa da compra de dezembro"
metadata: 
  node_type: memory
  type: reference
  originSessionId: a76892f6-3d8e-4527-b36b-dd5cb48882a8
  modified: 2026-08-21T10:27:44.180Z
---

**[21/08/2026]** Confirmado pelo agente `planilha` na fonte auditável (aba `POSTO JORRO 2026`,
`F16 = E16/D16`): o custo do combustível vendido é a **média das compras lançadas no próprio mês
da venda** (`Media LT = Compra R$ ÷ Compra LT`). NÃO existe custo de abertura vindo do mês
anterior. A coluna `Estoque ano passado` entra só na conta de **volume** (Perca e Sobra), nunca
no custo.

Logo: o combustível fisicamente comprado em dez/2025 e vendido no começo de janeiro é custeado
pela média das compras de **janeiro/2026**. A compra de 2025 não entra na fórmula de lucro.

O código já casa com isso: `useCustoMensal.ts` filtra `Compra` por `gte/lte` do mês da venda, e
`get_dashboard_proprietario` casa `date_trunc('month', compra) = date_trunc('month', leitura)`.
Sem divergência a corrigir. Ver [[despesa-vem-do-banco]] e [[fix-preco-litro-historico]].

**Custos de janeiro/2026 que a planilha usou** (compras de JANEIRO, para lançar em `/compras`):
- Gasolina Comum: 31.000 L / R$ 165.700 → 5,34516
- Gasolina Aditivada: 5.000 L / R$ 26.555 → 5,311
- Etanol: 8.000 L / R$ 32.800 → 4,10
- Diesel S10: 3.000 L / R$ 16.140 → 5,38

Armadilha: banco tem 0 compras de janeiro e `Combustivel.preco_custo` da gasolina = 5,802 (custo
de agosto). Sem lançar a compra de janeiro, o dashboard cai nesse fallback e a margem sai errada
(alta demais no custo, lucro baixo demais).

Mudar para custear pela compra física de dezembro (média ponderada com estoque anterior) é
**mudar o método** da planilha → exige golden master (§0.6) + decisão do dono.

Planilha de 2025: `~/Downloads/Posto,Jorro, 2025.xlsx` (sha 8a01e79f…37ac1c, abas Mes 01–12 +
POSTO JORRO,2025 + AFERICAO). Não é necessária para lucro; só serviria para o volume de
`Estoque ano passado`. Ver [[planilha-fonte-onde-esta]].
