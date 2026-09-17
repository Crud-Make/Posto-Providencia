---
name: doze-dias-nunca-fechados
description: "12 fechamentos estão com status ABERTO desde 26/07/2026 e somem do lucro; fechá-los é operação do dono pelo painel, não conserto de código"
metadata: 
  node_type: memory
  type: project
  originSessionId: e14ef858-7750-49c5-99d4-ecbc9f8e8f49
  modified: 2026-08-14T11:28:39.191Z
---

> **OBSOLETO desde 14/08/2026:** esses 12 fechamentos **não existem mais em
> produção** — o banco transacional foi zerado por decisão do dono (ver
> [[banco-zerado-replay-em-curso]]; os dados vivem no backup). O que segue vale
> como história e porque **o mecanismo do PWA descrito abaixo continua no
> código**: dia lançado pelo celular e nunca fechado no painel fica zerado.

**Medido no catálogo em 13/08/2026.** Dos 213 fechamentos: os **201 `FECHADO` têm
`total_vendas` preenchido**; os **12 `ABERTO` têm `total_vendas = 0`**. Zero
contraexemplos dos dois lados. Dias afetados: 26/07 e 02, 03, 04, 05, 06, 07, 08,
09, 11, 12, 13 de agosto.

## Por que acontece

O PWA (`frontend/apps/pwa-frentista/src/services/api.ts`, `getOrCreateFechamento`) cria o
`Fechamento` pai **zerado** (`total_vendas`, `total_recebido`, `diferenca` = 0,
status `'ABERTO'`) e insere só o filho — nunca atualiza o pai. Quem grava os
totais é o **passo 5 de `useSubmissaoFechamento.ts`**, que só roda ao salvar pelo
painel. Nenhum trigger do banco faz isso: os únicos em
`Fechamento`/`FechamentoFrentista`/`Leitura` são de auditoria.

Ou seja: **dia lançado pelo celular e nunca fechado no web fica zerado para
sempre.** Não é bug de cálculo.

## A consequência que importa

Enquanto ficarem abertos, esses dias **somem dos relatórios de lucro** —
`vw_lucro_periodo` e o `getResumo` de `fechamento.service.ts` filtram
`total_vendas > 0`. É por isso que a view devolve **201 linhas e não 213**.
Há **R$ 56.609,70** de conferido lançado por frentista nesses dias.

## O que já foi feito, e o que não

Feito em 13/08 (branch `fix/fechamento-total-vendas-zerado`): o
`useRelatorioDiario` passou a ler o `status` real em vez de inferir por
"existe fechamento?", então o dia aparece como **PENDENTE** com a venda vinda das
leituras, em vez de **FECHADO com R$ 0,00**. Conferido na tela.

**Não feito, e é decisão do dono:** fechar os 12 dias. É operação pelo painel, dia
a dia — **não faça por SQL**, porque o fechamento pelo painel também grava os
filhos e os recebimentos, e um UPDATE direto produziria um pai consolidado sobre
um dia que ninguém conferiu. Ver [[rls-fase1-em-andamento]] para o estado das
travas do banco.

**Também não feito:** nada avisa que existem dias em aberto. Um dia parado há 18
dias não gera alerta nenhum — só aparece para quem abrir aquele dia específico no
relatório diário.
