# Memória — agente `rls`

- [Consultas de enumeração](consultas-de-enumeracao.md) — catálogo de RLS/grants/views; `information_schema.role_table_grants` volta vazio sob o MCP read-only
- [Views auto-atualizáveis furam a RLS](views-auto-atualizaveis-furam-rls.md) — buraco fechado em 13/08, mas o padrão volta sozinho em view nova
- [Políticas que não seguram nada](politicas-que-nao-seguram-nada.md) — `auth.role()='authenticated'`, `user_has_posto_access`, `TO public` e as janelas que de fato travam
- [O anon e o painel](anon-e-o-painel.md) — painel exige login desde 19/08 (fala como authenticated); só os 2 PWAs falam como anon
- [MCP sem token: não contornar](mcp-sem-token-nao-contornar.md) — "Unauthorized" nas 3 ferramentas = token defasado; relatar do repo, rotulado, e parar
- [App novo não amplia privilégio](app-novo-nao-amplia-privilegio.md) — a exposição é do papel `anon`, não do app; medir no papel, nunca contando telas
- [verify_jwt não protege Edge Function](edge-function-verify-jwt-nao-protege.md) — a anon key É um JWT válido; para cota de LLM isso é ausência total de trava
- [Conferir as travas no arquivo](conferir-as-travas-no-arquivo.md) — ler `.mcp.json` e o `deny` do disco antes de afirmar que existe trava técnica
