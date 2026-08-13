---
name: despesa-vem-do-banco
description: A despesa do posto mora na tabela Despesa do app, não na planilha — a matriz da planilha é parcial, e o lucro que ela exibe está superestimado em ~25%
metadata: 
  node_type: memory
  type: project
  originSessionId: 551ff16c-0899-450f-9db1-965296af729c
  modified: 2026-08-12T21:40:00.000Z
---

Conferido contra produção em **12/08/2026**:

| fonte | 7 meses de 2026 |
|---|---|
| matriz `Despeza, 2026.` da planilha | R$ 140.456,27 |
| tabela `Despesa` do app | **R$ 195.230,40** (108 lançamentos) |

A planilha **não registra** Embasa, Net, Luz, extintor, conserto de bomba,
Bombeiro AVCB, e lança salários menores. A diferença é de R$ 54.774,13.

Pelo CLAUDE.md §6 — *toda despesa do posto entra no rateio, sem exceção* — quem
manda no custo por litro é a lista do **banco**. Logo o lucro que a planilha
exibe (R$ 220.559,42 / 11,48%) está superestimado: o real é
**R$ 165.785,32 / 8,63%**.

**O nome errado que custou uma sessão inteira.** Entre 31/07 e 12/08 essa lista
se chamava `despesa_trimestral` e o repo a descrevia como "uma segunda aba da
planilha". Nunca foi: não existe apuração trimestral no posto — o dono confirmou
—, e varredura de toda célula das 12 abas não achou nem os totais nem os rótulos.
Eu li o "nunca houve trimestral" do dono como "esse dado é fictício" e removi 11
asserções de um golden master que estava **certo**. A suíte "fechou verde" em
384/0 por remoção de asserção, que é pior que vermelha — vermelha avisa. Revertido
em `7740858`.

**A lição, que vale mais que o número:** *dado sem procedência escrita é dado que
alguém vai apagar por engano.* E: **golden master prova que o cálculo é estável,
não que a entrada é verdadeira** — dado novo que vira referência se confere
contra a fonte, nunca contra o ETL que o produziu.

Hoje a tabela se chama `despesa_lancada` e vem de
`scripts/etl-despesa-banco.py`. Ver [[estado-etl-estagio2]].
