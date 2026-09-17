---
name: direcao-carreira-2026
description: "Decisão de 06/09/2026 sobre onde o dono foca a carreira — full-stack TS que constrói agentes de IA, Python via FastAPI, Go depois — e a evidência de vagas que sustentou isso"
metadata:
  type: user
---

Em 06/09/2026, depois de pesquisa de mercado (Firecrawl + 11 vagas reais lidas no Indeed, todas
remotas, jun–set/2026), o dono decidiu o foco: **"full-stack TypeScript que constrói agentes de
IA"**, não "engenheiro de IA" (essas pedem 5+ anos de Python e inglês fluente).

Evidência que sustentou (contagem nas 11 vagas): TypeScript 5/5 full-stack; Python 6/6 nas de IA
(obrigatório em 5); Laravel/PHP **0/11**; Go 1/11; PostgreSQL atravessa os dois grupos; RAG/
embeddings 5/6, observabilidade/tracing 5/6, evals/golden datasets 4/6, MCP 2/6 (Agnes obrigatório).
Fontes gerais: LinkedIn "Empregos em alta 2026" (Eng. de IA é o nº 1 no Brasil), gitGood (vagas de
IA +74% YoY, frontend puro −15%, "full-stack com integração de IA" é o título que mais cresce).

**Ordem combinada:** (1) Python funcional via FastAPI — o curso de ciência de dados já dá; (2) RAG
com pgvector no Supabase; (3) evals + tracing reaproveitando o golden master como "golden dataset";
(4) Go entra depois, como servidor MCP em Go. Adiar: K8s, Laravel, ciência de dados como fim.

**Projeto-ponte proposto (não iniciado):** agente em FastAPI que responde perguntas sobre o dado do
posto, ferramenta `consultar_sql` só-leitura, eval contra o golden master. Decisões pendentes que
são dele: provedor de LLM (chave) e repo público com dado sintético × privado com dado real — ele
interrompeu a pergunta; retomar quando ele pedir.

**Vagas ranqueadas para aplicar (Indeed, set/2026):** Mazzatech (React 19 + Supabase RLS, PJ),
Maxxidata (Node/NestJS + RN + Claude Code como diferencial), Betha (Eng. de IA Sr — aceita TS,
pede skills/conectores/evals/guardrails). Aposta: Agnes/AG Capital (MCP, Python obrigatório). Pular:
Luby, MJV, CashMe, Jota, BIX (Python 3+ anos e inglês testado). Textos de apresentação já escritos
na sessão de 06/09; o repo do Posto é privado, então o `.claude/` não é visível — sugerido repo
público só com a configuração.

**Why:** pesquisa custou créditos de Firecrawl e uma sessão inteira; refazer é desperdício, e a
direção é decisão dele, não minha.
**How to apply:** ao falar de carreira, perfil ou projeto novo, partir daqui. Ver
[[perfil-github-crud-make]] e [[dono-prefere-que-eu-execute]].

## 06/09 (tarde) — pesquisa Firecrawl "como ganhar dinheiro com Claude Code"
- Mercado BR de sistema simples para posto: R$ 300–600/mês (value4u.com.br). É o teto de referência pra cobrar do Elias.
- Automação/agente IA pra PME no BR: R$ 400–1.400/mês por cliente, projeto pontual a partir de R$ 5k (iadobrasil, mutagex). EUA: setup US$ 1,5–5k + retainer US$ 500–2k/mês.
- Vaga PJ achada hoje exatamente no perfil (TS + LLM + Claude Code): R$ 8–9k, híbrido SP (Wake Up Treinamentos, Glassdoor).
- Não há mercado pra vender skill/plugin de Claude Code (busca vazia). Firecrawl não abre Reddit.
- Ordem recomendada: fechar Elias → vaga PJ → 2º cliente de automação usando o posto como case.

## 07/09 — busca de vagas Go (jobspy Indeed 168 h + MCP Indeed)
32 vagas lidas (22 jobspy + 10 Indeed oficial). **Confirma o "Go depois":** Go puro quase sempre é
Pleno/Sênior (3–8 anos, concorrência com goroutines/channels), e a porta de entrada real é a vaga
que pede "Node/TS forte e disposição a evoluir para Go" — iFood Staff (RN + Node + Postgres, LLM
como diferencial), Plei (Go **ou** TS, NestJS, 6–8 anos, inglês), Saas.group Staff (Node ou Go).
Atento TI "Engenheiro de Agentes de IA" (05/09) pede Python **e** Go + inglês avançado + 3 anos —
é o cruzamento exato IA×Go, mas o inglês trava. Go puro remoto: Avalara, BairesDev, Frete.com,
Bling/LWSA (pede PHP também), Turbi, SysMap (Go + React). Sem salário em nenhuma.

## 07/09 — pesquisa "melhor curso de ciência de dados do Brasil" (Firecrawl)
Não existe ranking sério; o que há é opinião de aluno no r/datasciencebr (só snippet: Reddit
bloqueia Firecrawl, JSON sem login, e no Chrome a página não expõe texto). Coursera MCP pedia
reautorização. Sinal colhido: DSA (Data Science Academy) — "comece pelos gratuitos", professor
forte, ritmo lento; Alura — aluno prefere DataCamp; Asimov — "faltou didática" no Python Starter;
DIO — decepção; MBA USP/Esalq Data Science — 22× R$ 793,72 (~R$ 17,5 k), resenha positiva no
Medium e um "não recomendo" no Reddit; Univesp — bacharelado gratuito, 4 anos, bom conteúdo,
vestibular anual (2026 já fechou). Recomendação dada: não pagar MBA agora; DSA gratuito + projeto
quant; Univesp se quiser diploma; MBA USP/Esalq só empregado.
**Decisão do dono em 07/09: FastAPI, dedicação total.** Dúvida dele era eficiência do FastAPI
para servir o app mobile (React Native) — respondido: o app fala com o Supabase direto, FastAPI é
o serviço ao lado (agente, relatório, rotina); escala não é problema no porte do posto.

## 07/09 (noite) — stack fechada de novo: TypeScript full-stack
Depois de 6 direções num dia (Go, FastAPI, quant, dados, FP&A, "volto pra programação"), o dono
propôs: **TypeScript ponta a ponta — Node/NestJS + PostgreSQL + React + React Native**, "orquestração
de sistemas" como já fez no posto (painel + mobile integrados). Endossei: é o que ele já tem em
produção e o que Mazzatech, Maxxidata, Plei e iFood pedem; o único novo é NestJS (e RN, que é
React). **Substitui a decisão FastAPI do mesmo dia.** Python fica para ETL/quant como hobby, sem
peso na candidatura. Pós em Controladoria continua como diferencial no topo do currículo.
Condição combinada: escolha de stack não adia envio — currículo e 8 candidaturas remotas primeiro.

## 09/09 — "cancela tudo": stack passa a ser TypeScript/React + Laravel
Dois dias depois de fechar "TS ponta a ponta com NestJS", o dono disse: "cancela tudo, minha stack
será TypeScript React + Laravel". Sétima troca desde 07/09. Motivo não dito ainda — perguntar o que
mudou antes de aceitar. O que NÃO muda com a stack: currículo, candidaturas remotas, reunião com o
Elias (~17/09), escopo do barbeiro/clínica. Laravel: 0/43 vagas lidas, mas para freela local é
produtivo (Filament, Inertia+React, Cashier).
