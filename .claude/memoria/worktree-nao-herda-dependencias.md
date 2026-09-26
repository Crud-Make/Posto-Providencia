---
name: worktree-nao-herda-dependencias
description: Worktree novo não herda node_modules (são 7), backend/vendor, docs/data nem o .env — e a falta de vendor trava o push inteiro
metadata:
  type: project
---

Medido em 18/09/2026 montando o worktree `pp-gate-ccn`. A memória antiga
[[saneamento-em-tres-worktrees]] já avisava sobre `node_modules`/`docs/data`; faltavam peças.

**São SETE `node_modules`**, não um: `frontend/` mais os 3 apps (`web`, `pwa-frentista`,
`pwa-dono`) e os 3 packages (`utils`, `api-core`, `types`). Ligar só o da raiz faz o
`type-check` acusar erro falso nos PWAs (`Cannot find module 'workbox-precaching'`) — parece
regressão e não é.

**`backend/vendor` também não vem** — e a consequência é maior do que parece: sem ele
`composer gates` reprova e **o `pre-push` barra o push inteiro**, inclusive de mudança que só
toca frontend. A mensagem não diz qual gate caiu. Resolve com `composer install` no worktree.

**`docs/data` escapa do `.gitignore` quando é symlink:** o padrão é `docs/data/` **com barra
final**, que não casa com link. Aparece como `??` no `git status` — num repo PÚBLICO. Bloquear
no `.git/info/exclude`.

**`bun install` no worktree com `node_modules` symlinkado grava no repo de origem** e pode podar
pacote que a árvore principal usa. Antes de instalar qualquer coisa, trocar os symlinks por
`node_modules` de verdade (`bun install` leva ~0,5s com cache; 1363 pacotes).

**`backend/vendor` NUNCA em symlink (18/09, PR #115):** o autoload do Composer resolve
`$baseDir` pelo caminho real do vendor (`vendor/composer/autoload_psr4.php`), então vendor
linkado carrega `App\` e `Tests\` da árvore de ORIGEM. Sintoma: `getJson()` indefinido no
Pest (o `extend(TestCase)->in('Feature')` casa com a pasta da outra árvore). Pior: quando passa,
passa testando o código errado. Correção: `unlink backend/vendor && composer install`.
CONFIRMADO POR CANÁRIO (18/09): o pre-push INSTALADO (`.git/hooks/pre-push` = `scripts/hooks/pre-push`)
não tem worktree nenhum — roda `composer gates` no working tree (`pre-push:15,53-56`) e descarta o sha
do stdin. Commit com teste vermelho + árvore verde = "push liberado". A versão com `ligar_dependencias`
(branch `fix/pre-push-testa-o-que-sobe`, NÃO mergeada nem instalada) ainda erra: sha == HEAD testa a
árvore (`fix:130-132`) e fora do HEAD liga vendor por symlink (`fix:108-109`), o que bloqueia todo
push (36 erros de Pest) e esconde defeito em App\. Correção: sempre worktree do commit + `composer
install` nela; guardar os dois canários como teste do hook.
RESOLVIDO: a correção é a do PR #113 (branch docs/#60-design-docs-fase-a, fa16841, canários em
scripts/hooks/testa-pre-push.sh), feita por outra sessão; INSTALADA à mão em .git/hooks em 18/09
(antigo salvo no scratchpad da sessão). NÃO reescrever o hook por cima; extras (limpar GIT_DIR/
GIT_INDEX_FILE herdados, worktree em ~/.cache p/ hardlink do bun) entram como commit POR CIMA de
fa16841 — rascunho deles está sem commit na worktree pp-gate-ccn. `node_modules` com `@posto/*` tem o mesmo risco.

**How to apply:** ao criar worktree aqui, ligar os 7 `node_modules` e o `docs/data`, rodar
`composer install` para ter vendor PRÓPRIO, e copiar o `backend/.env` — é exatamente o que a função `ligar_dependencias` do
`scripts/hooks/pre-push` passou a fazer para o worktree temporário dele.
