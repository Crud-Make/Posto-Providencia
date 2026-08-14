---
name: leituras-suspeitas-26-27-julho
description: RESOLVIDO em 12/08/2026 — o 27/07 é dado de teste com prova na AuditoriaDados; o 26/07 é real porém parcial. Expurgo pendente de decisão do dono
metadata:
  node_type: memory
  type: project
---

Achado em 07/08/2026, **investigado e concluído em 12/08/2026** pelo agente
`planilha`. Deixou de ser indício: **há prova documental.**

## 27/07 — dado de teste. Expurgar. Confiança alta

A **`AuditoriaDados` gravou a tentativa-e-erro**: o mesmo lote de 6 leituras foi
inserido, apagado e reinserido **três vezes em 11 minutos**, tudo em 31/07/2026
(11:56 → 11:57 → 12:07 UTC). Os valores apagados são idênticos aos atuais. Isso não
é operação de posto; é alguém exercitando o app contra produção.

Reforços independentes:

- A planilha **não tem uma célula** nos blocos dos dias 26 e 27 (linhas 703–758 da
  aba `MES, 07`), além do rótulo `"Caixa Dia 26/27 Posto Jorro."`. E a aba de resumo
  **fecha exata** com a soma dos dias 1–24 (`delta = 0.0`). A planilha decide (§0.4).
- `300 / 150 / 200 / 400 / 100 / 50`: é o **único dia do banco inteiro** (1.254
  leituras) em que os 6 bicos são simultaneamente inteiros e múltiplos de 50.
- `Fechamento` id 461 tem `total_vendas = total_recebido = 7.436,00` e
  `diferenca = 0,00` — dia real não faz isso (22/07 tem 110,72; 21/07 tem 45,10).
- Backdating: leitura de 27/07 criada em 31/07.

**Não serve como evidência** (e um deles é a armadilha do UTC): os frentistas
existem e estão ativos; 11:56–12:07 UTC = **08:56–09:07 local**, horário comercial
normal — converter para trás daria 26/07, que é justamente [[timestamps-leitura-em-utc]].

## 26/07 — real, porém parcial. Manter

Litros fracionários de bomba (83,939 / 23,791 / 6,860), encerrante que encadeia dos
dois lados, `Fechamento` id 460 deixado `ABERTO` com `total_vendas = 0`. Leitura das
12:51 local de um domingo: é o giro da manhã, e o resto do dia nunca foi lançado.
Apagar abriria buraco na cadeia de encerrante entre 24/07 e 02/08.

Duas ressalvas abertas: o preço gravado (6,48/6,38) diverge do da planilha
(6,98/7,38), então o litro é confiável mas o R$ não; e o `FechamentoFrentista`
id 2033 (Elyon, R$ 200,00 em múltiplos de 50) parece envio de teste do PWA — esse
é candidato a expurgo **separado**.

## O que muda se expurgar o 27

**Nada no pipeline auditável** — ETL, goldens e `lucro.ts` leem a planilha, que não
tem esses dias. Só o painel/app, que lê produção:

| Agregado de julho | Com o 27 | Sem o 27 |
|---|---|---|
| Litros (`Leitura`) | 32.353,512 L | 31.153,512 L |
| Receita (`Fechamento`) | R$ 215.333,80 | R$ 207.897,80 |
| Custo operacional/litro | R$ 0,574459 | R$ 0,596586 |

O 27 entra na `vw_lucro_periodo` com `lucro_bruto = 0`, **injetando receita com zero
de lucro e diluindo a margem**. E a reconciliação fecha: `32.353,512 − 1.200,000 −
114,590 = 31.038,922 L`, exatamente o litro da planilha. **Os dias 26 e 27 são a
totalidade da divergência entre banco e planilha em julho.**

## Expurgo — NÃO executado, pendente de decisão do dono

```sql
DELETE FROM "FechamentoFrentista" WHERE fechamento_id = 461;   -- ids 2046..2051
DELETE FROM "Fechamento"          WHERE id = 461;              -- 27/07, R$ 7.436,00
DELETE FROM "Leitura"             WHERE id BETWEEN 897 AND 902;
```

Exige janela de escrita aberta — ver [[travas-mcp-destravadas]]. `Fechamento` 461 e
as `Leitura` são registros distintos: apagar só um lado deixa o painel inconsistente.
`carga-historico-leitura.py` rodado de novo **não desfaz** o expurgo.
