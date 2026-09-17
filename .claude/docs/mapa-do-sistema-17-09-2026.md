# Mapa do sistema — 17/09/2026

> Levantado para a decisão "refatorar o sistema inteiro e adicionar Laravel + Postgres em Docker".
> Seis varreduras em paralelo (grafo, schema, rls, conformidade, historico, superfície Supabase),
> todas somente leitura, todas confirmadas por grep/Read no arquivo real. Cada número aqui envelhece;
> o comando que o regenera está na memória do agente que o mediu (`.claude/agent-memory/<agente>/`).
>
> **Limite desta medição:** o token do MCP do Supabase está vencido (401 em `execute_sql`,
> `list_tables`, `get_advisors`, Management API e CLI). Tudo sobre o **banco vivo** vem do repo e de
> notas datadas (snapshot de tipos de 02/08, memória de 13/08 e 19/08). Está marcado como tal.

---

## 1. O que já existe e ninguém lembrava

| Achado | Onde | Implicação |
|---|---|---|
| **A decisão já foi tomada uma vez.** Issue #60 (28/08): "tirar o backend do Supabase: API própria em Laravel, containerizada, em VPS". Fase A = Laravel só como persistência/auth/autorização, `packages/utils` intocado. Fase B (cálculo em PHP com golden em PHPUnit) é issue separada. | 11 tarefas, todas pendentes; 0 comentários; nada no CHANGELOG nem em commit. | A tarefa bloqueante da #60 é a mesma da #93: **inventário/dump do esquema**. |
| **Issue #93 (07/09) aponta na direção oposta:** "um projeto Supabase por cliente, instalação separada, não multi-tenant", e diz que "independe" da #60. | Aberta, 0 comentários, EM ESPERA até fechar contrato do segundo posto. A branch `feat/#93-esquema-base` (checked-out) tem **0 commits**. | Colisão de decisão, não de código. A #60 avisa: "esta issue e o segundo posto competem pelas mesmas semanas". |
| Duas worktrees ociosas (`-estrutural`, `-formula`), branches mergeadas desde 30/08. Não existe tag `versao-testada-funcionando-*` a partir da `main` de hoje (`6662b24`); a única é de 26/08, 142 commits atrás. | `git worktree list`, `git tag` | Antes de refatoração grande, §9 pede tag nova. |

## 2. Tamanho do sistema (medido hoje)

| Parte | Arquivos | Linhas | Observação |
|---|---|---|---|
| `apps/web` | 345 | 43.280 | 17 rotas; 38 services em `services/api/`; **sem `strict`** (tsconfig raiz); Tailwind por CDN; vite 6 |
| `apps/pwa-frentista` | 19 | 2.808 | `App.tsx` tem 852 linhas; sem router; `POSTO_ID = 1` cravado |
| `apps/pwa-dono` | 19 | 2.485 | 2 telas; push/VAPID; SW manual |
| `packages/utils` | 41 | 7.015 | 16 módulos; 12 golden + 12 vitest ao lado |
| `packages/api-core` | 4 | 897 | 74% em `encerrante.ts` (consolidação do pai + OCR); recebe `SupabaseClient` injetado, usa PostgREST direto |
| `packages/types` | 7 | 681 | tipos gerados com **zero importadores**; o client é tipado por schema manual |
| `supabase/migrations` | 59 `.sql` | 4.520 | 47 ativos + 12 `legado/`; numeração não casa com o banco |
| `supabase/functions` | 2 | 766 | `ler-encerrante` (Gemini), `notifica-dono` (web-push, único uso de `service_role`) |
| `scripts/` | 10 py + 3 | 2.817 | ETL e cargas; só 2 falam com o banco, via Management API |

Testes: **18 golden (3.296 asserções, verde em 17/09)** + 49 vitest. `bun run type-check` limpo.
Dívida de tipagem: 7 `any`, todos em teste; 0 `enum`. A dívida é **estrutural**, não de tipo.

## 3. Fluxo de dinheiro ponta a ponta

