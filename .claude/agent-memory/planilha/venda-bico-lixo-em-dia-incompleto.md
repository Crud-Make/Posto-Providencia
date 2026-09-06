---
name: venda-bico-lixo-em-dia-incompleto
description: encerrante_diario.venda_bico e fechamento_diario.venda_concentrador_total carregam valor absurdo (negativo, milhões) nas linhas dado_incompleto=1 — litros foi anulado, venda não; e o custo operacional da planilha NÃO é 0,45 fixo
metadata:
  type: project
---

Conferido em 04/09/2026 no sqlite do staging de 30/08
(`docs/data-staging/2026-08-30/posto_jorro_2026.sqlite/posto_jorro_2026.sqlite`).

**1. `venda_bico` não respeita `dado_incompleto`.** O bug 2 da skill de ETL
(`Fechamento − Inicial` com um lado vazio) foi corrigido para `litros` (fica
NULL) mas **não** para `venda_bico`: a coluna guarda `(0 − inicial) × valor_lt`,
um negativo na casa dos milhões, e `fechamento_diario.venda_concentrador_total`
soma isso. Qualquer `SUM(venda_bico)` ou `SUM(venda_concentrador_total)` em mês
com furo (fev 09–15, ago 30) vem destruído.

**How to apply:** faturamento pelo diário é sempre com
`AND dado_incompleto = 0`. Litros não precisa do filtro (já é NULL), mas pôr
não custa. É achado de ETL para reportar, não para "consertar" no sqlite.

```sql
SELECT SUM(venda_bico) FROM encerrante_diario
 WHERE ano=? AND mes=? AND dado_incompleto=0;
-- prova do lixo:
SELECT mes,dia,bico,inicial,fechamento,litros,venda_bico
  FROM encerrante_diario WHERE dado_incompleto=1 LIMIT 5;
```

**2. A planilha não usa R$ 0,45/L fixo.** `compra_mensal.valor_venda −
compra_mensal.media_lt` é igual, mês a mês e ao 5º decimal, a
`despesa_mensal.valor ÷ SUM(resumo_mensal_bico.litros)` do mesmo mês. Ou seja,
o rateio da planilha é despesa real ÷ litros do próprio mês (é o `I19` da aba
`POSTO JORRO 2026`, ver [[divergencia-venda-resumo-vs-diario]]). Se alguém
perguntar "delta contra o 0,45 de 2018", o 0,45 não está no dado extraído —
pode estar no código do app, não na planilha. Responder o delta pedido, mas
avisar que a premissa não bate com o sqlite.

```sql
SELECT mes, produto, ROUND(valor_venda - media_lt, 5) FROM compra_mensal;
SELECT d.mes, ROUND(d.valor / (SELECT SUM(litros) FROM resumo_mensal_bico r
  WHERE r.mes = d.mes), 5) FROM despesa_mensal d WHERE d.mes <= 8;
```

**3. Mês parcial na planilha de 30/08:** `manifesto.json` traz
`referencia_ate_dia` quando o resumo mensal foi lido antes do fim do mês
(`status: confere_parcial`). Nesse caso `resumo_mensal_bico` e
`encerrante_diario` divergem em litros por motivo legítimo — o diário vai mais
longe. Checar o manifesto antes de chamar de divergência.
