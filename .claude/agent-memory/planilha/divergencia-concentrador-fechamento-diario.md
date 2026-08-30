---
name: divergencia-concentrador-fechamento-diario
description: fechamento_diario tem DUAS colunas de concentrador que divergem em todos os dias — encerrante×preço vs bloco Caixa; qual vai no dashboard é decisão do dono
metadata:
  type: project
---

Conferido em 19/08/2026: `fechamento_diario` carrega duas medidas de "venda do
concentrador" para o mesmo dia, e elas **divergem em 100% dos dias comparáveis**
(90 de 90 na rodada atual do ETL):

- `venda_concentrador_total` — soma de `encerrante_diario.venda_bico`
  (litros × preço do dia). Fecha exatamente com a soma dos encerrantes.
- `caixa_venda_concentrador` — o número do bloco "Caixa Dia" da planilha, que é
  o que os frentistas prestam contas (`caixa_venda_frentista` bate com ele, e a
  soma de `frentista_dia_total.venda_concentrador` também).

Query para reconferir (roda em segundos, não confie na contagem antiga):

```sql
SELECT COUNT(*), SUM(ABS(caixa_venda_concentrador - venda_concentrador_total) > 0.01)
FROM fechamento_diario
WHERE venda_concentrador_total IS NOT NULL AND caixa_venda_concentrador IS NOT NULL;
```

**Why:** a hipótese óbvia — "venda do concentrador é uma coisa só" — é falsa
nesta base. O caixa inclui o que não passa pelos bicos (produtos, lubrificante)
e/ou arredondamentos do concentrador físico; o encerrante×preço é só combustível.
Não foi decidido qual das duas o dashboard deve exibir como "venda do dia".

**How to apply:** pergunta de "venda do concentrador do dia" → devolver as DUAS
colunas com nome, nunca escolher uma calado (regra 4). A `diferenca` de caixa dos
frentistas se calcula contra `caixa_venda_concentrador` (é o lado que
`frentista_dia_total.falta` usa), não contra a soma dos encerrantes. Ver
[[tabelas-que-existem-de-fato]] e [[divergencia-venda-resumo-vs-diario]].