1. **Frentista** (`pwa-frentista/App.tsx:319`): `conferido(meiosFromPwaPayments)` → INSERT `Fechamento` (pai, se não existe) + `FechamentoFrentista` → `consolidarFechamento` → `notifica-dono` (fire-and-forget). Laterais: `VendaProduto`, `HistoricoTanque`, `PresencaFrentista`, `Frentista.foto`.
2. **Consolidação do pai** (`api-core/encerrante.ts:551-655`, **roda no cliente**): `Σ Leitura.valor_total` do dia × `totaisDoDia(sessões)` → UPDATE `Fechamento.total_vendas/total_recebido/diferenca`, ou `null` se faltar bico. Mesma função em `reconsolidarDia` (web) e `scripts/reconsolidar-dia.ts`.
3. **Encerrante**: pwa-dono por foto (OCR na Edge Function) ou painel; INSERT `Leitura` com `litrosVendidos`/`valorDaLeitura` da canônica.
4. **Painel** (`useSubmissaoFechamento.ts`): DELETE + reINSERT de `Leitura`, `FechamentoFrentista`, `Recebimento` do dia; UPDATE `Fechamento` `status='FECHADO'`. Realtime recarrega a tela.
5. **Dono vê**: pwa-dono lê `FechamentoFrentista`; `/proprietario` chama RPC `get_dashboard_proprietario` (SQL); `/planilha` recalcula tudo em memória de `Leitura/Compra/Despesa/HistoricoTanque`.

Tabelas do ciclo: `Fechamento`, `FechamentoFrentista`, `Leitura`, `Recebimento`, `Bico`, `InscricaoPush`.

**Fórmula viva em duas linguagens:** `get_dashboard_proprietario` (plpgsql, `20260828_rpc_taxa_cartao_e_despesa_do_mes.sql:70-90`) e `lucro.ts` fazem a mesma conta; o golden cobre a versão TS, **nenhum teste executa o SQL**. `get_fechamento_mensal` (legado, ainda chamada por `/fechamento-mensal`) classifica combustível por `ILIKE` e tem taxa de cartão chumbada 1,2%/3,5%.

## 4. Superfície do Supabase (o que um backend próprio substitui)

| Recurso | Usado? | Dependentes | Equivalente |
|---|---|---|---|
| PostgREST (`.from()`) | sim | **59 arquivos**; web 231 chamadas em 32 tabelas, 66 selects com join embutido; pwa-frentista 15/8 tabelas; pwa-dono 1; api-core 14 | API REST por recurso |
| RLS + papéis | sim | 74 policies ativas (36 `TO anon`, 35 `TO authenticated`) | autorização no servidor |
| Auth e-mail/senha PKCE + reset por e-mail | só web | `supabase.ts`, `AuthContext.tsx` | sessão/token + SMTP |
| Anon sem login | os 2 PWAs | `createClient` com anon key, frentista em `localStorage` | token de aparelho / endpoints públicos com rate limit |
| Realtime | só web | 4 canais (`Fechamento`, `FechamentoFrentista`, `Leitura`, `Frentista`), todos só refetch | websocket/SSE ou polling |
| Edge `ler-encerrante` | sim | api-core → pwa-dono, pwa-frentista | endpoint + Gemini + rate limiter |
| Edge `notifica-dono` | sim | pwa-frentista | job Web Push (`web-push` em PHP existe) |
| RPCs | sim | 3 chamadas: `get_dashboard_proprietario`, `get_fechamento_mensal`, `get_frentistas_with_email` (**esta sem DDL no repo**) | endpoints de agregação ou manter em SQL |
| Triggers de auditoria | sim | `audita_*` em 3 tabelas | portável, fica no Postgres |
| Storage, Views, Cron, extensões | **não** | 0 | — |
| Vercel | só hosting estático | 3 `vercel.json` com rewrite SPA | qualquer CDN |

## 5. O que a RLS faz de verdade (reconstruído do repo; catálogo n/d)

- **Nenhuma policy alcançável por anon filtra `posto_id`.** O único filtro é temporal: janela `[31/12/2025, hoje+2)` durante o replay (intenção original: 7 dias para escrita, mês anterior para edição).
- **Logar no painel remove travas**: `authenticated` apaga `Fechamento` sem janela e faz tudo em `Despesa`, `HistoricoTanque`, `Compra`, `Frentista`, `Cliente`, `Posto`. `UsuarioPosto` e `Usuario.role` existem, mas **nenhuma regra viva os consulta** (só `user_has_posto_access`, restrita a policies remanescentes de 27/01).
- Grant por coluna em `Fechamento` (anon só edita 5 colunas). `AuditoriaDados` sem policy, escrita só por trigger. `InscricaoPush`: anon só insere.
- CRUD totalmente aberto a anon: `Configuracao`, `Emprestimo`, `Parcela`, `Escala`, `Receita`, `CategoriaFinanceira`, `Notificacao`, `ganhos`, `parcelas`, `frentistas_old_backup`.
- `FORCE ROW LEVEL SECURITY` em 0 de 44 (13/08).

