---
name: validar-mvp-dois-postos
description: >-
  Roteiro do ensaio do MVP do Posto Providência com os DOIS postos da rede
  (Posto Jorro = id 1, Posto BR = o segundo) rodando no mesmo sistema Laravel +
  Postgres, com o painel e o PWA do frentista pela API. Confere pré-requisitos
  bloqueantes, roda o dia completo nos dois postos e prova o ISOLAMENTO (o que
  um posto grava o outro não vê). Use quando aparecer "testar o MVP", "ensaio",
  "amanhã a gente testa", "dois postos", "Jorro e BR", "multi-posto",
  "multi-tenant na prática", "o Elias vai testar", ou antes de mostrar o sistema
  com os dois postos ao dono. Valida o CONJUNTO no cenário de dois postos; bug
  achado vira `validar-feature-posto-providencia`; o veredito de entrega é da
  `entrega-real-posto-providencia`.
---

# Validar o MVP com os dois postos

> **Por que esta skill existe.** A refatoração existe para que UM sistema sirva os postos
> da rede Providência, cada um vendo só o próprio dado. Até 26/09 isso foi provado
> por teste (Pest), nunca por uma pessoa usando o sistema com dois postos. O ensaio
> responde duas perguntas, nesta ordem: **(1) um dia inteiro fecha certo em cada
> posto? (2) nada de um posto aparece no outro?** A segunda é a que o teste unitário
> menos cobre e a que mais dói: vazamento de dado entre postos é o defeito que mata
> o produto.

---

## Regra de invocação

1. **Pré-requisitos primeiro, e todos.** Se um bloqueante (§1) falhar, o ensaio NÃO
   começa: o relatório diz qual falhou e o que falta. Não improvise contorno
   (ex.: gravar posto 2 no Supabase) — contorno aqui esconde exatamente o que se quer medir.
2. **Nada em produção.** O ensaio roda no banco do compose (ou na VPS de ensaio, se já
   existir). Nenhum SQL no Supabase de produção. Dinheiro real do Jorro não é massa de teste.
3. **Anote tudo com número.** Cada passo sai com: o que a tela mostrou × o que o banco
   guarda × o esperado. "Parece certo" não é resultado.
4. **O Jorro não muda (decisão do dono, 26/09).** No ensaio o Jorro é só LEITURA: nenhum envio,
   fechamento, compra, régua, cadastro ou PIN nele. Toda escrita é no BR. A prova é o retrato do
   Jorro (`banco/ensaio/retrato-do-jorro.sql`) idêntico antes e depois do ensaio inteiro.
5. **Bug achado não é consertado no meio do ensaio.** Anote, siga o roteiro; conserto é
   depois, uma feature por vez, pela `validar-feature-posto-providencia`.

---

## §1 — Pré-requisitos bloqueantes (conferir com comando, não de memória)

