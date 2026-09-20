---
name: upsert-com-delete-do-conjunto-declarado
description: 20/09 — dono decidiu a §7 (c): FechamentoFrentista vira UPSERT + DELETE só do que a tela declarou conhecer e não mandou; conserta o envio tardio sem tirar a correção do gerente
metadata:
  type: project
---

**Decisão do dono em 20/09/2026**, fechando o item (c) do §7 de
`docs/design/fechamento-diario-api.md`. Com ela, **só a (f) resta** — e a (f) é transcrição.

## O que era

`DELETE ... WHERE fechamento_id` seguido de `INSERT` em lote
(`useSubmissaoFechamento.ts:116,199`), e o INSERT vem do **estado da tela** capturado no clique.
Esse estado foi montado em `useSessoesFrentistas.ts:137-240` e **só mescla com o banco no
carregamento** — não há releitura no momento de salvar.

Três perdas medidas: envio que chega pelo PWA depois de a tela carregar é **apagado e não
volta**; o `data_hora_envio` original do PWA é perdido (volta ao `DEFAULT now()`); e
`NotaFrentista`/`VendaProduto` desvinculados **não voltam**.

## O que passa a ser

> **UPSERT por `(fechamento_id, frentista_id)`** — o unique existe e está aplicado
> (`01-esquema-base.sql:761`) — **mais DELETE só dos `frentista_id` que o cliente declarou
> conhecer e não mandou de volta.**

O contrato leva duas coisas: `sessoes[]` e `frentistas_conhecidos[]`.

```
tela carrega        → declara conhecer A e B
frentista C envia pelo PWA no meio
gerente remove B e salva

UPSERT  A   (veio na lista)
DELETE  B   (declarado conhecido, não voltou = remoção deliberada)
INTACTO C   (a tela nunca viu; não é dela para apagar)
```

**Por que não `UPSERT` puro:** tiraria do gerente a única forma que ele tem de apagar envio
errado — hoje ele remove da tela e salva. Quebrar um fluxo que funciona para consertar outro
não é conserto.

## O que isso conserta de graça

- envio tardio do PWA deixa de ser destruído (o defeito de
  [[dois-bugs-do-salvar-do-painel]]);
- `data_hora_envio` sobrevive ao UPDATE, porque a linha não é recriada;
- a dança de desvincular `Notificacao`/`NotaFrentista`/`VendaProduto` passa a valer **só** para
  as linhas realmente apagadas, não para todas.

**É mudança de comportamento gravado**, então entra com teste que prove cada um dos três casos
(atualiza, apaga o declarado, preserva o não declarado) — e é trabalho do Fable, pelo hook.

Ver [[estoque-desconta-e-nao-devolve-por-evento]] e [[total-vendas-vale-o-encerrante]].
