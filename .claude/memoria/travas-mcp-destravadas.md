---
name: travas-mcp-destravadas
description: PENDENTE — .mcp.json e settings.json estão destravados em 12/08/2026 para aplicar a Fase 1 do RLS; os dois são versionados e precisam voltar
metadata:
  node_type: memory
  type: project
---

**Estado em 12/08/2026, e é pendência aberta.** Se esta memória ainda existir sem a
nota de "reposto", **confira os dois arquivos antes de qualquer commit**.

> **13/08/2026 — foi commitado ASSIM, destravado, por decisão explícita do dono.**
> Eu levantei que isso deixa uma janela de escrita permanente contra produção no
> repositório versionado; ele reafirmou, e a decisão é dele. Registrado no
> `CHANGELOG.md` da Fase 1 para o estado ficar visível em vez de silencioso.
> **A pendência continua aberta** — repor segue sendo o passo certo assim que a
> última migration da vez tiver sido aplicada. Quem pegar isto depois: os dois
> flags estão listados logo abaixo.

A pedido do dono, as duas travas do §14 do CLAUDE.md foram removidas para aplicar a
Fase 1 do RLS ([[rls-fase1-em-andamento]]) via `apply_migration` do MCP:

- **`.mcp.json`** — o argumento `--read-only` foi retirado.
- **`.claude/settings.json`** — `mcp__supabase__apply_migration` saiu da lista `deny`.
  Os outros seis (`deploy_edge_function`, os cinco `*_branch`) **ficaram**.

**Os dois arquivos são versionados.** Commitar neste estado deixa uma janela de
escrita permanente contra produção, que é exatamente o acidente que o §14 descreve
("o passo de devolver é o que se esquece"). Repor é:

```
.mcp.json          → devolver "--read-only" antes de "--project-ref=..."
settings.json      → devolver "mcp__supabase__apply_migration" no topo da deny
```

**Fato medido nesta sessão, que contradiz o §14.** O CLAUDE.md afirma, "medido em
07/08", que o `--read-only` *não remove nenhuma ferramenta* — as mesmas 20 com e sem.
Nesta sessão só **13** ferramentas do Supabase existiam, todas de leitura; as 7 da
`deny` não apareciam. Como as duas travas produzem o mesmo sintoma, **não deu para
saber qual estava segurando** sem reconectar o MCP. Editar os arquivos **não pega em
sessão viva**: `deny` e argumentos são lidos quando o servidor MCP conecta.

Para testar: `/mcp` → reconectar `supabase`, e ver se `apply_migration` aparece.
Se aparecer com a `deny` limpa e o `--read-only` de volta, o §14 está certo e a
frase pode ficar. Se não aparecer, **o §14 está errado e precisa ser corrigido**.

**Adendo 06/09/2026 — REPOSTAS, decisão do dono.** `--read-only` de volta no `.mcp.json` e
`mcp__supabase__apply_migration` na `deny` de `.claude/settings.json` (branch
`chore/travas-mcp-de-volta`). O que justificava deixar aberto — aplicar migration e carga sem
colar SQL no chat — hoje é `bun scripts/aplica-migration.ts <arquivo>` (API de management, token do
`settings.local.json`), que só aceita arquivo de `supabase/migrations/`. Leitura pelo MCP
(`execute_sql` de SELECT) continua funcionando. Se uma sessão precisar escrever pelo MCP de novo, o
caminho é tirar o flag, fazer, e **repor no mesmo turno** — e não commitar sem ele (o hook
`higiene` avisa na abertura da sessão).