Tradução: a autorização a reproduzir num backend próprio é **pequena**, porque quase não existe. O que existe: janela temporal, grant por coluna, auditoria por trigger, RPC do dashboard que lê `Compra` como dono.

## 6. Drift repo × banco (bloqueio nº 1 da #60 e da #93, quantificado)

Fonte: snapshot de tipos de 02/08 (43 tabelas) × `CREATE` nos 59 `.sql`. Hoje há provavelmente 45 (+`PresencaFrentista`, +`InscricaoPush`).

- **24 de 43 tabelas sem `CREATE TABLE` no repo.** 16 só têm `ALTER`/`POLICY`; 8 não têm DDL nenhum (`Tanque`, `Escala`, `VendaProduto`, `Receita`, `CategoriaFinanceira`, `frentistas_old_backup`, `ganhos`, `parcelas`).
- **Núcleo do fechamento sem DDL reproduzível: 11 de 14** — `Combustivel`, `Tanque`, `Bomba`, `Bico`, `Frentista`, `Turno`, `Leitura`, `Fechamento`, `FechamentoFrentista` (DDL de 21/12 obsoleto: `double precision`, sem 7 colunas atuais), `FormaPagamento`, `Compra`. Com DDL: `Posto`, `Despesa`, `UsuarioPosto`.
- **8 de 13 funções sem DDL** (4 de dinheiro: `calcular_lucro_fechamento`, `calcular_vendas_por_fechamento`, `calcular_juros_divida`, `projetar_quitacao`; mais `get_frentistas_with_email`, chamada pelo painel).
- **2 de 2 views sem `CREATE VIEW`.** **`Role` e `StatusFechamento` sem `CREATE TYPE`.** Sequences, extensions, grants iniciais: zero DDL.
- Policies só no banco para ~29 tabelas; uma `ALTER POLICY` de 19/08 sem arquivo.
- Pares contraditórios no repo com estado desconhecido: janela `cobre_o_replay` × `volta_aos_7_dias`; dois índices únicos concorrentes em `Leitura`; unique de `FechamentoFrentista` escrito e não aplicado (19/08).
- As 6 primeiras migrations do projeto Supabase são de **outro sistema** ("MAY DAY"); 16 tabelas do histórico não existem.
- Tipos: 2 gerados (25/01 e 02/08) com 1.820 linhas de diferença entre si, **zero importadores**; o client real usa `schema.ts` manual; os PWAs usam `createClient` sem genérico.

**Conclusão:** um Postgres novo subido só com o repo não teria `Fechamento`, `Leitura`, `Frentista`, `Bico`, `Tanque`, `Combustivel`. Qualquer caminho (Laravel, segundo posto, Docker local) começa por `supabase db dump` do MAY-DAY. E isso exige o token renovado.

### 6a. Adendo, mesmo dia: catálogo vivo medido e esquema versionado

Com o token renovado, o catálogo foi lido pela Management API (read-only). Confirmado: **45 tabelas,
103 policies, 22 funções, 9 triggers, 2 views, 130 índices, 42 sequences, 141 constraints, RLS em
45/45, `FORCE` em 0/45**, Postgres 17.6, 103 migrations no histórico (última `20260819161647`).
Referências fora de `public`: só `auth.uid()`, `auth.role()`, `auth.jwt()` e `auth.users` (3 FKs +
1 trigger). O grant por coluna em `Fechamento` **não existe** no banco. O esquema inteiro está em
`banco/init/01-esquema-base.sql` e sobe limpo em Postgres 17 no Docker — ver `banco/README.md`.
O bloqueio nº 1 deixou de existir.

## 7. Dívida rankeada por custo numa migração

