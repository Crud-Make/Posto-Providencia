---
name: login-transicao-aceita-token-atual
description: "18/09 — decisão do dono: durante a transição o Laravel aceita o token do login atual (casando Usuario.auth_user_id); resolve a contradição autenticacao.md × painel-pela-api.md; ainda NÃO escrita nos docs"
metadata: 
  node_type: memory
  type: project
  originSessionId: eccccbbb-b93f-4ae5-9253-8ce30d0cb443
  modified: 2026-09-18T22:04:34.263Z
---

Decisão do dono em 18/09/2026, a partir do plano do fechamento diário (workflow, worktree pp-fechamento,
plano em scratchpad `plano-fechamento-diario.json`): **o Laravel aceita o token do login atual e acha o
usuário por `Usuario.auth_user_id`** (coluna existe, 01-esquema-base.sql:510). Toda rota fica protegida
desde já, inclusive escrita; trocar o login depois vira só trocar quem emite o token.

**Why:** os dois Design Docs aprovados se contradiziam — autenticacao.md:118 (#102 faz toda rota exigir
sessão) × painel-pela-api.md:60-61 (AuthContext só troca no fim): juntos, toda tela migrada levaria 401
entre a #102 e o fim da #103, inclusive o fornecedor (#121).

**How to apply:** registrar no autenticacao.md e no painel-pela-api.md (fatia P1 do plano do fechamento,
pelo workflow) antes de qualquer rota de escrita. Outros bloqueios do fechamento diário ainda abertos:
PR #116 mexe nos mesmos arquivos; decisões de negócio da gravação (estoque descontado a cada resalvamento,
data_hora_envio do PWA perdida no reINSERT, trigger de saldo de fiado); P8 é mudança de fórmula (Fable +
golden novo). Ver [[prazo-domingo-20-09]], [[sempre-pelo-workflow-refatora-modulo]].

**Consequência (19/09):** DECISÃO A = toda rota protegida desde já → rotas NOVAS de leitura (fechamento
P5–P7) também nascem protegidas, então dependem do guard (token atual → auth_user_id) existir antes. Só
as rotas do catálogo #97 seguem públicas (dívida da #102). Em 19/09 eu mesmo orientei um executor a
escrever o contrário no fechamento-diario-api.md ("leituras não esperam a #102") e a revisão pegou —
não repetir: próximo passo do fechamento é o GUARD, não P5.
