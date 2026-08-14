# Memória — agente `rls`

- [Consultas de enumeração](consultas-de-enumeracao.md) — catálogo de RLS/grants/views; `information_schema.role_table_grants` volta vazio sob o MCP read-only
- [Views auto-atualizáveis furam a RLS](views-auto-atualizaveis-furam-rls.md) — view sem `security_invoker` roda como dono; com grant ao anon vira DELETE anônimo na tabela base
- [Políticas que não seguram nada](politicas-que-nao-seguram-nada.md) — `auth.role()='authenticated'`, `user_has_posto_access`, `TO public` e as janelas que de fato travam
- [O anon e o painel](anon-e-o-painel.md) — os dois apps falam como anon sem login; revogar é correção que derruba tela
