---
name: busca-de-vagas-jobspy
description: "MCP jobspy instalado em 06/09/2026 para buscar vagas de dev; onde está, o patch aplicado, e o que aprendi nas primeiras buscas (LinkedIn ignora \"Brasil\", Indeed precisa de country_indeed=Brazil)"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 71aea5e7-d153-4a4e-b6e9-bf1d28ae3dfd
  modified: 2026-09-07T01:11:11.085Z
---

O dono quer buscar vagas de dev para si. Instalado em 06/09/2026 o MCP **jobspy**
(borgius/jobspy-mcp-server), escopo de usuário no `~/.claude.json`, ferramenta `search_jobs`.

- Clone em `~/.local/share/mcp-servers/jobspy-mcp-server`; imagem Docker `jobspy` (1,94 GB).
- Patch local (commit 7384428 no clone): os 3 prompts passavam `z.object()` como argsSchema e o
  SDK 1.27 quebrava na inicialização; troquei pelo shape cru. Não foi enviado ao autor.
- Sem a ferramenta na sessão (só carrega em sessão nova), dá para rodar direto:
  `docker run --rm jobspy --site_name indeed --search_term "..." --location Brasil --country_indeed Brazil --is_remote --hours_old 168 --verbose 0 --format json`

**Aprendido nas primeiras buscas (06/09):**
- Indeed exige `country_indeed: "Brazil"`; o padrão é EUA.
- LinkedIn com `location: "Brasil"` **ignora o país** e devolve vaga dos EUA. Usar cidade
  ("São Paulo, Brazil") ou não confiar no LinkedIn para Brasil.
- LinkedIn sem `linkedin_fetch_description` vem sem descrição, então a pontuação por palavra-chave
  não funciona nele.
- Perfil para casar vaga: ver [[perfil-github-crud-make]] — TypeScript/React/React Native,
  Node/Bun, Python/FastAPI, PostgreSQL/Supabase, Docker, IA em produção. Cidade dele: não sei ainda.

**Aprendido em 07/09:**
- `resultsWanted: 25` no Indeed estoura o limite de tokens da resposta (122 k chars) e o harness
  grava num arquivo de `tool-results/`. Não ler na mão: parsear com python — o JSON é
  `{"count","message","jobs":[...]}` e os campos são **camelCase** (`jobUrl`, `datePosted`,
  `isRemote`, `minAmount`, `description` em markdown). Ou pedir `resultsWanted` ≤ 10.
- Salário vem vazio em 22/22 vagas brasileiras do Indeed; não adianta filtrar por ele.
