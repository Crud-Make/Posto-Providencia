---
name: progresso-fase-a-20-09
description: 20/09 medido — 14 rotas GET, 8 desvios no painel, 231 acessos diretos ao Supabase, escrita 0%; e o caminho da API NUNCA foi exercitado por uma tela
metadata:
  type: project
---

**Remedido em 20/09/2026, fim do dia**, na branch `feat/#102-guard-token-atual` (29 commits à
frente de `origin/fase-a`). Substitui a medição da manhã, que dizia "leitura <5%" — a tela de
fechamento diário foi migrada durante o dia.

## A forma da transição: estrangulador pela LEITURA

| camada | estado |
|---|---|
| esquema versionado | **100%** — 45/45 tabelas, diff vazio |
| rotas na API | **14, todas GET.** Zero POST/PUT/DELETE |
| leitura do fechamento diário | **~100%** — mas é **1 tela de 17** (ver §telas) |
| catálogo | ~100% (#97) — bicos, bombas, combustíveis, tanques, turnos, frentistas, fornecedores, formas-pagamento, maquininhas |
| **escrita** | **0%** — P10 (Command) e P11 (PUT) não existem |
| resto do painel | perto de zero |
| produção | **100% Supabase** |

**Tamanho do que falta:** **246** acessos diretos ao Supabase no painel; **34** arquivos de
service, dos quais **8** têm adaptador `.api.ts` irmão (bico, dashboard, fechamento,
fechamentoFrentista, formaPagamento, fornecedor, frentista, leitura).

**Os 8 pontos de desvio** (`urlDaApi() !== null` decide a fonte):
`useLeituras.ts:269` · `useSessoesFrentistas.ts:160,186` · `useCarregamentoDados.ts:159` ·
`usePagamentos.ts:63,124` · `fornecedor.service.ts:29` · `aggregator.service.ts:409`


## 🔴 Telas: o denominador honesto (medido em 20/09, por grep + grafo)

"Leitura ~100%" vale para **uma tela**. O painel tem **17 telas roteadas** (13 no menu):

| | |
|---|---|
| totalmente na API Laravel | **0** |
| **mistas** (algum desvio) | **4** — Fechamento de Caixa (6 desvios), Dashboard (1), Compras (1), Leituras Diárias (por tabela, reusa `useLeituras`) |
| só Supabase | **13** |

**A `Visão Proprietário` — primeira do menu (`BarraLateral.tsx:77`, `App.tsx:74`) — lê 100% do
Supabase**, zero `urlDaApi`: 17 chamadas (hook próprio 4, widget `resumo-mensal` 8,
`impacto-troca-preco` 5). O bloqueio dela não é volume, é a **RPC `get_dashboard_proprietario`**,
que não tem equivalente no Laravel — as 14 rotas não cobrem proprietário, planilha, estoque nem
despesa. O `pwa-dono` é OUTRO app (encerrante por foto), também Supabase puro.

Recontagem dos acessos diretos: **246** com `.channel(` e `supabase.auth.*`, **237** sem — a
medição antiga dizia 231, divergência de padrão de grep, não de código.

⚠️ **`VITE_API_URL` é global, não é flag por tela.** Ligá-la troca a fonte das 4 telas mistas de
uma vez, e **três tocam dinheiro** (Fechamento de Caixa, Dashboard, Leituras Diárias).

**Achado do grafo que o grep ingênuo perderia:** `leituras-diarias` não tem `urlDaApi` nenhum no
diretório, mas é MISTA — importa `useLeituras` do barrel de `fechamento-diario`
(`useLeiturasDiarias.ts:5`).

## O fato incômodo — RESOLVIDO em 20/09, à noite

Era: `VITE_API_URL` não estava setada em lugar nenhum (nem na Vercel, nem nos 8 `.env` do repo),
então **o caminho da API nunca tinha sido exercitado por uma tela**.

**Exercitado nesta sessão.** `VITE_API_URL=http://localhost:8000` em `frontend/apps/web/.env`
(gitignored; a Vercel segue sem ela), painel em `:3015` contra o Laravel do compose. Resultado:
rotas respondem **200**, dinheiro em string decimal, timestamp em UTC, e **paridade com a produção
confere nos 6 bicos de 05/01** (638,800 L × 6,28 = 4.011,66; 307,460 = 1.930,85; 0,681 × 4,58 =
3,12). CORS libera o `Origin :3015` e o header `authorization`.

O que isso destravou de conhecimento está em [[guard-sem-auth-user-id-401]]: a API funciona, mas
**nenhum `Usuario` tem `auth_user_id`** — no cutover todo login real cai em 401.

## O gargalo deixou de ser decisão

As três decisões do §7 que travavam a escrita **foram todas tomadas em 20/09** — (b) Estoque
desconta e não devolve, (c) UPSERT + DELETE do conjunto declarado, (d) vale o `total_vendas` do
encerrante —, a (e) virou medição e a (f) se resolveu por transcrição. O que trava a escrita agora
é só **trabalho**: P10, P11, e um middleware `posto.gerir` que não existe (só `ver`).

**E antes de tudo isso:** [[multi-tenant-impossivel-sem-migration]] — 5 uniques sem `posto_id`. É
DDL contra produção e espera o "vai" do dono.

Ver [[porque-multitenant-e-o-destino]], [[golden-que-arredonda-nao-morde]],
[[total-vendas-vale-o-encerrante]] e [[tetos-de-qualidade-19-09]].
