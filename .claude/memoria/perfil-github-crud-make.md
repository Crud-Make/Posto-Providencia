---
name: perfil-github-crud-make
description: "README de perfil do GitHub (Crud-Make/Crud-Make) criado em 06/09/2026 — como o dono quer o perfil, o que ele rejeitou, e pendências (pins, LinkedIn, chave Gemini, PR #92)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 21173c5d-08a1-4177-8959-f8faea22819a
  modified: 2026-09-06T23:05:40.077Z
---

O perfil do GitHub do dono vive no repo **`Crud-Make/Crud-Make`** (público, só `README.md`),
criado em 06/09/2026. Nome no perfil: **Thygo Carvalho**. Para editar: clonar de novo — o clone
daquela sessão ficou no scratchpad e sumiu. Bio/nome/site se mudam por `gh api -X PATCH /user`
(token ganhou escopo `user` em 06/09; a linha "sem `user`" do `~/.claude/CLAUDE.md` global ficou
defasada porque o classificador barrou a edição — corrigir quando der).

**Reescrito por ele em 06/09 à noite (commit 39e2b15)** — texto dele, colado inteiro: posicionamento
"ecossistemas integrados — um domínio, vários apps", Posto Providência como seção principal com a
IA como subseção, outros projetos condensados, **Stack em tabela** (inverteu a regra "lista, não
tabela" abaixo — foi decisão dele, não voltar). Aceitou meus 2 ajustes: "desktop" → "painel
administrativo" (não há app desktop) e "TypeScript strict" removido (o Posto não liga strict).
Sem LinkedIn no rodapé agora — só o GitHub.

**Como ele quer o perfil** (aprendido em 7 rodadas de ajuste, "PERFEITO" no fim; formato anterior à
reescrita — o gosto vale, a estrutura mudou):
- Formato do colega MMacedoS: seções com emoji no título, categorias de tecnologia em **negrito**
  com lista, não tabela. Emoji **só** em título/categoria — emoji e badge espalhados no corpo ele
  chamou de "cara de vibe coding" e mandou tirar.
- Sem muralha de badges, sem card de estatística, sem seção "Diferenciais ✅" — texto de vaga.
- Fato com número, não adjetivo: 3.296 asserções de golden master, RLS em 100% das tabelas,
  em produção desde agosto/2026.
- Stack que ele se define: forte em **TypeScript (React, React Native)**, **Node, Bun e Python
  (FastAPI)** no back, **PostgreSQL** (pediu tirar "Supabase" do texto e pôr Postgres).
  **06/09 (commit c5a7b3c):** Laravel saiu do destaque a pedido dele, depois da pesquisa de vagas
  (0 menções em 11 vagas lidas; TS em 5/5 full-stack); ficou na lista de backend em último.
  FastAPI subiu com lastro no `axxy-finance`. **NestJS entrou no destaque
  em 06/09 (commit 1651ad0) SEM lastro** — conferido: zero repos no GitHub e nenhum local usam
  `@nestjs/core`. Ele sabia e mandou pôr: "iremos criar outro sistema depois". O próximo sistema
  deve ter API em NestJS para o destaque virar verdade. Ver [[direcao-carreira-2026]]. Quer Next.js, NestJS,
  Docker/Compose, DevOps. **Estudando** ciência de dados (Python) e Go — "(iniciando)" no Go foi
  decisão minha e ele aceitou; vai criar repo de ciência de dados.
- A seção **🤖 Desenvolvimento com IA** é a maior e a que ele mais pediu: orquestração de agentes,
  hooks/loop engineering, grafo de conhecimento (graphify), engenharia de contexto, MCP. Tudo
  descrito com o que existe no `.claude/` do Posto-Providencia — manter verificável.
- Posto-Providencia fica **privado** (financeiro real do Elias no CHANGELOG/testes/memória); no
  perfil entra descrito + link do sistema em produção `https://posto-providencia.vercel.app` (sem
  sessão só mostra login — `frontend/apps/web/src/App.tsx:87`). Repo
  `-Axxy-Finaaceiro` renomeado para `axxy-finance`.

**Pendências dele:** fixar os 4 repos na web (a API não permite mais), LinkedIn (vai recriar —
README diz "em breve"), **revogar a chave do Gemini** que estava em `check_llms.py` e mergear o
**PR #92** que apaga o arquivo. Sugerido: usuário `demo` com RLS para o link virar demonstração
clicável; limpar os 19 MB de Python/C++ (venv commitado) do `axxy-finance`, que pinta o card de
linguagens.

**Why:** perfil é vitrine dele; reescrever do zero em outra sessão perderia 7 rodadas de gosto.
**How to apply:** ao mexer no perfil, clonar `Crud-Make/Crud-Make`, manter o formato acima e só
adicionar tecnologia que tenha lastro em repo dele — ele aceita aviso quando não tem.
Ver [[dono-prefere-que-eu-execute]].

## 07/09 (noite) — atualizado com o ok do dono
- Bio: "Desenvolvedor full-stack TypeScript (React, React Native, Node, PostgreSQL) com pós em
  Controladoria. Sistemas que fecham o caixa." Localização: "Tucano, BA · remoto". (API PATCH /user
  funcionou — o token tem escopo suficiente para bio/location.)
- README (commit da4c986 em Crud-Make/Crud-Make): saiu "Estudando ... Go", entrou seção
  "🎓 Formação" (pós Controladoria, CD em conclusão Estácio, Gestão Pública) e uma frase de
  controladoria no parágrafo de abertura.
- Números conferidos rodando a suíte em 07/09: golden 3.296 (bate com o README), vitest 446.
- **Pendente:** pins só mudam pela web (não há mutation GraphQL).
  Repo público com a config `.claude/` do posto precisa **curadoria antes** (memórias têm dado
  financeiro real do cliente) — não publicar sem revisar.
- 09/09: a pedido do dono, bio e README passaram a listar **Laravel ao lado do TypeScript** no
  backend (commit 8cffb74). Bio atual: "Desenvolvedor full-stack: React e React Native no front,
  Laravel e TypeScript no backend, PostgreSQL. Pós em Controladoria. Sistemas que fecham o caixa."
