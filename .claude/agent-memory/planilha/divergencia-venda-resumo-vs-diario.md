---
name: divergencia-venda-resumo-vs-diario
description: resumo_mensal_bico.venda e a soma de encerrante_diario.venda_bico não batem — preço único de fim de mês contra preço do dia; escolher a fonte muda o total
metadata:
  type: project
---

Para o mesmo mês, `SUM(resumo_mensal_bico.venda)` e
`SUM(encerrante_diario.venda_bico)` dão **valores diferentes**, e os litros dão
**iguais**. Não é erro de extração.

**Why:** `resumo_mensal_bico` carrega **um** `valor_lt` por bico (o preço
vigente no fim do mês) e multiplica os litros do mês inteiro por ele. O
`encerrante_diario` carrega o `valor_lt` **daquele dia**. Quando houve reajuste
no meio do mês, o resumo reprecifica retroativamente os dias anteriores. Em
janeiro/2026 houve reajuste (confira com a query abaixo) e o resumo fica **maior**
que o diário.

Quem concorda com o diário é `fechamento_diario.venda_concentrador_total` — ou
seja, **o diário é o que reflete o caixa**; o resumo é o número que o dono lê na
aba mensal da planilha.

**How to apply:** ao dar gabarito de venda em R$, **informe os dois** com o nome
da tabela, nunca escolha calado (regra 4). Litros pode vir de qualquer um dos
dois — batem. Isto é o mesmo problema que a branch `fix/preco-litro-historico`
atacou no app (dia passado avaliado a preço de hoje); se a tela `/planilha`
mostrar o número do resumo, ela herda a reprecificação.

Queries (16/08/2026):

```sql
-- reajuste no meio do mês, por bico
SELECT bico, valor_lt, MIN(dia), MAX(dia), COUNT(*) FROM encerrante_diario
 WHERE ano=? AND mes=? GROUP BY bico, valor_lt ORDER BY bico, MIN(dia);
-- os dois totais lado a lado
SELECT (SELECT SUM(venda) FROM resumo_mensal_bico WHERE ano=? AND mes=?),
       (SELECT SUM(venda_bico) FROM encerrante_diario WHERE ano=? AND mes=?);
```

**Esta divergência reaparece disfarçada de "divergência de lucro" (28/08/2026).**
Comparação golden master × banco de produção para janeiro/2026 acusou um delta
idêntico no lucro bruto e no líquido — sinal de que está na **receita**, não na
despesa nem no custo. Era exatamente este delta: o golden reproduz a planilha
(receita do `resumo_mensal_bico`), a produção soma `Leitura.valor_total` (preço
do dia). Regra de triagem: delta igual no bruto e no líquido ⇒ receita ou custo,
nunca despesa; se os litros batem, é preço, e cai aqui.

Decomposição — o delta é, bico a bico, `litros dos dias a preço antigo ×
(preço de fim de mês − preço antigo)`:

```sql
SELECT bico, valor_lt, SUM(litros), COUNT(*) FROM encerrante_diario
 WHERE ano=? AND mes=? GROUP BY bico, valor_lt ORDER BY bico, valor_lt;
```

**Armadilha de rótulo:** o bico 04 aparece como `Ds:.500,Bico 04` em
`resumo_mensal_bico` e como `DS:.10,Bico 04` em `encerrante_diario` e
`validacao_mensal`. É o mesmo bico. `JOIN` por nome de bico entre essas tabelas
perde a linha do diesel em silêncio — junte por posição/ordem, não por string.
Ver [[tabelas-que-existem-de-fato]].
