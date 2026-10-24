---
name: sempre-pelo-workflow-refatora-modulo
description: "SUPERADA em 24/09 — o dono cansou da demora: NÃO rodar o workflow refatora-modulo por padrão; fazer direto, com testes, canário e gates. (18/09 exigia 100% pelo workflow)"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: eccccbbb-b93f-4ae5-9253-8ce30d0cb443
  modified: 2026-09-18T13:45:38.015Z
---

"Tem que usar 100% do workflow" (dono, 18/09/2026), dito quando eu disparei um agente `grafo` avulso para
mapear o fechamento diário e já tinha feito a fatia 1 da #100 com um agente Fable avulso.

**Why:** o workflow `.claude/workflows/refatora-modulo.js` é o que garante mapeamento verificado por
cético, plano pelo Fable, gates rodados por agente independente (Opus, que não edita) e revisão
adversarial do diff. Agente avulso pula essas etapas.

**How to apply:** toda fatia de refatoração ou migração (#100, #103, próximas) roda
`Workflow({name:'refatora-modulo', args:{modulo, escopo}})` em modo plano, o dono aprova, e depois modo
`executar` com o plano. Agente avulso só para pergunta pontual de leitura, nunca para editar. Ver
[[regra-de-arquitetura-nao-ganha-excecao]], [[so-fable-mexe-em-formula]].

**Modo curto (aprovado pelo dono 19/09, "sem perder o controle das regras"):** `args.curto: true` → plano com 1
mapeador sem cético (planejador confere a evidência); executar com 1 revisor adversarial (aponta doc/CHANGELOG
desatualizado) no lugar de revisão + doc-cycle. Gates, canário, hooks e regras idênticos. Proibido para
dinheiro/fórmula/golden, gravação no banco e arquitetura nova (guard) — o script recusa plano com tocaDinheiro.
Motivo: workflow completo leva 1–2 h por PR e o prazo é domingo 20/09.

## ⚠️ SUPERADA em 24/09/2026

O dono interrompeu o disparo do workflow para o login no Laravel: "nada, toda hora esse módulo,
essas coisas demoram". **A partir de agora: fazer direto na thread** (ou com um subagente pontual),
sem o ciclo plano → ok → executar do `refatora-modulo`. Continuam valendo: testes antes de dar por
pronto, canário em trava nova, gates (lint, type-check, `composer gates`, golden quando toca
dinheiro), CHANGELOG e nenhum push/merge sem ok. Workflow só se ELE pedir.
