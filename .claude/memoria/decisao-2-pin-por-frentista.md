---
name: decisao-2-pin-por-frentista
description: "19/09 — dono decidiu a DECISÃO 2 da #101: PIN por frentista (não token de aparelho); próximo trabalho depois do FSD do pwa-frentista é o PWA pela API Laravel"
metadata:
  type: project
---

Em 19/09/2026 o dono escolheu **PIN por frentista** para a identidade do PWA do frentista, contra a recomendação
do Design Doc, que era token de aparelho (`docs/design/fechamento-frentista-api.md` §4). O motivo que o
doc dá para o PIN é impedir que o "frentista A lance como frentista B".

**Why:** o doc marcava essa decisão como bloqueio da #101. Ainda falta escrevê-la no Design Doc, e o doc segue como rascunho.

**How to apply:** a fatia seguinte ao FSD do pwa-frentista (worktree ../pp-pwa-fsd) é a #101, o PWA pela API
Laravel, e vai pelo workflow ([[sempre-pelo-workflow-refatora-modulo]]). O plano tem de incluir: registrar a
decisão no §4; PIN a cada turno; guard da DECISÃO A ([[login-transicao-aceita-token-atual]]); checar duplicata
antes do unique (fechamento_id, frentista_id), §3; portar a janela de escrita real, que é ~1,5 mês (§5).
