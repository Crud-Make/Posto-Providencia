---
name: nao-existe-ponto-de-retorno-versao-testada
description: A única tag versao-testada-funcionando-* é `versao-testada-funcionando-custo-lucro` → 834e2d7 (26/08/2026), leve e SÓ LOCAL (não está no origin, conferido 17/09/2026); as 3 tags de janeiro/2026 não servem de retorno
metadata:
  type: project
---

**Atualizado em 19/09/2026:** agora são **duas**. Nova:
`versao-testada-funcionando-pre-raiz` → tag **anotada** (objeto `464c100`, tagger
17/09/2026) sobre `6662b24` (06/09/2026, merge do PR #92), mensagem *"Ponto de
retorno antes da reorganização da raiz (#95): main de 06/09/2026, v4.0.0 + PR #92"*.
É ancestral da `fase-a`. Presença no origin **não conferida** em 19/09.
Nenhuma das duas cobre a fase-a pós-travas (#119, 18/09) — refatoração nova sobre a
fase-a ainda pede tag própria.

**Corrigido em 17/09/2026.** A versão anterior desta nota (28/08/2026) dizia que
nenhuma ref `versao-testada-funcionando-*` existia. Envelheceu: hoje existe **uma**.

- `versao-testada-funcionando-custo-lucro` → `834e2d7` (26/08/2026, *"Merge pull
  request #59 from Crud-Make/fix/logo-ao-lado-do-hamburguer"*). Tag **leve**
  (`cat-file -t` = `commit`), portanto sem data de criação própria nem autor.
- Foi criada depois de 28/08: o plano `.claude/docs/saneamento-pre-release.md:19`
  (commit `9f6f85e`, 28/08) manda criá-la exatamente nesse commit e afirma na
  linha 23 que ainda não existia.
- **Só local.** `gh api repos/Crud-Make/Posto-Providencia/tags` em 17/09 devolve
  apenas `v2.5.8`, `v2.6.0-teste-fechamento`, `v3.0.0`, `v4.0.0`. Clone novo não
  a recebe; `git push origin versao-testada-funcionando-custo-lucro` é decisão do dono.
- `834e2d7` é ancestral de `main` (142 commits atrás em 17/09). Serve de retorno
  para o **saneamento de custo/lucro** (PRs #63–#89), não para o que veio antes.

**As tags de release** (todas anotadas, no remoto):
`v2.5.8`→`3c4fe1c` (01/01/2026) · `v2.6.0-teste-fechamento`→`67e59b8` (03/01/2026) ·
`v3.0.0`→`b58cf0f` (18/01/2026) · `v4.0.0`→`ea6b3a5` (06/09/2026, *"fecha a fase de
auditoria e saneamento"*). As três de janeiro são anteriores ao `frontend/packages/utils`
canônico e não servem de ponto de retorno; `v4.0.0` é o marco mais novo e, para
uma refatoração grande a partir da `main` atual, é o candidato natural a
"versão testada" — mas o §9 pede tag com esse nome, e ela ainda não existe para
o estado de 06/09.

**How to apply:** quando a pergunta for "tem de onde voltar?", a resposta é
"para custo/lucro, `834e2d7`; para o estado de release, `v4.0.0`; para
refatoração nova, **crie a tag antes**, a partir de `main`". Reconferir com
`git for-each-ref` e com a API do GitHub — tag leve local some com a máquina.