1. `apps/web` sem `strict` (345 arquivos): tipos nunca verificados com `noImplicitAny`.
2. Fórmula em duas linguagens (RPC plpgsql × `lucro.ts`), SQL sem teste.
3. 6 módulos de fórmula em `apps/web` fora de `packages/utils` (`calculos-analise-vendas.ts`, `useCalculosRegistro.ts`, `calculos-estoque-produto.ts`, `custo-do-mes.ts`, `calculators.ts`, `fechamentoMeios.ts`), com teste mas no lugar errado.
4. Duas divergências de domínio abertas: denominador do preço médio (`use-planilha-do-banco.ts:246,680` × `encerrante-mensal.ts`); taxa por transação (`usePagamentos.ts:163`) × taxa como despesa do mês (`lucro.ts`, dono 26/08). Reescrever congela do jeito que estiver.
5. 309/345 arquivos do web fora de FSD; `components/` com 201.
6. 316 imports relativos profundos em 140 arquivos; alias `@/` pronto, usado em 8.
7. Lógica de domínio no Postgres sem versionamento (§6).
8. Tailwind por CDN no web; vite 6/7, TS 5.8/5.9 entre apps.
9. 29 arquivos > 300 linhas, 5 > 500.
10. 13 sites de dinheiro final sem `emCentavos`; kebab-case em 187/435.

## 8. Três caminhos, com ganho e perda

**A. Reescrever tudo (front + back)** — "refatorar o sistema inteiro" no sentido literal.
Perde 3.296 asserções de golden validadas 112/112 contra a planilha, 43 mil linhas de painel em produção com frentistas reais, e o replay em curso. Ganha uma base limpa que ninguém validou. **Não recomendo**; é o "efeito segundo sistema" que a própria #60 nomeia.

**B. Fase A da #60 como está escrita** — Laravel substitui Supabase como persistência/auth/autorização; React fica; `packages/utils` intocado.
Custo: 59 arquivos de PostgREST viram chamadas a uma API (231 no web, 66 com join); auth do painel; 4 canais realtime; 2 Edge Functions; 3 RPCs; consolidação que hoje roda no cliente. Ganha multi-tenant real, backup próprio, banco reproduzível, dev local em Docker. Perde semanas antes do primeiro cliente pagar, e assume ops de VPS ("um VPS caído às 22h é um posto que não fecha o caixa").

**C. Strangler com o Postgres primeiro** — recomendado.
1. Renovar o token; `supabase db dump` → `supabase/migrations/0000_esquema_base.sql` + `docker-compose.yml` com Postgres 16 que sobe o esquema e um seed. Paga o bloqueio nº 1 da #60 **e** da #93, é obrigatório em qualquer caminho, e não toca produção. Ganho imediato: policies e RPCs passam a ter teste local (hoje zero).
2. Laravel em `apps/api` (composer, fora do Bun), no mesmo compose, contra o mesmo Postgres. Primeira fatia: as **2 Edge Functions e as 3 RPCs** — fronteira pequena e clara, e já mata a fórmula em plpgsql.
3. Segunda fatia: `pwa-frentista` (15 chamadas, 8 tabelas, 1 arquivo de service) + `api-core` (consolidação). Aqui se decide onde `totaisDoDia` roda: no cliente como hoje, ou em PHP com golden portado (Fase B).
4. Última fatia: `apps/web` (231 chamadas). Enquanto isso, Supabase continua servindo o que ainda não migrou.
Perda: convive com dois backends por um período; PostgREST e Laravel precisam concordar no esquema. Ganho: cada fatia tem golden rodando antes e depois, e dá para parar em qualquer ponto com sistema funcionando.

## 9. Decisões que só o dono toma

1. **#60 ou #93 primeiro.** Competem pelas mesmas semanas. O passo 1 do caminho C serve às duas.
2. **Onde a fórmula roda depois:** TS no cliente (Fase A pura) ou PHP no servidor (Fase B, golden em PHPUnit). "A e B não podem ser feitas juntas" (#60).
3. **Multi-tenant no app (#60) ou instalação por cliente (#93).** Com Laravel, multi-tenant passa a ser viável; a #93 escolheu instalação separada porque a RLS não segura posto.

## 10. Pendências de higiene reveladas pelo mapa

- Token do MCP vencido: sem ele, nenhuma medição do banco vivo e nenhum dump.
- `CLAUDE.md` §13 cita skill `planilha-jorro`, que não existe nas 7 skills do repo.
- Tag `versao-testada-funcionando-<x>` a partir de `6662b24` antes de qualquer fatia.
- `git worktree prune` das duas worktrees ociosas (operação que move; não executada).
- #60 e #93 sem rastro no CHANGELOG; tarefa 9 da #93 (regra "um projeto por cliente") não feita.
- `.env.example` sem `VITE_VAPID_PUBLIC_KEY`.
- Código morto: Expo Push em `notification.service.ts`; tabelas `ganhos`/`parcelas`/`frentistas_old_backup` de outro projeto; `get_encerrantes_mensal` sem chamador.
