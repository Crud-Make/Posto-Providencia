---
name: mcp-sem-token-nao-contornar
description: Quando execute_sql/list_tables/get_advisors devolvem "Unauthorized", o token do ambiente está defasado — não caçar credencial nem abrir caminho próprio à Management API; relatar e parar
metadata:
  type: feedback
---

Se as três ferramentas do MCP (`execute_sql`, `list_tables`, `get_advisors`) devolvem
`Unauthorized. Please provide a valid access token...`, o `SUPABASE_ACCESS_TOKEN` que o
harness injetou no `.mcp.json` está inválido/defasado (confirmável com um `curl` de `GET
https://api.supabase.com/v1/projects/<ref>` → 401). **O agente não contorna isso.**

**Why:** aconteceu em 17/09/2026. As saídas possíveis eram (a) procurar o token válido em
`.claude/settings.local.json` (é de lá que `scripts/aplica-migration.ts` lê) ou uma URL de
banco em `.env*` — negado pelo classificador como exploração de credencial, e com razão; ou
(b) escrever um script próprio que bata em `POST /v1/projects/<ref>/database/query` com esse
token — que roda como `postgres`, sem o `--read-only` que o dono repôs em 06/09, ou seja, um
caminho mutante que o frontmatter `tools:` deste agente existe para não ter. As duas violam a
regra "se puder alcançar ferramenta mutante, é misconfiguração: pare e reporte".

**How to apply:**
- Entregar o que o repositório permite reconstruir (migrations, `CHANGELOG.md`, memórias
  datadas) rotulado como **não conferido no catálogo**, com a data da última medição real.
- Entregar o **pacote de SELECTs** pronto para rodar assim que o MCP reconectar com token
  válido (`/mcp` → reconectar `supabase` depois de exportar o token certo no ambiente).
- Nunca converter esse relatório parcial em "auditado": o "24 de 42" nasce exatamente de
  chamar de inventário o que foi só leitura de arquivo.
