---
name: replay-janeiro-compras-despesas-lancadas
description: "Replay jan/2026 — compras (ids 41-44) e despesas Lista A (ids 139-153, R$22.158,46) lançadas por SQL; lucro líquido fica negativo até o mês todo entrar"
metadata: 
  node_type: memory
  type: project
  originSessionId: a76892f6-3d8e-4527-b36b-dd5cb48882a8
  modified: 2026-08-21T10:52:00.513Z
---

**[21/08/2026]** No replay de janeiro/2026 (ver [[validacao-final-onde-parei]],
[[salvar-travado-linhas-semeadas]]), lancei via `execute_sql` (produção, com ok do dono):

- **Compras** (tabela `Compra`, ids 41–44), data 2026-01-01, fornecedor 3: GC 31.000L/165.700,
  GA 5.000/26.555, ET 8.000/32.800, Diesel 3.000/16.140. Custos/litro batem com a planilha
  (5,34516 / 5,311 / 4,10 / 5,38). Ver [[custo-e-por-mes-nao-estoque-anterior]].
- **Despesas** (tabela `Despesa`, ids 139–153), data 2026-01-01, status pago, **Lista A =
  R$ 22.158,46** (a da planilha/golden, escolhida pelo dono sobre a Lista B de 35.523,58 de
  `despesa_lancada`). Ver [[divergencia-despesa-duas-listas]].

**Por que a tela de Compras NÃO serviu:** grava sempre com `hojeIso()` (sem seletor de data) e
mexe no estoque/custo médio atuais — lançaria compra de agosto. Por isso foi SQL direto. Já a tela
de **Despesas TEM seletor de data** (`input type=date`), então dava para usar a UI; usei SQL só
por velocidade (15 itens).

**Efeito mês-parcial (não é bug):** com só 01/01 lançado (1.602 L), a Planilha do Mês mostra
custo operacional R$ 13,83/L e lucro líquido −R$ 20.828,52 — porque a despesa é mensal (lump) e a
venda acumula por dia. O custo/litro da planilha (0,47304) só aparece com o mês todo lançado
(46.843 L: `SUM(litros) resumo_mensal_bico mes=1`). Conforme os dias entram, o líquido converge.

**Falta no replay de janeiro:** lançar os demais dias (02/01…31/01) pelo fluxo salvar→pula-dia; e
as **taxas de cartão**, que dependem de `Recebimento` (hoje 0 — a aba Financeiro precisa ser
preenchida no Salvar de cada dia). Margem bruta de 01/01 conferida = R$ 1.329,95 (SQL) vs 1.329,94
(tela), diferença de 1 centavo por arredondamento.
