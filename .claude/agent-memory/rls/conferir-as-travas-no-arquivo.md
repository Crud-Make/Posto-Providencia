---
name: conferir-as-travas-no-arquivo
description: Ler `.mcp.json` e o deny de `.claude/settings.json` do disco antes de afirmar que existe trava técnica — a descrição das travas já divergiu do estado real
metadata:
  type: feedback
---

Antes de escrever qualquer frase sobre o que impede escrita em produção, **ler os dois arquivos
do disco**: `.mcp.json` (existe `--read-only` nos `args`?) e `.claude/settings.json`
(`permissions.deny`). Confirmar em banda com `SELECT current_setting('transaction_read_only'),
current_user;` — é `SELECT`, é seguro, e responde sem ambiguidade.

**Why:** em 16/08/2026 as duas descrições estavam desatualizadas ao mesmo tempo. O `.mcp.json`
estava **sem** `--read-only` (a sessão rodava como `postgres`, `transaction_read_only = off`),
e o `deny` de `.claude/settings.json` listava seis entradas — `deploy_edge_function` e os cinco
`*_branch` — **sem `apply_migration`**, justamente a que a documentação apresentava como a razão
de a lista existir. Somadas, as duas divergências significavam zero trava técnica de DDL contra
produção. Repetir "há duas guardas" naquele momento seria dar por segura uma sessão que não era.

**How to apply:**
- A garantia que sobra sempre é a do próprio agente: o frontmatter `tools:` só entrega
  `list_tables`, `execute_sql` e `get_advisors`. Isso não depende de arquivo nenhum.
- Divergência achada entra na resposta como item próprio, com o conteúdo real do arquivo — não
  como nota de rodapé, e nunca "corrigida" pelo agente: mexer em `settings.json`/`.mcp.json` é
  mudar a própria configuração de permissão, o que este agente não faz.
- Quando o `--read-only` está fora, `information_schema.role_table_grants` **volta a funcionar**
  (a conexão é `postgres`). Mesmo assim, seguir usando `aclexplode` — ver
  [[consultas-de-enumeracao]] — para a auditoria não mudar de método conforme o dia.