| # | O que | Como conferir | Se falhar |
|---|---|---|---|
| P1 | **Multi-tenant na `fase-a`** — os 5 uniques com `posto_id` (PR #144, `feat/#93-multi-tenant-na-fase-a`) | `git fetch && git merge-base --is-ancestor origin/feat/#93-multi-tenant-na-fase-a origin/fase-a` | Sem ele, o 2º posto a fechar o mesmo dia leva **500** no unique do `Fechamento`. Pedir o "ok" do dono para mergear o #144. |
| P2 | Banco sobe com o esquema inteiro, incluindo o `02-*.sql` do #93 e o `08-compra-pela-api.sql` | `docker compose up -d` e `\d "Fechamento"` mostra unique com `posto_id` | Recriar o volume do compose (é local — conferir antes que é o banco da worktree certa: `scripts/banco-da-worktree.sh`). |
| P3 | **Posto BR existe** com catálogo próprio e **24 bicos** (6 bombas × 4; o Jorro tem 6), turnos, formas de pagamento e 3 frentistas com PIN | `scripts/semeia-ensaio-dois-postos.sh <porta>` — cria tudo e imprime o resumo (`bicos = 24`); depois `GET /api/postos/2/bicos` devolve 24 linhas **só do posto 2** | O script só aceita um container `posto-pg-*`/`posto-postgres` local e não refaz se o BR já existir. Catálogo é DE ENSAIO: preços diferentes dos do Jorro de propósito; preços e divisão reais por bomba ainda não vieram do Elias. |
| P4 | **Contas e PINs** — o mesmo script: ADMIN sem senha ganha senha; Elias (`postoprovidenciaa@gmail.com`) GERENTE no Jorro **e** no BR (o vínculo é a única linha que cita o Jorro); `gerente.br@ensaio.local` só no BR (para o 403); PIN só nos 3 frentistas do BR. O script aborta se o retrato do Jorro mudar | `POST /api/login` de cada um: `usuario.postos` lista 2, 2 e 1 posto | As senhas e PINs saem UMA vez na tela do script: guarde para o ensaio, não vão para o git. |
| P5 | **Todas as flags da API ligadas** no web e no PWA: `VITE_API_URL` + `VITE_API_{LOGIN,DASHBOARD,PROPRIETARIO,RELATORIO,CUSTOS,FORNECEDOR,FRENTISTAS,TANQUES,PWA}=1` | `git grep -oh "VITE_API_[A-Z_]*" frontend \| sort -u` — a lista tem de bater com o `.env` do ensaio | Flag desligada = tela lendo do Supabase = posto 2 invisível ou dado do Jorro de produção na tela. |
| P7 | **Os PWAs acessam os dois postos.** Em 26/09 os dois estavam presos no Jorro: `POSTO_ID = 1` em `pwa-frentista/src/shared/config/index.ts` e em duas telas do `pwa-dono` (que ainda é 100% Supabase) | `git grep -n "POSTO_ID *= *1" frontend/apps/pwa-*/src` → vazio; no PWA do frentista dá para chegar à lista de frentistas do BR | Sem isso, B1–B3 não entram no PWA e o R2/R3 não roda. É feature (escolha do posto no PWA), não ajuste de ensaio. |
| P6 | Gates verdes no commit do ensaio | em `backend/`: `composer gates`; em `frontend/`: `bun run type-check`, `bun run test`, **`bun run test:golden`** (nunca `bun test` puro) | Não ensaiar sobre árvore vermelha. |

Rode P1–P7 e só depois diga "pode começar".

### Fora do MVP (não testar no BR, só registrar)

Telas que ainda leem o Supabase: **Clientes/Fiado, Estoque (produtos), Escala,
Configurações, aba Receitas e Despesas**, e o **PWA do dono**. No Posto BR elas vão
aparecer vazias ou com dado do Jorro — isso é esperado e vai para a lista "falta", não
para a lista de bugs. Antes do ensaio, reconfira a lista:
`git grep -l "supabase" frontend/apps/web/src -- '*.tsx' '*.ts' | grep -v test`.

---

## §2 — Roteiro do dia (escrita só no BR; o Jorro só é lido)

Antes de começar: `psql -Atq -f banco/ensaio/retrato-do-jorro.sql > /tmp/jorro-antes.txt`.
Escolha para o BR uma data que **o Jorro já tem fechada** no banco do ensaio: é a colisão que o #93
resolveu (mesma data, dois postos), provada sem escrever no Jorro.

| Passo | Quem / onde | O que fazer | O que conferir |
|---|---|---|---|
| R1 | Elias, painel | Login → tela de escolha mostra **Jorro e BR** | Usuário só-BR vê só o BR (sem tela de escolha ou com 1 opção) |
| R2 | Frentista B1, PWA do BR | Entrar por PIN, marcar presença | PIN do B1 **não** entra no PWA do Jorro (`/postos/1/frentistas/entrar` → 401) |
| R3 | Frentistas B1–B3, PWA do BR | Leituras de encerrante, envio do caixa (dinheiro, cartão, pix), 1 venda de produto, 1 medição de régua | Reenvio idêntico não duplica (idempotência); reenvio com valor diferente → 409 (pergunta 3 pendente do dono) |
| R4 | Elias, painel → Fechamento de Caixa do BR, na data que o Jorro já fechou | Abrir o dia, conferir, **Salvar** | Salva sem 500 (unique com `posto_id`); os envios do R3 aparecem só no BR; `diferenca = concentrador − conferido`; `total_vendas` = o do encerrante |
| R4b | **Ressalva do BR: 24 bicos** | No Fechamento do BR, lançar encerrante nos 24 bicos (inclusive o 24) e salvar; repetir no celular (largura de 375 px) | As 24 linhas aparecem, na ordem do bico, sem corte nem rolagem quebrada; o total por combustível soma 6 bicos cada; nada foi desenhado pensando só nos 6 do Jorro (grade fixa, `slice`, limite de linhas) |
| R5 | Painel → Relatório Diário, Dashboard, Visão Proprietário, Análise de Custos — **nos dois postos** | Ler o dia/mês | No BR, só o que o R3/R4 gravou; no Jorro, os mesmos números de antes do ensaio (anote-os no início) |
| R6 | Painel → Registro de Compras, Tanques, Frentistas — **só no BR** | 1 compra, 1 medição, cadastrar 1 frentista, desativar 1 | Nada disso aparece ao trocar para o Jorro; frentista desativado perde a sessão de PIN |
| R7 | Troca de posto | No painel, trocar Jorro ↔ BR sem recarregar | Nenhuma tela mostra resto do posto anterior (cache/estado do React); nenhum botão de Salvar é apertado no Jorro |

Para cada número de dinheiro: tela × `SELECT` no banco do ensaio × conta à mão com a
regra da skill `fechamento-posto-providencia`. Não invente regra: dúvida de fórmula
para e consulta a skill.

---

## §3 — Prova de isolamento (o coração do ensaio)

Além do que o roteiro já cobre pela tela, ataque a API direto com o token de cada usuário:

1. **Usuário só-BR pedindo o Jorro:** `GET /api/postos/1/dashboard`, `/fechamento`,
   `/relatorio-diario`, `/equipe`, `POST /api/postos/1/compras` → todos **403**. Um 200
   aqui é o defeito mais grave possível: parar o ensaio e reportar.
2. **Recurso de um posto pela rota do outro:** `PUT /api/postos/2/equipe/{id de frentista do Jorro}`
   e `POST .../desativar` → 403/404, **nunca** 200.
3. **Sessão de PIN cruzada:** token de frentista do BR chamando `/api/postos/1/envios` → recusado.
4. **Varredura no banco:** para cada tabela escopada, nenhuma linha gravada no ensaio com
   `posto_id` diferente do posto em que foi feita:
   ```sql
   SELECT 'Fechamento', posto_id, count(*) FROM "Fechamento" WHERE data = :dia GROUP BY 2
   UNION ALL SELECT 'FechamentoFrentista', ... -- idem para Leitura, Recebimento, PresencaFrentista, Compra, HistoricoTanque, VendaProduto
   ```
   O esperado é saber de antemão quantas linhas o BR deveria ter e comparar.
5. **O Jorro não mudou:** `psql -Atq -f banco/ensaio/retrato-do-jorro.sql | diff /tmp/jorro-antes.txt -`
   → vazio. Qualquer linha no diff = `REPROVADO — O JORRO MUDOU`.

---

## §4 — Relatório de saída

Uma tabela, sem adjetivo:

| Item | Jorro | BR | Isolamento | Observação |
|---|---|---|---|---|
| P1…P7 | ✅/❌ | | | |
| R1…R7 | ✅/❌ + número | ✅/❌ + número | ✅/❌ | |
| §3.1…§3.5 | | | ✅/❌ | |

Depois:
- **Bugs** — um por linha, com passo, esperado × obtido, e se toca dinheiro.
- **Fora do MVP** — as telas do Supabase, sem tratar como bug.
- **Perguntas ao dono** que o ensaio levantou (junte às pendentes da memória `onde-parei`).
- **Veredito do ensaio:** `PASSOU` só se P1–P7, R1–R7 e §3 inteiros estiverem ✅. Qualquer
  ❌ em §3 = `REPROVADO — VAZAMENTO`, independentemente do resto. Isso **não** é o veredito
  de entrega; para "pode entregar ao Elias", rode a `entrega-real-posto-providencia` depois.

Salve o relatório como memória de projeto (`onde-parei-DD-MM`) com a data absoluta.
