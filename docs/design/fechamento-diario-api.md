# Fechamento diário pela API — Design Doc

Issue: #103 item 1 (mãe: #60) · Estado: **rascunho — fatias P0 a P3 aprovadas pelo dono e feitas em 18/09/2026; P4a/P4b feitas em 19/09/2026 (sem commit) usando SÓ as rotas do catálogo da #97, que já existiam — a P4 não cria rota. Em 20/09/2026 o guard da DECISÃO A entrou no backend (commit `465efd5`, `autenticacao.md` §3b), então **P5–P7 e P11 deixam de estar bloqueadas pelo guard**: P5–P7 passam a depender só de §7 (f) e de o `base.ts` enviar o Bearer; P8 tinha (d) como bloqueio e (d) foi DECIDIDA pelo dono em 20/09 (§7) — segue como tarefa de fórmula, do Fable, com golden antes; P10 espera §7 (b)–(e); P11 espera P10 e o §7** · Data: 18/09/2026 · Última atualização: 20/09/2026

> Primeiro módulo do painel a migrar do PostgREST para a API Laravel, e o que faz nascer
> `App\Fechamento` no backend. Contrato comum às fatias: `painel-pela-api.md`. Regra de domínio:
> skill `fechamento-posto-providencia`. Fonte dos tipos: `banco/init/01-esquema-base.sql`.
> Plano de execução (fatias P0–P11): registrado na sessão de 18/09 (`plano-fechamento-diario.json`);
> este doc guarda o que o plano decidiu e o que ainda falta decidir.

## 0. O que esta rodada entrega e o que não entrega

