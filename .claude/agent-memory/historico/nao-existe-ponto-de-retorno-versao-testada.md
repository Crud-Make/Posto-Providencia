---
name: nao-existe-ponto-de-retorno-versao-testada
description: Não há tag nem branch versao-testada-funcionando-* neste repo (conferido 28/08/2026); as 3 tags existentes são todas de janeiro/2026 e anteriores ao monorepo atual
metadata:
  type: project
---

**Conferido em 28/08/2026** com `git for-each-ref` sobre **todas** as refs
(locais, remotas e tags) e `git ls-remote origin`: **nenhuma** ref casa com
`versao-testada-funcionando-*`. O §9 do CLAUDE.md pede essa tag antes de
refatoração grande, e ela **nunca foi criada nesta base**.

**As 3 tags que existem são todas de janeiro/2026:**
- `v2.5.8` → `3c4fe1c` (01/01/2026)
- `v2.6.0-teste-fechamento` → `67e59b8` (03/01/2026)
- `v3.0.0` → `b58cf0f` (18/01/2026, *"release: v3.0.0 - Refatoração Completa"*)

Todas anteriores ao `packages/utils` canônico de julho — **nenhuma serve de
ponto de retorno** para trabalho em custo/lucro. `v3.0.0` é a mais nova e já
está ~7 meses atrás.

**Refs vivas em 28/08/2026** (o repo é enxuto: o remoto só tem `main`, branch
mergeada é apagada):
`main` = `origin/main` = `834e2d7`; `feat/redesenho-login` (+1);
`docs/memoria-skill-venda-elias` (+3); e um `refs/stash` órfão `8c53dcd`
(*"On refactor/remove-turno-do-sistema: zerado antes dos testes 2026-08-19"*).

**How to apply:** sempre que a pergunta for "tem de onde voltar?", a resposta
neste repo é **não, crie a tag antes** — e a tag tem de sair de `main`, no
commit imediatamente anterior ao trabalho. Reconferir com `for-each-ref` antes
de repetir esta afirmação: ela envelhece assim que alguém criar a primeira.
