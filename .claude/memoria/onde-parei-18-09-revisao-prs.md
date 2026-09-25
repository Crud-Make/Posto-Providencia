---
name: onde-parei-18-09-revisao-prs
description: "COMECE AQUI 18/09 manhã — revisão dos 7 PRs (#113–#119) feita por workflow, ordem de merge decidida, hook do Fable criado e NÃO commitado; próximos passos"
metadata: 
  node_type: memory
  type: project
  originSessionId: 7e065856-6167-4f63-a45d-192505fb0cad
  modified: 2026-09-18T11:38:32.007Z
---

**Revisão dos PRs #113–#119 (workflow, 18/09):** 12 achados graves confirmados pelo cético, quase todos
rebaixados a média (integração/ordem, não defeito isolado). Nenhum PR muda dinheiro; golden 3296 ✓ em todos.
- #117 strict e #118 neverthrow: **prontos**. #118: 6 mutações em emCentavos/custoMedioCompra/diferenca pegas.
- #113: pre-push testa a ÁRVORE, não o commit → trazer `fix/pre-push-testa-o-que-sobe` (branch só local, sem PR) antes do merge.
- #114: diagrama checa `Usuario.ativo` antes da policy, mas `PostoPolicy::ver/gerir` devolve true p/ ADMIN antes de ver `ativo` (ADMIN inativo passa) — corrigir diagrama e virar tarefa da #102.
- #116: App.tsx do pwa-frentista foi a 914 linhas (max-lines 900 do #113); ProgressIndicator.tsx novo leva `label ||` que a catraca conta como erro novo (usar `label !== undefined && label !== '' ? label : …`, `??` muda comportamento); tirar os 4 arquivos + ValidationAlert do override complexity 35.
- #119: regex FSD não pega alias `@/widgets/x/ui/y`; pre-commit lê árvore, não o índice; `eslint-disable` passa tudo.
- #115: PROC-2 é SEM TRAVA (não parcial); doc tem 38 regras, PR diz 41; atualizar depois do #119. Mesclar por último.

**Ordem de merge:** #113 (com fix do pre-push) → #114 (reapontar base p/ fase-a) → #117 → #118 → #119
(reapontando base a cada um; conflito #119×#113 em instala-hooks.sh: manter `git rev-parse --git-common-dir`)
→ #116 com os 3 ajustes → #115 reescrito. NUNCA apagar branch-base com PR apontando para ela.

**Hook do Fable** ([[so-fable-mexe-em-formula]]): arquivos `.claude/hooks/so-fable-na-formula.py`,
`.claude/hooks/testa-hooks.py`, `.claude/settings.json`, `.claude/skills/fechamento-posto-providencia/SKILL.md`
estão alterados SEM COMMIT no checkout principal — que está na branch `refactor/cadastro-sem-ciclo`, de
OUTRA sessão (mexe no módulo Cadastro, PostoPolicy saiu de Domain/Policies). Commitar o hook numa branch
própria (ex. `chore/so-fable-na-formula` a partir da fase-a), sem misturar com o trabalho daquela sessão.

**Mapa da migração (18/09):** base 100 %, esquema 45/45, models 12/45, 9 GET de catálogo; front chama o
Laravel 0 vezes (276 chamadas supabase em 51 arquivos); Edge Functions 0/2, RPCs 0/3, auth não instalado.
Issues 4/12 (33 %), uso real 0 %, estimativa ~20 %.

**FEITO 18/09 ~09h (passos 1–2):** #113 ← fa16841 (pre-push sempre em worktree do sha, bun/composer
install dentro, 3 canários em scripts/hooks/testa-pre-push.sh passaram; achado: golden NÃO pega emCentavos
sem quantizar, só o vitest). #114 ← e809845 (diagrama: ativo dentro da policy; ADMIN inativo = tarefa #102).
Worktrees ../pp-60 e ../pp-102 com deps instaladas. A sessão paralela (pp-gate-ccn) reescrevia o mesmo hook;
foi avisada: extras dela (GIT_DIR, ~/.cache) entram como commit por cima. MERGEADOS em fase-a 18/09: #113 (3d68cc0), #114 (a37b286), #117 (5d6002c) — merge commit, branches
mantidas; fase-a exige branch atualizada (gh pr update-branch). #118 (c13e88e) e #119 (fac0be5) também mergeados. #119 ganhou 7eea08c: regex FSD com @/?, catraca com
--no-inline-config (13 violações escondidas por eslint-disable congeladas com --aceitar-divida, justificado no PR),
pre-commit julga o ÍNDICE (checkout-index + bun/composer install em ~/.cache/posto-pre-commit), canários em
scripts/hooks/testa-pre-commit.sh (4). Próximo: #116 com os 3 ajustes → #115 reescrito.
O pre-push INSTALADO em .git/hooks ainda é o velho até o #113 mergear + instala-hooks.

**Próximo passo proposto (antigo, já cumprido):** passos 1–2 da ordem de merge (fix do pre-push no #113,
diagrama do #114). Nenhum push/merge sem ok. `CLAUDE.md` do checkout segue alterado e truncado ("retornam
`Result`") — dono ainda não respondeu se foi intencional.
