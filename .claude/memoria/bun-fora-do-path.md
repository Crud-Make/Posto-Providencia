---
name: bun-fora-do-path
description: O bun ficava invisível porque o instalador o pôs no ~/.bash_profile (só shell de login) — movido para o ~/.bashrc em 12/08/2026 e resolvido
metadata: 
  node_type: memory
  type: project
  originSessionId: 8ecce0fb-1e7a-4613-8a11-b02349ed0b1b
  modified: 2026-08-13T01:00:31.786Z
---

**Resolvido em 12/08/2026.** Fica registrado porque reinstalar o bun traz o
problema de volta, e o sintoma não parece PATH.

**O que acontecia:** o instalador oficial do bun escreveu `BUN_INSTALL` e o
`export PATH` no `~/.bash_profile`, que só roda em **shell de login**. Terminal
comum e processos filhos (Claude Code) são não-login: liam só o `~/.bashrc` e
ficavam sem `bun`. Resultado — todo comando da "Referência rápida" do
`CLAUDE.md` (`bun run test`, `test:golden`, `type-check`, `install`) morria com
`bun: comando não encontrado`, **que parece projeto quebrado, não PATH faltando**.

**A correção:** o bloco do bun foi movido para o `~/.bashrc`, junto da seção
PATH, e **removido** do `~/.bash_profile`. Não pode ficar nos dois: o
`.bash_profile` faz `source` do `.bashrc` na linha 5, então duplicaria a entrada
no PATH em shell de login. Backups: `~/.bashrc.bak-12ago` e
`~/.bash_profile.bak-12ago`.

**Se reinstalar o bun:** o instalador reescreve o bloco no `~/.bash_profile`.
Apague-o de lá — há um comentário no arquivo avisando disso.

**Detalhe que engana na hora de diagnosticar:** o `~/.bashrc` tem
`[[ $- != *i* ]] && return` na linha 6, antes da seção PATH. Isso *sugere* que
shell não-interativo nunca veria o bun — mas vê, porque o PATH é **herdado** do
shell interativo que lançou o processo, não reexecutado. Foi assim que fnm e
`~/.local/bin` sempre funcionaram nas minhas chamadas.

**Numa sessão já aberta a mudança não vale** — o PATH foi herdado no lançamento.
Só sessão nova pega; até lá, prefixar
`export PATH="$HOME/.bun/bin:$PATH"`.

Estado do que esses comandos testam em [[estado-etl-estagio2]].
