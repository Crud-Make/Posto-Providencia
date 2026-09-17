---
name: portas-de-leitura-do-catalogo
description: As três portas de leitura do catálogo vivo (MCP, CLI, OpenAPI do PostgREST) e o motivo exato de cada uma falhar sem token — testar a primeira antes de planejar a auditoria
metadata:
  type: reference
---

Conferido em **17/09/2026**: numa sessão sem `SUPABASE_ACCESS_TOKEN` no ambiente,
**nenhuma** porta de leitura do catálogo vivo funciona, e cada uma falha de um jeito:

| Porta | Erro | Por quê |
|---|---|---|
| MCP `execute_sql` / `list_tables` / `list_migrations` / `generate_typescript_types` | `Unauthorized. Please provide a valid access token ... --access-token ... SUPABASE_ACCESS_TOKEN` | o servidor MCP lê o token do ambiente do processo; o `.mcp.json` não o carrega |
| CLI `supabase projects list` (2.116.0, projeto linkado `kilndogpsffkgkealkaq`) | `LegacyProjectsListUnexpectedStatusError ... Unauthorized` | mesmo token; o `link` guarda só o ref, não credencial |
| `GET /rest/v1/` (OpenAPI do PostgREST) com a `anon key` do `.env` | `401 Invalid API key — Only the service_role API key can be used for this endpoint` | o endpoint de introspecção é fechado ao `anon` neste projeto; `service_role` é proibida para mim (§5) |

**Why:** gastei sete chamadas paralelas ao MCP antes de descobrir que o token não
estava na sessão, e mais duas tentando a REST. A resposta correta era uma chamada
de sonda e, falhando, declarar o catálogo vivo como "Não conferido" e auditar só o
repo. O `--read-only` do `.mcp.json` **não** é a causa — ele restringe o papel do
`execute_sql`, não a autenticação.

**How to apply:** primeiro comando de toda auditoria é uma sonda barata
(`list_migrations`). Se devolver `Unauthorized`, não tente a CLI nem a REST — as
três dependem da mesma credencial ausente ou de uma proibida. Reporte a ausência
no "Não conferido" com o texto do erro e siga com o que o repo prova sozinho:
`generated.ts` (datado por `git log -1 --format=%ad -- apps/web/src/types/database/generated.ts`)
e as notas datadas em `.claude/memoria/` (13/08: 44 tabelas, última migration
`20260802225627`).

Reconfirmar: `mcp__supabase__list_migrations` (uma chamada) e
`timeout 30 supabase projects list`.

Ver [[quem-tipa-o-cliente-supabase]] e [[nucleo-do-banco-nunca-veio-de-migration]].
