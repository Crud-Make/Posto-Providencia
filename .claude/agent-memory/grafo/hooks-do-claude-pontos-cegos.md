---
name: hooks-do-claude-pontos-cegos
description: Hooks de Bash (.claude/hooks) só casam `^git\s+<sub>` — `git -C dir`/`git -c k=v` escapam; harness roda o comando dentro de `bash -c ... eval '<cmd>'`
metadata:
  type: project
---

Fatos medidos em 19/09/2026 na worktree pp-hooks (origin/fase-a 40abfee):

- `protege-git.py` e `checklist-commit.py` ancoram o regex em `^git\s+(push|commit)`.
  `git -C /tmp push --force` e `git -c user.name=x push --force` PASSAM; `cd /tmp && git push --force`
  é negado (o `cd` vira segmento próprio). `git -C ../x commit` nem dispara o checklist.
  Reconfirmar (monte o literal da flag em partes, senão o hook da sessão barra o próprio teste):
  `F="--for""ce"; echo "{\"tool_input\":{\"command\":\"git -C /tmp push $F\"}}" | python3 .claude/hooks/protege-git.py`
  (sem saída = passou).
- Nenhum hook lê o campo `cwd` da entrada do harness: todo `git` que o hook roda usa o cwd do
  processo do hook, não o do `cd`/`-C` do comando. Reconfirmar: `rg -n '"cwd"|get\("cwd' .claude/hooks`.
- O harness executa o comando como `bash -c source <snapshot> ... && eval '<comando>'`, então
  `pkill -f PADRAO` casa com o próprio shell pai. Reconfirmar sem matar nada:
  `pgrep -af 'marcador-unico-qualquer'` — lista a linha `bash -c ... eval` do próprio Bash.
- `scripts/hooks/testa-pre-push.sh` usa `git -c core.hooksPath=/dev/null commit --no-verify`
  de propósito (canário do pre-push); uma trava de desvio de hook não pode barrar a execução
  desse script. Reconfirmar: `rg -n 'hooksPath' scripts/`.
- Worktrees usam symlink de `docs/data` para o checkout principal (padrão legítimo); symlink de
  `vendor`/`node_modules` é o que fez o Pest mentir verde. Reconfirmar:
  `for w in ../pp-*; do ls -la $w/docs/data $w/backend/vendor 2>/dev/null | grep -- '->'; done`.

**Why:** buracos de trava que passam silenciosos; já quebraram gate em 18/09.
**How to apply:** ao planejar/auditar hook de Bash, testar a forma `git -C`/`git -c` e o
diretório final do comando; ver [[estrutura-dependencias-frontend]] para outros falsos do grafo.