| Fatia | Entrega | Toca dinheiro? | Estado |
|---|---|---|---|
| P0 | worktree `pp-fechamento` com dependências instaladas e linha de base verde de todos os gates | não | feita em 18/09 |
| P1 | este doc + correção da contradição `autenticacao.md` × `painel-pela-api.md` (§6, DECISÃO A) | não | feita em 18/09 |
| P2 | Public API de `fechamento-diario` (`index.ts`); `leituras-diarias` deixa de importar arquivo interno | não | feita em 18/09 |
| P3 | `App\Fechamento\Domain` só de leitura (4 models), `'Fechamento' => []` no mapa do Pest Arch com canário | não (só cast) | feita em 18/09 |
| P4a | frentistas ativos pela API (#97): `frentista.api.ts`, troca no call site de `useCarregamentoDados` e `useSessoesFrentistas` | não | feita em 19/09 — só rotas já existentes do catálogo da #97, nenhuma rota nova |
| P4b | bicos e formas de pagamento pela API (#97): `bico.api.ts`, `formaPagamento.api.ts`, troca no call site de `useCarregamentoDados` e `usePagamentos`; `preco_venda`/`taxa` string → `number` sem mudar conta | sim (Fable) | feita em 19/09 — idem P4a, nenhuma rota nova |
| P5 | leituras do dia pela API | sim (Fable) | **FEITA em 20/09/2026** — rota `GET /api/postos/{posto}/leituras?data=`, a **primeira nascida protegida** (`token.atual` → `DefinePostoAtual` → `posto.acesso`). Backend `e1f67b2`, `base.ts` mandando o Bearer `5897f1c`, adaptador e call site `c6ef3b2`. Paridade preservada em três pontos: recorte do dia por igualdade de meia-noite (o Supabase usa `.eq`), string decimal → `Number()` (senão `formatarParaBR` devolve o número cru), e ordem por `id`. Canários: 4 mutações, 3 a 6 vermelhos cada |
| P6 | sessões dos frentistas do dia pela API | sim (Fable) | **FEITA em 20/09/2026** — rota `GET /api/postos/{posto}/sessoes?data=`, `SessoesDoDia` (acha os `Fechamento` do dia, depois os filhos: um dia pode ter mais de um, o unique é `(data, turno_id)`). Backend `c581e94`, adaptador e call site `6093119`. **I8 é dado vivo:** 682 de 1206 sessões em produção têm `encerrante`/`diferenca_calculada` null, e `Number(null)` é 0 — `numeroOuNulo` só converte string |
| P7 | o `Fechamento` do dia e seus recebimentos pela API | sim (Fable) | **desbloqueada** — o guard existe, o `base.ts` manda o Bearer, e `DiaRequest` já está consolidado. Resta §7 (f) |
| P8 | golden das somas do painel × `totaisDoDia` — **mudança de fórmula, tarefa separada** | sim (Fable) | §7 (d) **DECIDIDA em 20/09** (vale o `total_vendas` do encerrante), então deixa de esperar por ela; segue como tarefa de fórmula do Fable, com golden antes |
| P9 | `useCustoMensal` sai do Supabase direto | sim (Fable) | espera P8 e decisão CA-7 sobre Compra/Despesa |
| P10 | Command `GravaFechamentoDoDia`, sem rota | sim (Fable) | bloqueada só por §7 (b), (c), (d), (e) — não depende do guard, porque não expõe rota (§6) |
| P11 | rota PUT autenticada e troca de `handleSave` | sim (Fable) | o guard **deixou de ser bloqueio** em 20/09 (`465efd5`). Continua bloqueada por **P10** (que carrega §7 (b)–(e)) e pelo `base.ts`, que ainda não manda `Authorization`. Falta ainda uma peça: a rota exige `gerir` e hoje só existe middleware para `ver` (`ExigeAcessoAoPosto`) — a P11 precisa de um `posto.gerir` ou de `$this->authorize('gerir', ...)` no controller; a `PostoPolicy::gerir` já existe e está testada |

Nada desta rodada é commitado sem revisão do dono. Nenhuma fórmula muda em fatia estrutural: quem
toca `calcLitros`/`calcVenda` (`useLeituras.ts:437-460`), a taxa (`useFechamento.ts:154-160`,
`usePagamentos.ts:161-176`), o `reduce` de `useCustoMensal.ts:96` ou `totaisPorBalde`
(`fechamentoMeios.ts:245-257`) é o Fable, em tarefa própria, com golden antes.

## 1. Contexto — o que muda para quem está fora

Hoje o módulo `frontend/apps/web/src/components/fechamento-diario` (34 arquivos, legado do
strangler, fora do FSD) fala com o Supabase por sete services e, em `useCustoMensal.ts:48-65`,
direto no client (`Leitura`, `Compra`, `Despesa`). Quem o chama é só `App.tsx:15` (lazy). Quem
importa dele de fora é `leituras-diarias`: em runtime (`useLeiturasDiarias.ts:5`) e como tipo
(`TabelaLeituras.tsx:5`, `ResumoLeituras.tsx:4`) — até P2 os três apontavam para o arquivo interno
`fechamento-diario/hooks/useLeituras`, o único acoplamento de runtime entre módulos do painel
(`painel-pela-api.md` §1); desde 18/09 os três importam de `../../fechamento-diario` (o `index.ts`).

Escritores concorrentes nas mesmas tabelas, que continuam no Supabase durante a transição:

| Quem | O que | Onde |
|---|---|---|
| PWA do frentista | `INSERT Fechamento` (pai, com `total_vendas`/`diferenca` NULL) e `INSERT FechamentoFrentista` | `pwa-frentista/src/services/api.ts:80-91` e `:102-104` |
| `@posto/api-core` (encerrante do dono) | `DELETE Leitura` só dos bicos enviados; `INSERT Leitura` sem tocar `Estoque`; `UPDATE Fechamento` com `totaisDoDia` | `encerrante.ts:463-468`, `:511`, `:640-643` |
| Painel, tela `leituras-diarias` | reconsolida o dia via `consolidacao.service` | `useLeiturasDiarias.ts:3` |
| Painel, fora da Fase A | `limpezaMes.service.ts`, `reset.service.ts` | excluídos pela `painel-pela-api.md` §4 |

Três canais Realtime ficam na #104: `index.tsx:98` (`pwa-envios-realtime`), `index.tsx:126`
(`leituras-bico-realtime`) e `useCarregamentoDados.ts:188` (`fechamento-{posto}`).

Durante a transição a API local grava no Postgres do compose (`:5433`) enquanto PWAs e realtime
seguem no Supabase. Não há duas fontes no **mesmo** banco antes do cutover (#105), mas a validação
local não vê realtime nem os envios do PWA — para validar P11 é preciso simular o envio do PWA no
Postgres local.

Estado do backend hoje: `routes/api.php:47` agrupa `postos/{posto}` só com `DefinePostoAtual`; não
há Sanctum no `composer.json`; `base.ts:45-48` faz `fetch` sem `credentials`. A RLS dá `SELECT
USING (true)` a `anon` em `Fechamento` (`01-esquema-base.sql:1731`), `FechamentoFrentista`
(`:1750`), `Leitura` (`:1801`) e `Recebimento` (`:1880`): essa é a RLS de **hoje**, do painel falando
direto ao PostgREST — descreve o estado atual, não o alvo. Pela DECISÃO A (§6) as rotas NOVAS de
leitura (P5–P7) nascem protegidas; escrita sem login é porta aberta — daí a DECISÃO A.

## 2. Subsistema — onde entra no monólito modular

`App\Fechamento\{Http, Application, Domain}`, usando de `App\Compartilhado` o que já existe:
`Posto`, `PostoAtual`, `PertenceAoPosto`, `Enums\StatusFechamento`.

**`'Fechamento' => []` no mapa do Pest Arch** (`tests/Arch/ArquiteturaTest.php`,
`direcaoPermitidaEntreModulos()`), sem exceção — CA-7 (`docs/arquitetura/regras.md:103`; decisão do
dono em 18/09, memória `regra-de-arquitetura-nao-ganha-excecao`). O comentário do próprio mapa
(`ArquiteturaTest.php:56-60`) previa abrir `App\Fechamento → App\Cadastro\Application` quando o
módulo nascesse; **não abre**. Por quê:

- o catálogo (bicos, frentistas, formas de pagamento) já chega ao cliente pelas rotas da #97; o
  módulo Fechamento não precisa ler `Cadastro` no servidor para servir o painel;
- quando uma Query precisar de coluna de tabela alheia (ex.: `Bico.combustivel_id` para agrupar
  leituras), segue o precedente da Agregação (`agregacao.md` §2): **query builder**
  (`DB::table`), como `DadosDoPeriodo.php:111-136`;
- se um dia for indispensável, entra como regra encadeada nova com canário, restrita a
  `Fechamento\Application → Cadastro\Application`, nunca a abertura do módulo inteiro.

`modulos()` (`ArquiteturaTest.php:39-48`) descobre a pasta `app/Fechamento` sozinho; sem a linha
no mapa a regra barra toda dependência dele, o que é o comportamento desejado — a linha entra por
clareza e para o canário ter onde ser registrado.

Frontend: o módulo **continua legado do strangler** nesta issue (`components/`, fora das camadas do
`eslint-plugin-boundaries`, `eslint.config.mjs:131-133`). O único movimento estrutural é a Public
API do slice (`fechamento-diario/index.ts`), que mata o import profundo de `leituras-diarias`. A
troca de transporte segue a DECISÃO 1 da `painel-pela-api.md`: `*.api.ts` ao lado dos services,
escolhidos por `urlDaApi()` (`base.ts:27-30`).

**Regra de onde trocar o transporte (P4–P7):** métodos que `aggregator.service.ts` também usa
(`bicoService.getWithDetails` `:352`, `formaPagamentoService.getAll` `:353`/`:421`,
`fechamentoFrentistaService.getByDate` `:422`, `leituraService.getByDateRange` `:151`) trocam no
**call site** do módulo, nunca dentro do service — o aggregator é sítio de fórmula
(`.claude/hooks/portao-golden.py:30`) e só o Fable o edita. Métodos usados só pelo módulo (e por
`relatorio-diario`, `useRelatorioDiario.ts:164`) podem trocar dentro do service.

## 3. Componentes

| Camada | Classe | Responsabilidade | Fatia |
|---|---|---|---|
| Fechamento\Domain | `Fechamento` | tabela `"Fechamento"` (`01-esquema-base.sql:217-236`): `data` timestamptz, `total_vendas`/`diferenca` **nullable** (I8), `total_recebido` NOT NULL, `status` → `StatusFechamento`, `createdAt`/`updatedAt`; `PertenceAoPosto`; `hasMany` **só** `frentistas()` e `recebimentos()` — a `Leitura` do dia se acha por (`posto_id`, dia UTC de `data`), **sem relação**, porque não há FK (`Leitura.php:17-19`; corrigido em 18/09, o doc dizia `hasMany leituras`). `lucro_*`, `custo_combustiveis`, `taxas_pagamento` e `margem_*` (colunas carimbadas que o painel nunca grava) ficam **fora do `$fillable`**: fora de produção passá-las lança (`preventSilentlyDiscardingAttributes`, `AppServiceProvider.php:40-43`); em produção a coluna some do INSERT | P3 |
| Fechamento\Domain | `FechamentoFrentista` | 7 baldes + `encerrante`, `valor_conferido`, `diferenca_calculada` em `decimal:2`; `data_hora_envio` (DEFAULT now(), `:254`); `PertenceAoPosto`; `belongsTo(Fechamento)` | P3 |
| Fechamento\Domain | `Leitura` | `leitura_inicial`/`leitura_final`/`litros_vendidos` em `decimal:3`, `preco_litro`/`valor_total` em `decimal:2`; `PertenceAoPosto`; sem `updatedAt` na tabela | P3 |
| Fechamento\Domain | `Recebimento` | **não tem `posto_id`** (`:437-444`): escopa via `belongsTo(Fechamento)`; `valor` `decimal:2`; `forma_pagamento_id`/`maquininha_id` ficam como inteiros (Cadastro é outro módulo) | P3 |
| Fechamento\Application | `LeiturasDoDia`, `UltimasLeiturasAntesDe` | Queries com dia UTC (`DadosDoPeriodo.php:37-43`), `with()` explícito | P5 |
| Fechamento\Application | `SessoesDoDia`, `SessoesDoPeriodo` | `Fechamento.id` na faixa UTC, depois `FechamentoFrentista` (desenho de `fechamentoFrentista.service.ts:293-310`) | P6 |
| Fechamento\Application | `FechamentoDoDia` | `Fechamento` do dia ou `null`, com recebimentos | P7 |
| Fechamento\Application | `GravaFechamentoDoDia` | Command transacional (passos 0–5 de `useSubmissaoFechamento.ts:103-230`), **sem rota até a #102** | P10 |
| Fechamento\Domain | `JanelaDeEscrita`, `TotaisDoDia` | Value Objects: janela **medida** (§7 e) e revalidação de `diferenca = total_vendas − total_recebido` em centavos (`fase-a-laravel.md:91-93`), sem refazer a fórmula dos baldes | P10 |
| Fechamento\Http | `LeituraController`, `FechamentoFrentistaController`, `FechamentoController` | 3–5 linhas por método; sem `Request` cru; sem `Domain` para escrever (Pest Arch) | P5–P7, P11 |
| Fechamento\Http | `Requests\{DiaRequest, PeriodoRequest, GravaFechamentoDoDiaRequest}` | validação de forma | P5–P7, P11 |
| Fechamento\Http | `Resources\*` | dinheiro em **string decimal**, timestamptz em UTC (padrão `cadastro.md`/`agregacao.md`); `null` continua `null`, nunca `'0.00'` (I8) | P5–P7 |
| frontend `services/api` | `leitura.api.ts`, `fechamento.api.ts`, `fechamentoFrentista.api.ts`, `recebimento.api.ts`, `frentista.api.ts`, `bico.api.ts`, `formaPagamento.api.ts` | padrão `fornecedor.api.ts` (`buscarNaApi` + Zod + `ResultAsync`); filtro `ativo === true` no cliente, porque `CatalogoDoPosto.php:46-67` não filtra e os services do Supabase filtram | P4–P7 |
| frontend `components/fechamento-diario` | `index.ts` | Public API: `useLeituras` e `type Leitura`, mais o `default` da tela (para `App.tsx:15` continuar resolvendo) | P2 |
| tests | `Feature/Fechamento/*`, canário Arch, vitest dos schemas, golden novo (P8) | ver Testes | — |

## 4. Comportamento

### Sequência atual da gravação (o que o Command de P10 reproduz no servidor)

```mermaid
sequenceDiagram
    autonumber
    actor G as Gerente
    participant T as Painel (useSubmissaoFechamento)
    participant PG as Postgres (via PostgREST hoje)

    G->>T: Salvar dia
    T->>PG: DELETE Leitura where data, posto  (I5; aborta se sobrou linha)
    T->>PG: SELECT Fechamento do dia
    alt existe
        T->>PG: DELETE FechamentoFrentista do pai (antes: UPDATE NotaFrentista/Notificacao → NULL)
        T->>PG: DELETE Recebimento do pai
    else não existe
        T->>PG: INSERT Fechamento RASCUNHO (turno_id = 1, usuario_id = 1)
    end
    T->>PG: INSERT Leitura[] (+ UPDATE Estoque por combustível — §7 b)
    T->>PG: INSERT FechamentoFrentista[] (sessões com movimento)
    T->>PG: INSERT Recebimento[] (valor > 0)
    T->>PG: UPDATE Fechamento FECHADO + totais
    Note over T,PG: ~12 requisições soltas; qualquer falha no meio deixa o dia pela metade.<br/>No servidor vira UM Command em DB::transaction.
```

### Invariantes que nenhuma fatia pode mudar

| # | Invariante | Onde está hoje |
|---|---|---|
| I1 | `diferenca = concentrador − conferido`, FALTA positiva | `fechamento.golden`, `totais-do-dia.golden`, `useFechamento.test.ts:87-117` |
| I2 | `conferido` = soma dos 7 baldes, cartão aditivo, moedas incluídas | `fechamento.golden`; `useSubmissaoFechamento.ts:171-176` |
| I3 | sessão sem movimento não vira linha | `useSubmissaoFechamento.ts:164-168` |
| I4 | `diferenca_calculada = 0` quando `encerrante = 0` | `useSubmissaoFechamento.ts:176` (sem teste) |
| I5 | leituras do dia apagadas SEMPRE antes de tudo; gravação aborta se o DELETE for recusado, conferindo contagem | `useSubmissaoFechamento.ts:103-106`; `leitura.service.ts:413-429` |
| I6 | `usuario_id = 1` (`USUARIO_SISTEMA_ID`) até a #102 | `useSubmissaoFechamento.ts:129`, `:150` |
| I7 | `turno_id = 1` é o tampão do `UNIQUE (data, turno_id)` (`:757`) | `useSubmissaoFechamento.ts:29`, `:130` |
| I8 | `total_vendas` e `diferenca` nascem NULL, nunca 0 | `fechamento.service.ts:160-167`; `pwa-frentista/services/api.ts:86-89` |
| I9 | dia = dia UTC de timestamptz às 00:00Z | `fechamentoFrentista.service.ts:297-308`; `DadosDoPeriodo.php:37-43` |
| I10 | preço editado na tela persiste em `localStorage` e sobrepõe o cadastro | `useCarregamentoDados.ts:89-97`; `useCarregamentoDados.test.ts` |
| I11 | lucro nunca por margem fixa | `useCalculoGestaoBicos.test.ts`; `lucro.golden` |
| I12 | litros e valor da `Leitura` saem de `litrosVendidos`/`valorDaLeitura` | `leitura.service.ts` (bulkCreate); `leitura.golden` |
| I13 | derivação do Caixa Geral só sugere, não grava | `index.tsx:215-248` |
| I14 | reabrir dia salvo traz os `Recebimento` | `index.tsx:197-202`; `usePagamentos.ts:86-91` |

Janela de escrita no esquema local: `>= 2025-12-31` e `< CURRENT_DATE + 2 dias`
(`dentro_da_janela_de_escrita`, `01-esquema-base.sql:1119-1128`) — nem "7 dias" nem "1,5 mês";
**medir em produção antes de portar** (§7 e).

Critério de paridade de toda fatia: os números em `localhost:3015/fechamento-diario` e em
`leituras-diarias` são idênticos antes e depois, com e sem `VITE_API_URL`.

## 5. Contratos (propostos — forma final é aprovação do dono, §7 f)

```
GET /api/postos/{posto}/leituras?data=AAAA-MM-DD
  → { data: [{ id, bico_id, combustivel_id, data, leitura_inicial: "string",
               leitura_final: "string", litros_vendidos: "string", preco_litro: "string",
               valor_total: "string" }] }

GET /api/postos/{posto}/leituras/ultimas?antes_de=AAAA-MM-DD
  → uma linha por bico (hoje o cliente dedupa de um limit 200, leitura.service.ts:186-214)

GET /api/postos/{posto}/fechamentos-frentista?data=AAAA-MM-DD | ?inicio=&fim=
  → linhas com frentista_id e fechamento { id, data, turno_id, posto_id }
    (reaproveita o contrato da #101, fechamento-frentista-api.md §6)

GET /api/postos/{posto}/fechamentos/dia/{data}
  → Fechamento | null, com recebimentos: [{ forma_pagamento_id, maquininha_id, valor: "string" }]

PUT /api/postos/{posto}/fechamentos/dia/{data}          (P11 — só depois da #102, policy 'gerir')
  { leituras: [...], sessoes: [...7 baldes, encerrante, valor_conferido, diferenca_calculada],
    recebimentos: [...], totais: { total_vendas, total_recebido, diferenca }, observacoes }
  → revalida SÓ diferenca = total_vendas − total_recebido em centavos; tudo em DB::transaction;
    resposta é o Fechamento gravado. Erro: { erro: { codigo, mensagem, campos? } }.
```

Frontend: cada `*.api.ts` exporta função com tipo de entrada explícito e `ResultAsync<T, ErroDaApi>`
de saída, `T = z.infer` do schema; dinheiro vem string e só vira número em centavos via
`@posto/utils` (a conversão é do Fable). Filtro `ativo === true` aplicado no cliente para bicos,
frentistas e formas de pagamento.

Dívida de esquema registrada, fora deste item: `UNIQUE (data, turno_id)` de `Fechamento` não tem
`posto_id` (`:757`) e `Recebimento` não tem `posto_id` (`:437-444`) — um segundo posto na mesma data
colide no unique; o escopo por posto no servidor passa pelo `Fechamento`.

## 6. DECISÃO A — autorização durante a transição (dono, 18/09/2026)

**Decisão:** durante a transição, **o Laravel aceita o token do login atual** (o JWT que o
Supabase Auth emite para o painel hoje) e acha o usuário por `Usuario.auth_user_id`
(`01-esquema-base.sql:510`, FK para `auth.users(id)` em `:731`). **Toda rota fica protegida desde
já, inclusive escrita.** Trocar o login depois é só trocar quem emite o token: o guard continua o
mesmo, muda o emissor.

**O problema que ela resolve:** os dois docs aprovados se contradiziam.

- `autenticacao.md:118` dizia que a **#102** faz "toda rota da API exigindo sessão" (Sanctum),
  com o painel ainda logando no Supabase;
- `painel-pela-api.md:60-61` dizia que o `AuthContext` só troca **junto com a última chamada direta**
  ao Postgres, no fim da #103.

Juntas: entre a #102 e o fim da #103, toda fatia migrada do painel — inclusive o piloto de
fornecedor (#121, `painel-pela-api.md` §3b) — receberia 401, porque o painel só teria sessão do
Supabase e a API só aceitaria sessão Sanctum.

**O que a decisão substitui, em cada doc:**

| Doc | Trecho substituído | Passa a valer |
|---|---|---|
| `autenticacao.md` §3, DECISÃO 1, linha da #102 | "toda rota da API exigindo **sessão** [Sanctum]. O painel continua logando no Supabase" | toda rota exige **identidade**: o guard da #102 aceita o token do login atual (Supabase) e resolve `Usuario` por `auth_user_id`; a `PostoPolicy` ganha dente com esse usuário. Sanctum/`/api/login` entram como **segundo emissor**, sem exigir troca do painel |
| `painel-pela-api.md` §3, DECISÃO 2 | "o `AuthContext` troca **nesta issue**, junto com a última chamada direta ao Postgres. Nunca antes" | o `AuthContext` **não precisa trocar** para as fatias migrarem: o token que ele já tem é o que a API aceita. A troca de emissor (Supabase → Laravel) continua acoplada ao fim das chamadas diretas, mas deixa de ser pré-requisito de qualquer fatia |

**O que NÃO muda:** a janela `anon` da `autenticacao.md` §3 continua proibida — o painel segue
logando no Supabase até a última chamada direta sair, então a RLS continua vendo `authenticated`.
A decisão tira o 401 do meio do caminho sem criar o estado `X` do diagrama.

**Onde se implementou:** na #102, em 20/09/2026 (commit `465efd5`) — as três peças
(`VerificaTokenDoSupabase`, `AutenticaPeloTokenAtual`, `ExigeAcessoAoPosto`), com os aliases
`token.atual` e `posto.acesso`. Descrição completa e condição de saída em `autenticacao.md` §3b.

A trava "nenhuma rota nova do Fechamento nasce sem guard" está **satisfeita**: rota nova de P5–P7 e de
P11 nasce no grupo

```
->middleware(['token.atual', DefinePostoAtual::class, 'posto.acesso'])
```

nessa ordem. Duas consequências que a decisão não previa e a implementação expôs:

- **O guard não desbloqueia sozinho.** Ele resolve o lado servidor, mas o painel ainda não manda
  `Authorization` (`base.ts:46`). P5–P7 precisam do Bearer no cliente **na mesma fatia** em que a rota
  nasce protegida, senão a fatia estreia em 401.
- **`gerir` não tem middleware, só `ver`.** A P11 (PUT) precisa da peça que falta — um `posto.gerir` ou
  `$this->authorize('gerir', ...)` no controller. A policy já está pronta e testada.

## 7. Decisões do dono (pendente: só a **(f)** — (b), (c) e (d) DECIDIDAS e (e) MEDIDA em 20/09/2026)

Nenhuma destas foi tomada em 18/09. Estão aqui para não serem decididas por omissão dentro de um
PR estrutural. **Não escolher por conta própria.** Em 20/09/2026 o dono decidiu a **(d)** — ver abaixo
da tabela. Em 20/09 o dono decidiu a **(b)**, a **(c)** e a **(d)**, e a **(e)** deixou de ser decisão: foi MEDIDA em produção e bate com o esquema local. Só a **(f)** continua pendente, e ela é transcrição: a forma dos contratos sai do formato que os dados já têm.

| # | Decisão | O que o código faz hoje | Opções (sem recomendação) | Bloqueia |
|---|---|---|---|---|
| (b) ✅ | **Estoque no salvamento** — **DECIDIDA em 20/09/2026** | hoje o INSERT das `Leitura` desconta `Estoque.quantidade_atual` por combustível (`leitura.service.ts:340-392`, falha em `console.warn`) e o `deleteByDate` **não devolve** (`:413-430`) — regravar o dia desconta de novo, pelo total inteiro | **decidido: mantém o comportamento — desconta no INSERT, não devolve.** O duplo desconto ao regravar é aceito como está; consertar é issue própria. **Forma decidida: por EVENTO.** O Command grava as leituras e emite o fato (litros por combustível, posto, dia); quem escuta e desconta é o módulo `App\Estoque`. `Fechamento` **não** conhece `Estoque` — a CA-7 (nenhum módulo depende de outro) fica de pé sem exceção, e o comportamento sobrevive à P11, quando a escrita sair do cliente. A alternativa descartada era o Command não tocar estoque: fiel hoje, mas o desconto **pararia** de acontecer na P11, mudando dinheiro por omissão | P10 deixa de esperar por (b). Nasce `App\Estoque` com model e listener |
| (c) ✅ | **`DELETE+INSERT` × `UPSERT` em `FechamentoFrentista`** — **DECIDIDA em 20/09/2026** | hoje é `DELETE ... WHERE fechamento_id` + `INSERT` em lote, e o INSERT vem do **estado da tela** capturado no clique (`useSubmissaoFechamento.ts:116,199`; o estado é montado em `useSessoesFrentistas.ts:137-240` e só mescla com o banco NO CARREGAMENTO). Envio que chega pelo PWA depois disso é apagado e não volta; o `data_hora_envio` original é perdido; `NotaFrentista`/`VendaProduto` desvinculados não voltam | **decidido: vira UPSERT por `(fechamento_id, frentista_id)`** — o unique existe e está aplicado (`01-esquema-base.sql:761`) — **mais DELETE só dos `frentista_id` que o cliente declarou conhecer e não mandou de volta**. O contrato leva `sessoes[]` e `frentistas_conhecidos[]`: o Command atualiza o que veio, apaga só dentro do conjunto declarado (remoção deliberada do gerente) e **não toca** em quem a tela nunca viu. `UPSERT` puro foi descartado porque tiraria do gerente a única forma de apagar envio errado | P10 deixa de esperar por (c). Conserta o defeito de apagar envio tardio e preserva `data_hora_envio` no UPDATE |
| (d) ✅ | **Qual `total_vendas` vale** — **DECIDIDA em 20/09/2026** (abaixo) | o painel soma em float (`useFechamento.ts:107-110` `reduce`; `calculators.ts:244-267` `calcularTotais`); o `api-core` grava `totaisDoDia` em centavos (`fechamento.ts:118-138`; `encerrante.ts:621-643`). `POST /consolidar` revalida em centavos (`fase-a-laravel.md:91-93`) e pode recusar o painel por 1 centavo. Nenhum golden hoje exercita `useFechamento` nem `calculators.ts`; o comentário de `useFechamento.ts:137` diz o contrário | decidido: vale o `total_vendas` do **encerrante**. O P8 segue sendo o golden das duas implementações sobre janeiro, agora com o vencedor já escolhido. Tarefa de fórmula, só do Fable | nada mais — P8 deixa de esperar por (d); P10 e P11 seguem pelas (b), (c), (e) |
| (e) ✅ | **Janela de escrita real** — **MEDIDA em 20/09/2026, não precisa de decisão** | **Produção e esquema local são IDÊNTICOS**, conferido no `pg_proc` do Supabase: `SELECT quando >= DATE '2025-12-31' AND quando < (CURRENT_DATE + INTERVAL '2 days')`. As memórias que falavam em **7 dias** e em **1,5 mês** estavam as duas erradas | o Command copia literalmente: `>= 2025-12-31` e `< CURRENT_DATE + 2 dias`. ⚠️ `CURRENT_DATE` depende do fuso da sessão — em produção é UTC, e a conexão do Laravel foi fixada em UTC (`cebfad3`), então batem. Encurtar a janela é issue separada (`fechamento-frentista-api.md` §5) | P10 deixa de esperar por (e) |
| (f) | **Contratos do §5** | — | aprovar a forma final antes de P5 | P5–P7 |

### DECISÃO (dono, 20/09/2026): o `total_vendas` que vale é o do ENCERRANTE

Motivo, como ele colocou: *"quem manda é o encerrante"*. O encerrante é o medidor **físico e acumulado**
do bico — um número só, independente de quantas pessoas passaram por ele. O fechamento recebe **vários
envios diferentes, de frentistas diferentes**, alimentando o mesmo encerrante; somar os envios seria
somar relatos parciais sobre o mesmo bico, e o total sobra ou falta conforme quem deixou de enviar. O
encerrante não tem esse modo de falha.

Consequências a registrar:

- A fatia **P8** (golden das somas do painel × `totaisDoDia`) esperava exatamente a (d) e **deixa de
  estar bloqueada por ela**.
- P8 continua sendo **mudança de fórmula**: entra com golden antes, em tarefa própria, e é trabalho do
  Fable (regra DOM-1 / hook `so-fable-na-formula`).
- Alinha com o que já estava registrado: `Leitura` é por dia e por bico, **não por turno** — filtrar
  encerrante por `turno_id` já produziu bug. O encerrante ser a autoridade reforça que ele não se divide
  por turno nem por frentista.
- **(b)**, **(c)**, **(e)** e **(f)** **não** foram decididas: continuam pendentes.


## Testes

- **P2:** `cd frontend && bun run type-check && bun run lint:eslint && bun run test`;
  `rg 'fechamento-diario/hooks/useLeituras' apps/web/src/components/leituras-diarias` vazio; em
  `localhost:3015`, abas Leituras e Leituras Diárias com os mesmos números para um dia de janeiro.
- **P3:** `cd backend && composer gates` (PHPStan lido pelo campo `errors` do JSON, nunca por
  `grep`); `vendor/bin/pest tests/Arch` com o canário **visto vermelho** (`use App\Cadastro\Domain\Bico`
  com uso real em `Leitura.php` → só a regra de Fechamento reprova → remover → verde), registrado
  no comentário do mapa; Feature (`tests/Feature/Fechamento/ModelsDoFechamentoTest.php`) que
  carrega `Fechamento` com `frentistas` e `recebimentos` via `with()` explícito e prova que a
  mesma coleção sem `with()` lança `LazyLoadingViolationException` (a trava do
  `AppServiceProvider` exercitada); `Leitura` do dia por (`posto_id`, dia UTC), porque não tem FK
  para o pai; escopo por posto (`PertenceAoPosto`) e `Recebimento` escopado via `Fechamento`;
  ao criar `Fechamento`, `FechamentoFrentista` e `Leitura` **sem** `posto_id`, os três saem com o
  posto atual (mutação 18/09: sem o trait em `Leitura`, o `posto_id` volta `1`, o DEFAULT da
  coluna, e o teste fica vermelho).
- **P5–P7:** Pest Feature por Query com fronteira UTC. ⚠️ **Atenção, medido em 20/09:** a conexão
  da aplicação foi fixada em UTC (`config/database.php`, `cebfad3`) porque o compose herdava
  America/Sao_Paulo e produção é UTC — o mesmo SQL perdia o dia 01 de janeiro inteiro (6 leituras,
  R$ 9.430,34). E o cast `datetime` do Eloquent formata **sem offset na escrita**, então factory
  NÃO serve para fixar instante: use `DB::table()->update(['data' => '...+00'])`. Um teste de
  fronteira escrito sem isso mede outra coisa e passa verde mentindo — aconteceu três vezes antes
  de um canário morder
  e trava de N+1 exercitada; `tests/Arch` (controller sem `Request` cru, sem `Domain` para
  escrever); `bun run test:golden` antes e depois; paridade em `localhost:3015` com e sem
  `VITE_API_URL`.
- **P8:** golden novo verde ANTES de qualquer troca e depois de CADA troca de call site;
  `useFechamento.test.ts:87-117` (sinal) continua verde.
- **P10:** falha simulada no meio deixa o banco como antes (rollback); salvar duas vezes não
  duplica nem muda o `Estoque` além do decidido; `diferenca` fora de 1 centavo recusada;
  fora da janela recusada; auditoria (`audita_*`, `:1608-1610`) grava DELETE/UPDATE.
- **P11:** sem sessão → 401; sem `gerir` → 403; com `gerir` → 200 e banco igual ao de P10;
  `useSubmissaoFechamento.test.ts` reescrito preservando I3–I7; `.oxlintrc.json:19` sem o override
  e `bun run catraca:atualizar` sem `--aceitar-divida`.
- Sempre: `bun run test:golden`, **nunca** `bun test` puro.

## Riscos

- 🔴 **Salvar o dia APAGA a leitura-base de bico sem fechamento** (achado em 20/09, **não
  corrigido**). O passo 0 apaga TODAS as `Leitura` do dia; o passo 2 só reinsere bico cujo campo
  de fechamento está preenchido (`useSubmissaoFechamento.ts:143`). Bico com a primeira foto do dia
  e ainda sem fechamento mostra `''` (`useLeituras.ts:294-297`), que é falsy — a linha não volta,
  e o `Estoque` que ela descontou nunca é devolvido. Consertar muda o que é gravado: tarefa
  própria, com golden.
- 🪤 **`parseValue` É `analisarValor`** (`formatters.ts:83`, alias puro), e havia um comentário em
  `fechamentoMeios.ts:17-19` afirmando o contrário — **corrigido em 20/09**. A mesma função
  parseia dinheiro e encerrante de bomba, e tem um ramo que divide por mil; só não estoura porque
  o formatador sempre devolve string com vírgula. **Consequência para a P10: o Command recebe
  NÚMERO, não string** — replicar o parser em PHP replicaria a ambiguidade.
- 🔴 **O passo 5 grava `0` em `total_vendas`, nunca `null`** (`useSubmissaoFechamento.ts:235`),
  violando a I8 e a migration `20260904_fechamento_nao_apurado_e_nulo.sql`. O `fechamento.service`
  e o `api-core` gravam `null`. É a divergência caminho A × B localizada na linha, e qual dos dois
  vale é decisão do dono.
- ⚠️ **Nada da gravação é transacional hoje.** São 6 chamadas soltas ao PostgREST; falha no meio
  deixa o dia meio-gravado, e o pior caso (falha no passo 3) apaga o caixa dos frentistas inteiro
  sem reinserir. A transação do Command é ganho real da migração, sem mudar conta nenhuma.

- ⚠️ **Escrita sem identidade é porta aberta**: o PUT apaga e regrava o dia inteiro. P10 entra sem
  rota de propósito; P11 só depois da #102. Nenhuma "rota temporária".
- ⚠️ **Duas fórmulas de `total_vendas`/`diferenca` para a mesma coluna** (painel × api-core). Sem
  P8 antes de P10/P11, o servidor recusa o painel por 1 centavo ou grava número diferente do que a
  tela mostra.
- ⚠️ **Efeito colateral de dinheiro fora do módulo** via `trigger_atualizar_saldo_cliente` (§7 c).
- ⚠️ **Envio do PWA entre o DELETE e o reINSERT** se perde ou é sobrescrito; o UPSERT resolve,
  DELETE+INSERT não (§7 c).
- ⚠️ **Métodos partilhados com o aggregator** trocam no call site (§2), porque o aggregator já
  teve regressão de fórmula e só o Fable o edita.
- ⚠️ **Catálogo da API não filtra `ativo`** (`CatalogoDoPosto.php:46-67`): sem filtro no cliente,
  frentista inativo volta semeado e bico inativo entra no total.
- ⚠️ **Tela mista com gravação (P4, enquanto P5–P11 não entram).** Com `VITE_API_URL`, os ids de
  bico, frentista e forma de pagamento vêm do Postgres do compose (`useCarregamentoDados.ts`,
  `useSessoesFrentistas.ts`, `usePagamentos.ts`), mas leituras, sessões, recebimentos **e a
  GRAVAÇÃO** (`useSubmissaoFechamento.ts`) seguem na fonte atual — a produção. Salvar o fechamento
  nesse modo grava em produção com ids lidos do banco local. Em 19/09 os ids batiam (conferido por
  SQL na revisão da P4: 9 frentistas, 6 bicos, 9 formas idênticos nas duas fontes), então o modo
  `VITE_API_URL` é **só para validação de leitura** — paridade dos números com e sem a variável —
  e os ids têm de ser reconferidos antes de cada validação. Nenhum ajuste de tela nesta fatia: a
  proteção real é P11 (a gravação passa pela API) ou o cutover (#105).
- ⚠️ **Gates que já mentiram verde** (memória `gate-verde-sem-canario-nao-vale`): PHPStan em JSON,
  Pest Arch só na forma encadeada com um namespace por regra, trava nova sem canário não vale.
- ⚠️ **Worktree sem dependências** (memória `worktree-nao-herda-dependencias`): sem `node_modules`,
  `vendor`, `docs/data` e `.env` os gates falham em silêncio. `backend/vendor` nunca em symlink.
- **`index.ts` ao lado de `index.tsx`**: o Vite e o `moduleResolution: bundler` resolvem `.ts`
  antes de `.tsx`, então o `index.ts` de P2 passa a ser o que `App.tsx:15` importa e precisa
  reexportar o `default` da tela — senão o lazy quebra sem erro de tipo. Provado por
  `type-check` + `bun run test` + tela aberta.
