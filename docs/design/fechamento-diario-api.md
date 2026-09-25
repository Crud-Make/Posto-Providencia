# Fechamento diário pela API — Design Doc

Issue: #103 item 1 (mãe: #60) · Estado: **rascunho — fatias P0 a P3 aprovadas pelo dono e feitas em 18/09/2026; P4a/P4b feitas em 19/09/2026 (sem commit) usando SÓ as rotas do catálogo da #97, que já existiam — a P4 não cria rota. Em 20/09/2026 o guard da DECISÃO A entrou no backend (commit `465efd5`, `autenticacao.md` §3b), então **P5–P7 e P11 deixaram de estar bloqueadas pelo guard**. **P5, P6 e P7 estão FEITAS — a LEITURA do fechamento diário fechou inteira** — e a §7 (f) foi resolvida por transcrição em 20/09 (a §5 agora descreve o que subiu, não o que se propôs); P8 tinha (d) como bloqueio e (d) foi DECIDIDA pelo dono em 20/09 (§7); P10 espera §7 (b)–(e); P11 espera P10 e o §7** **Em 21/09/2026 a P10 e a P11 subiram: a ESCRITA do fechamento do dia passa a existir pela API — Command transacional, rota PUT autenticada e o `handleSave` do painel desviado por `VITE_API_URL`. Com isso o fechamento diário fecha leitura E escrita, e é a PRIMEIRA tela do painel completa pela API. Ela nasce DESLIGADA em produção de propósito: nenhum `Usuario` tem `auth_user_id` (401 em todo login real) e a Vercel não tem `VITE_API_URL`. Resta a P9.** **Em 22/09/2026 a P8 subiu: o `total_vendas` do painel passa a vir do encerrante (`vendaDoDiaPeloEncerrante`, `5436b4c` + `c2368cd`), dia não apurado é `null` nos dois caminhos de gravação, e `calcularTotais` foi apagado com o golden que o media (`0d0c9f3`).** **Ainda em 22/09/2026 a P9 subiu PELA METADE — passos 1–2 (`8aef1b8`), estruturais: o cálculo de `useCustoMensal` foi extraído para a função pura `calculaCustoMensal` (`hooks/custo-mensal.ts`), presa por caracterização; fonte (Supabase) e fórmula não mudaram. Os passos 3–6 esperam (linha P9 da §0).** **Ainda em 22/09/2026 os passos 3–6 da P9 subiram (`008e8ff`…`8b705d9`): o `/dashboard` ganha o campo aditivo `leituras`, `useCustoMensal` e `useDespesaDoMes` leem pela API quando `VITE_API_URL` existe, e o caminho Supabase passa compra e despesa para o mês civil (D1/D2). Com isso o fechamento diário não tem mais leitura de dinheiro presa ao Supabase quando a API está ligada.** **Em 25/09/2026 a P12 fechou a tela INTEIRA pela API no login pela API — nenhuma chamada ao Supabase, provado por teste de ponta a ponta (§5.3); ficam para o dono o lucro da aba Fechamento Mensal e a aba Receitas e Despesas.** · Data: 18/09/2026 · Última atualização: 25/09/2026

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
| P7 | o `Fechamento` do dia e seus recebimentos pela API | sim (Fable) | **FEITA em 20/09/2026** — rota `GET /api/postos/{posto}/fechamento?data=`, `FechamentoDoDia` devolve **UM** fechamento (o mais recente do dia, `orderByDesc('id')->first()`) com `recebimentos` por eager load. Backend `adf2232`, adaptador e call site `54413da`. **Dia sem fechamento é 200 com `data: null`, não 404** — 404 obrigaria o cliente a distinguir "rota errada" de "dia em branco", e dia em branco é estado normal do sistema. Com isso a LEITURA do fechamento diário fecha inteira |
| P8 | o `total_vendas` do painel pelo encerrante — **mudança de fórmula, tarefa separada** | sim (Fable/Opus 5.5) | **FEITA em 22/09/2026**, em três commits. `5436b4c`: nasce `apps/web/src/utils/venda-do-dia.ts` (`vendaDoDiaPeloEncerrante`: `valorDaLeitura` por bico lido, soma por `totalVendasDoEncerrante` de `@posto/utils`, `null` com menos bicos lidos que ativos) com `venda-do-dia.golden.spec.ts` sobre os 31 dias de janeiro, ainda sem call site. `c2368cd`: `useFechamento.ts:104` troca a fonte; `totalVendas` vira `number \| null`; `FooterAcoes` decide "sem encerrante" por `=== null` e mostra `—`; `montarDiaDeclarado` manda o par `total_vendas`/`diferenca` nulo pela fonte; `gravacaoLegadaSupabase.ts:232` grava `null` (decisão do dono, 21/09). `0d0c9f3`: `calcularTotais` e `calculators.golden.spec.ts` apagados (test:golden 3564 → 3499). **Não mudou:** a entrada segue sendo `preco_venda` de HOJE — a divergência de PREÇO de janeiro (R$ 23.784,56) continua, medida na asserção (e) do golden novo. **Canário rodado em 22/09/2026:** soma em float → 95 vermelhos; contar só os bicos lidos (sem `null`) → 31 vermelhos; restaurado → 128/128 |
| P9 | `useCustoMensal` sai do Supabase direto | sim (Fable/Opus 5.5) | **passos 1–2 FEITOS em 22/09/2026** (`8aef1b8`), estruturais — nenhum número de dinheiro e nenhuma fonte mudam. Passo 1: caracterização com o Supabase mockado, `useCustoMensal.test.ts` (14) e `registro-compras/hooks/useDespesaDoMes.test.ts` (8): janela do mês cortada em hoje (`intervaloDoMes`, `utils/periodo.ts:45-50`), produto sem compra = `null`, custo = Σvalor/Σlitros, rateio = despesa ÷ litros do encerrante, `posto_id` em toda consulta; os defeitos ficam fixados e marcados (despesa somada em float, D5, `.error` ignorado virando 0). Passo 2: nasce `hooks/custo-mensal.ts` (`calculaCustoMensal`, `:95-109`, 11 casos em `custo-mensal.test.ts`); o hook só busca (`useCustoMensal.ts:42-61`) e delega (`:65-70`), mesma assinatura. Canários: janela no mês civil → 2 vermelhos; `temDespesa` com `> 1` → vermelho nos dois testes. test:golden 3564/0 antes e depois. **Passos 3–6 FEITOS em 22/09/2026**, com as decisões do dono do mesmo dia (Q1–Q5). **3a** (`008e8ff`): Q1 opção (a) — o salto do encerrante NÃO ganha cópia em PHP; o `GET /dashboard` ganha o campo ADITIVO `leituras` (`bico_id`, dia em UTC, `leitura_inicial`, `leitura_final`, string decimal, ordem por bico, dia e id — `DadosDoPeriodo::leituras()`, `LeituraDoPeriodo`, `LeituraDoPeriodoResource`) e o Zod correspondente em `dashboard.api.ts`; `rateio.litros_vendidos` e `produtos[].litros_vendidos` seguem sendo Σ (Q2 some: a Visão do Proprietário não muda). Pest de forma, isolamento por posto, ordem e período vazio; canários: sem ORDER BY por dia e sem filtro de `posto_id` → vermelho. **3b** (`83fe974`): `custoMensalDaApi` em `custo-mensal.ts` (custo por `custoMedioCompra` sobre `produtos[].compras`, rateio por `despesaOperacionalPorLitro` com os litros de `encerranteMensal` sobre `leituras` — **D3** —, despesa em um `Number` quantizado por `emCentavos`, dia real em cada leitura, então sem a D5) e `custo-mensal.golden.spec.ts` (jan–jul de `posto_jorro_2026.sqlite`, `toBe` exato: custo = `media_lt`, rateio = despesa ÷ encerrante do Resumo Mensal, paridade com `calculaCustoMensal`, fevereiro em 0,4693 R$/L e não 0,6152). test:golden 3499 → 3536, 0 fail. Canários: litros pela Σ, sem `emCentavos`, `dia: 1`. **4a** (`cd3cfca`): `lerCustoDoMes` (mês civil) e o desvio em `useCustoMensal`; erro — inclusive o 403 de quem só tem `ver` (**Q3**) — vira custo indisponível (todo produto `null`, nunca 0, sem cair para o Supabase), com `erro` no retorno, e a aba Gestão de Bicos mostra "—" só nesse caso. A rota segue `gerir`. **4b** (`2cd963d`): no fallback Supabase só Compra e Despesa passam a `mesCivil` (**D1/D2**, também no mês corrente); a Leitura segue em `intervaloDoMes`. O hook ganha `provisorio` (true no mês corrente, **Q4**); a tela ainda não mostra a marca. **5a** (`34c57aa`): `useDespesaDoMes` lê `rateio.despesas_total` pela API (um `Number`, `emCentavos`), assinatura `number` mantida; em erro segura o último valor bom e expõe o erro (console e `useDespesaDoMesComErro`). **5b** (`8b705d9`): fallback Supabase de `useDespesaDoMes` no mês civil. **CA-7 fica sem objeto:** a P9 lê o `/dashboard` do FRONT e nenhuma classe PHP passou a depender de outro módulo; como a D3 foi feita pela opção (a), a regra do encerrante continua morando só em `@posto/utils` (sem ressalva de locality). **Base do golden:** medida 3499/0 na `pp-p9-api` antes dos passos 3–6 (o 3564 citado acima é anterior ao `0d0c9f3`). **Fica FORA desta fatia, registrado:** a D5 e a soma da despesa em float no fallback Supabase (`custo-mensal.ts` `calculaCustoMensal`, `useDespesaDoMes.ts`), que é o caminho de PRODUÇÃO enquanto a Vercel não define `VITE_API_URL`; o terceiro leitor com corte em hoje (`useCombustiveisHibridos.ts:141`); e as queries de `Despesa` copiadas (`use-resumo-mensal.ts:187`, `useDashboardEstoque.ts:69`, `useDashboardProprietario.ts:138`, `aiService.ts:57`, `use-planilha-do-banco.ts`). **Divergência nova entre telas:** o custo do fechamento diário rateia pelo encerrante (D3) e a Visão do Proprietário segue rateando pela Σ `rateio.litros_vendidos` (nos dois caminhos) — em fevereiro/2026, 0,4693 contra 0,6152 R$/L; alinhar é fatia própria, com golden. |
| P10 | Command `GravaFechamentoDoDia`, sem rota | sim (Fable) | **FEITA em 21/09/2026.** `App\Fechamento\Domain\{JanelaDeEscrita, TotaisDeclarados, RecusaDaGravacao}` e `App\Fechamento\Application\{DiaDeclarado, GravaFechamentoDoDia, GravaFilhosDoDia}`. Transacional (`DB::transaction`), nenhum arquivo acima de 146 linhas. O VO chama-se **`TotaisDeclarados`**, e não `TotaisDoDia` como a §3 previa: `totaisDoDia` já é a função canônica de `packages/utils/src/fechamento.ts:118` e faz outra coisa (calcula; o VO só confere). O Command **não recalcula** `conferido`, `total_vendas`, `total_recebido` nem `valor_cartao` — revalida SÓ `diferenca = total_vendas − total_recebido`, exata em centavos |
| P11 | rota PUT autenticada e troca de `handleSave` | sim (Fable) | **FEITA em 21/09/2026.** `PUT /api/postos/{posto}/fechamento`, `GravaFechamentoDoDiaRequest`, `FechamentoController::update`, `RespostaDaGravacao`. **A peça que faltava não virou classe nova:** em vez do alias `posto.gerir` que esta linha previa, o `ExigeAcessoAoPosto` passou a receber a habilidade **por parâmetro** (`posto.acesso:gerir`), decisão do dono em 21/09 — uma classe e um teste, em vez de dois. No painel: `enviarParaApi` (`base.ts`), `gravarFechamentoDoDiaNaApi` (`fechamento.api.ts`), o montador puro `montarDiaDeclarado.ts` e o legado extraído para `gravacaoLegadaSupabase.ts`. **Não pode ser ligada em produção:** nenhum `Usuario` tem `auth_user_id`, então o PUT responde 401 a todo login real, e a Vercel não tem `VITE_API_URL` |
| P12 | a tela INTEIRA pela API no modo API (`VITE_API_LOGIN=1`, sem sessão do Supabase) | não (transporte; nenhuma fórmula) | **FEITA em 25/09/2026** (`c4d5ce5` backend, `fdb1a74` painel). Rotas novas `GET /leituras/ultimas` e `GET /fechamento-mensal/{ano}/{mes}`; `GET /leituras` aceita `ate`. Remoção de envio vira `frentistas_conhecidos[]`; tempo real do Supabase desligado no login pela API com botão de recarregar; aba Receitas e Despesas avisa que não tem rota. Mapa, contratos e pendências na §5.3 |

Nada desta rodada é commitado sem revisão do dono. Nenhuma fórmula muda em fatia estrutural: quem
toca `calcLitros`/`calcVenda` (`useLeituras.ts:437-460`), a taxa (`useFechamento.ts:175-181`,
`usePagamentos.ts:161-176`), o `reduce` de `custo-mensal.ts:102` (até a P9 em `useCustoMensal.ts:96`) ou `totaisPorBalde`
(`fechamentoMeios.ts:245-257`) é o Fable, em tarefa própria, com golden antes.

## 1. Contexto — o que muda para quem está fora

Hoje o módulo `frontend/apps/web/src/components/fechamento-diario` (34 arquivos, legado do
strangler, fora do FSD) fala com o Supabase por sete services e, em `useCustoMensal.ts:42-61`,
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
| tests | `Feature/Fechamento/*`, canário Arch, vitest dos schemas, `apps/web/src/utils/venda-do-dia.golden.spec.ts` (P8) | ver Testes | — |

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
| I5 | ~~leituras do dia apagadas SEMPRE antes de tudo~~ → **UPSERT por `(bico_id, data)`, sem DELETE do dia** (mudou DE PROPÓSITO na P11, 21/09) | `GravaFilhosDoDia`; unique `leitura_unica_bico_data` (`01-esquema-base.sql:777`). É o que mata *salvar o dia apaga a leitura-base*: bico não declarado deixa de ser tocado. Efeito colateral aceito: limpar o campo de um bico na tela não apaga mais a linha dele. O caminho legado (`gravacaoLegadaSupabase.ts`) mantém o DELETE até o cutover |
| I6 | ~~`usuario_id = 1`~~ → **o `Usuario` autenticado**, pelo caminho da API (cumprida na P11, 21/09) | `GravaFechamentoDoDia`. O legado do Supabase segue gravando `1` até o cutover |
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

## 5. Contratos

### 5.1 No ar (P5, P6, P7) — descrição, não proposta

Todas sob `prefix('postos/{posto}')` com `['token.atual', DefinePostoAtual::class, 'posto.acesso']`,
nessa ordem (`routes/api.php:78-89`). Dinheiro e litros saem **string decimal**; balde não informado
sai `null`, nunca `'0.00'` (I8). Timestamp sai ISO-8601 Zulu.

```
GET /api/postos/{posto}/leituras?data=AAAA-MM-DD            → LeituraController@index
  → { data: [{ id, data, bico_id, combustivel_id, turno_id,
               leitura_inicial, leitura_final, litros_vendidos, preco_litro, valor_total }] }

GET /api/postos/{posto}/sessoes?data=AAAA-MM-DD             → FechamentoFrentistaController@index
  → { data: [{ id, fechamento_id, frentista_id,
               valor_dinheiro, valor_cartao, valor_cartao_debito, valor_cartao_credito,
               valor_pix, valor_nota, valor_moedas, baratao, baratencia,
               valor_conferido, encerrante, diferenca_calculada,
               observacoes, data_hora_envio }] }

GET /api/postos/{posto}/fechamento?data=AAAA-MM-DD          → FechamentoController@show
  → { data: null }            quando o dia não tem fechamento — 200, não 404
  → { data: { id, data, total_vendas, total_recebido, diferenca, status,
              observacoes, usuario_id, turno_id,
              recebimentos: [{ id, fechamento_id, forma_pagamento_id,
                               maquininha_id, valor, observacoes }] } }
```

**Onde o que subiu diverge da proposta original** — e por quê:

| proposta de 18/09 | o que subiu | razão |
|---|---|---|
| `/fechamentos/dia/{data}` | `/fechamento?data=` | o dia é **filtro**, não identidade de recurso: as três rotas passaram a ter a mesma forma, e o `DiaRequest` valida uma coisa só |
| `/fechamentos-frentista?data=` | `/sessoes?data=` | "sessão do frentista no dia" é o nome que o domínio usa; o nome da tabela não é contrato |
| dia sem fechamento → (não dito) | **200 com `data: null`** | 404 faria o cliente distinguir rota errada de dia em branco, e dia em branco é estado normal |
| campos de dinheiro | mais `id`, `turno_id`, `status`, `usuario_id`, `observacoes`, `baratencia`, `data_hora_envio` | a P11 precisa deles para reescrever a linha; omiti-los agora custaria uma segunda ida ao banco |

### 5.2 No ar desde 21/09 (P10, P11) — era proposta até a fatia subir

```
GET /api/postos/{posto}/leituras/ultimas?antes_de=AAAA-MM-DD      (no ar desde 25/09 — §5.3)
  → uma linha por bico (hoje o cliente dedupa de um limit 200, leitura.service.ts:186-214)

PUT /api/postos/{posto}/fechamento?data=AAAA-MM-DD       (P11 — policy 'gerir', que não tem middleware)
  { leituras: [...],
    sessoes: [...7 baldes, encerrante, valor_conferido, diferenca_calculada],
    frentistas_conhecidos: [id],        ← §7 (c): apaga só dentro do conjunto declarado
    recebimentos: [...],
    totais: { total_vendas, total_recebido, diferenca },
    observacoes }
  → revalida SÓ diferenca = total_vendas − total_recebido em centavos; tudo em DB::transaction;
    resposta é o Fechamento gravado. Erro: { erro: { codigo, mensagem, campos? } }.
```


Frontend: cada `*.api.ts` exporta função com tipo de entrada explícito e `ResultAsync<T, ErroDaApi>`
de saída, `T = z.infer` do schema; dinheiro vem string e só vira número em centavos via
`@posto/utils` (a conversão é do Fable). Filtro `ativo === true` aplicado no cliente para bicos,
frentistas e formas de pagamento.

**Dívida de esquema, agora MEDIDA (20/09) e maior do que esta linha dizia.** Não são dois casos, são
**cinco uniques em tabela de tenant sem `posto_id`** — varridos do catálogo, não de lista escrita à mão:
`Fechamento (data, turno_id)`, `Estoque (combustivel_id)`, `Configuracao (chave)`,
`Fornecedor (cnpj)`, `Frentista (cpf)`. Como `turno_id` é sempre `1`, **dois postos não conseguem
fechar o mesmo dia**: o banco recusa o segundo cliente. `Recebimento` sem `posto_id` é caso à parte e
está OK — é escopado pelo pai (`fechamento_id`), e o gate de tenant exige essa declaração
(`tests/Feature/Arquitetura/EscopoDeTenantTest.php`). Quatro outros uniques passam pela mesma razão:
`Bico`, `Escala`, `FechamentoFrentista`, `Leitura`. A migration que conserta os cinco é **DDL contra
produção** e espera o "vai" do dono; enquanto não entrar, tudo que se construir sobre multi-tenant
está sobre um banco que só atende um posto.

### 5.3 No ar desde 25/09 (P12) — a tela inteira sem Supabase no modo API

"Modo API" aqui é o login pela API (`VITE_API_LOGIN=1` + `VITE_API_URL`): não existe sessão do
Supabase, e qualquer consulta a ele volta vazia ou com erro. A prova é
`fechamento-de-caixa-pela-api.test.tsx`: monta a tela inteira, percorre as cinco abas (inclusive a
visão Mês do Detalhamento), recarrega, remove um envio e salva — com o client do Supabase lançando em
qualquer acesso. As leituras de dado trocam por `urlDaApi()` (como P4–P11: ler e gravar da mesma
fonte); o tempo real e a aba sem rota trocam por `loginPelaApiLigado()`, porque com login no Supabase
(o ensaio de 27/09) os canais e a aba continuam funcionando.

| Onde | Antes (Supabase) | Agora (modo API) |
|---|---|---|
| cadastro: bicos, frentistas, formas de pagamento | `bicoService`, `frentistaService`, `formaPagamentoService` | `GET /bicos`, `/frentistas`, `/formas-pagamento` (P4a/P4b) |
| leituras do dia | `leituraService.getByDate` | `GET /leituras?data=` (P5) |
| encerrante inicial de dia novo | `leituraService.getLastReading` (limit 200 + dedupe no cliente) | **`GET /leituras/ultimas?antes_de=`** (novo) |
| envios do dia | `fechamentoFrentistaService.getByDate` | `GET /sessoes?data=` (P6) |
| recebimentos do dia | `fechamentoService.getDoDia` + `getWithDetails` | `GET /fechamento?data=` (P7) |
| Salvar | `gravacaoLegadaSupabase.ts` (~8 idas, sem transação) | `PUT /fechamento?data=` (P11) |
| lixeira do envio | `fechamentoFrentistaService.delete` na hora | **nada na hora**: `frentistas_conhecidos[]` no PUT (`remocao-de-sessao.ts`) |
| marca `[CONFERIDO]` | `fechamentoFrentistaService.update` na hora | `observacoes` da sessão, no PUT |
| custo do mês (Gestão de Bicos) | 3 consultas diretas | `GET /dashboard` (P9; operador recebe 403 → "—") |
| Detalhamento › Mês | `fechamentoFrentistaService.getByPeriodo` (join `Frentista`) | `GET /sessoes?data=&ate=` + `GET /frentistas` (nomes, inativos inclusive) |
| Fechamento Mensal: resumo diário | RPC `get_fechamento_mensal` | **`GET /fechamento-mensal/{ano}/{mes}`** (novo) — **sem lucro** |
| Fechamento Mensal: encerrantes | `leituraService.getByDateRange` (join `Bico`) | `GET /leituras?data=&ate=` + `GET /bicos` (inativos inclusive) |
| Fechamento Mensal: "dados pendentes" | `leituraService.getByDateRange` | `GET /leituras?data=&ate=` |
| tempo real (3 canais: `FechamentoFrentista`, `Leitura`, `Fechamento`) | `supabase.channel` | **desligado** + aviso e botão "Recarregar do servidor" (`useTempoRealDoFechamento`) |
| aba Receitas e Despesas | `despesaService`, `despesaFixaService`, `receitaService`, `recebimentoService`, `compraService`, `categoriaService` | **sem rota no Laravel**: a aba avisa (`AbaForaDaApi`) e não chama nada |

```
GET /api/postos/{posto}/leituras/ultimas?antes_de=AAAA-MM-DD   → LeituraController@ultimas
  → { data: [ LeituraResource… ] }    uma por bico: a mais nova com data < antes_de 00:00Z,
                                       DISTINCT ON (bico_id) ORDER BY data DESC, id DESC
GET /api/postos/{posto}/leituras?data=AAAA-MM-DD&ate=AAAA-MM-DD → LeituraController@index
  → o período [data 00:00Z, ate+1 00:00Z); `PeriodoRequest` (ex-`SessoesRequest`), teto de 62 dias
GET /api/postos/{posto}/fechamento-mensal/{ano}/{mes}          → AgregacaoController@fechamentoMensal
  → { periodo: {inicio, fim},
      dias: [{ data, volume_total, faturamento_bruto,
               volumes_por_combustivel: { "<combustivel_id>": "<litros>" }, status }] }
     um dia por dia com Leitura; status = do Fechamento mais recente do dia, 'ABERTO' sem fechamento
```

As três no grupo protegido (`token.atual` → `DefinePostoAtual` → `posto.acesso`, habilidade `ver`),
com isolamento em `FechamentoDeCaixaPelaApiTest` (sem token 401, gerente do Jorro 403 no BR, operador
vê e não grava). `/fechamento-mensal` não leva custo nem despesa, por isso `ver` e não `gerir`.

**Paridade com a RPC** (`FechamentoDeCaixaPelaApiTest`): volume, faturamento, litros por combustível
e status batem. Duas diferenças, nomeadas: a RPC repete o dia uma vez por `Fechamento` do dia (LEFT
JOIN), a API devolve o dia uma vez com o status do mais recente; e a API **não** devolve
`lucro_bruto`/`custo_taxas`/`lucro_liquido`. O painel classifica os litros nos 4 baldes do gráfico
pela MESMA regra de nome da RPC (`baldesDoCombustivel`), e mostra o lucro como "—".

**Pendências para o dono (nenhuma decidida aqui):**

1. **Lucro da aba Fechamento Mensal pela API.** A RPC mostra `bruto − taxas` diário com `preco_custo`
   de hoje, taxa chumbada e sem despesa (`agregacao.md` §0, DECISÕES 3 e 4). Pela API o card fica "—".
   Opções: (a) o lucro do mês pelo canônico (`lucro.ts`, custo do mês + despesa rateada), sem série
   diária; (b) manter "—" até a aba ser redesenhada; (c) outra.
2. **Aba Receitas e Despesas** precisa de módulo próprio no Laravel (escrita de `Despesa`, lançamento
   de fixas e de taxas de cartão, `Receita`, leitura de `Compra`/`Recebimento`). Fatia separada.
3. **Remover um envio agora só vale ao Salvar** (antes apagava na hora). Recarregar antes de salvar
   devolve a linha à tela. É o desenho da §7 (c); confirmar que é o comportamento desejado.

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
| (d) ✅ | **Qual `total_vendas` vale** — **DECIDIDA em 20/09/2026** (abaixo) | **desde 22/09/2026 (P8)** o painel tira a venda do encerrante: `useFechamento.ts:103-105` chama `vendaDoDiaPeloEncerrante` (`apps/web/src/utils/venda-do-dia.ts:63-79`), que soma por `totalVendasDoEncerrante` (`packages/utils/src/leitura.ts:77-83`), em centavos a cada parcela, e devolve `null` com menos bicos lidos que ativos. O `api-core` segue gravando por `totaisDoDia` (`fechamento.ts:118-138`; `encerrante.ts:621-650`). O servidor não tem `POST /consolidar` (a rota de `fase-a-laravel.md:91` não existe em `backend/routes/api.php`); quem confere é o `PUT /fechamento` (`routes/api.php:93`), que revalida só `diferenca = total_vendas − total_recebido` em centavos — e `montarDiaDeclarado.ts:134-152` manda os dois já quantizados. Coberto por `venda-do-dia.golden.spec.ts` (31 dias de janeiro, entrada = saída do pacote) e `useFechamento.test.ts:126-141` (I8). Até 22/09 era `calcularTotais` (float, apagado em `0d0c9f3`) | decidido: vale o `total_vendas` do **encerrante**. **Aplicado na P8 (22/09/2026)** | nada |
| (e) ✅ | **Janela de escrita real** — **MEDIDA em 20/09/2026, não precisa de decisão** | **Produção e esquema local são IDÊNTICOS**, conferido no `pg_proc` do Supabase: `SELECT quando >= DATE '2025-12-31' AND quando < (CURRENT_DATE + INTERVAL '2 days')`. As memórias que falavam em **7 dias** e em **1,5 mês** estavam as duas erradas | o Command copia literalmente: `>= 2025-12-31` e `< CURRENT_DATE + 2 dias`. ⚠️ `CURRENT_DATE` depende do fuso da sessão — em produção é UTC, e a conexão do Laravel foi fixada em UTC (`cebfad3`), então batem. Encurtar a janela é issue separada (`fechamento-frentista-api.md` §5) | P10 deixa de esperar por (e) |
| (f) ✅ | **Contratos do §5** — **RESOLVIDA em 20/09/2026, por transcrição** | a §5 foi escrita como *proposta*, antes de existir rota. Enquanto ela esperava aprovação, P5, P6 e P7 subiram e passaram a servir o painel: a forma final deixou de ser uma escolha em aberto e virou **fato observável em código e em teste** | não há o que aprovar: a §5 foi **reescrita para descrever o que subiu**, e as divergências contra a proposta estão listadas lá. Decidir de novo seria decidir contra 150 testes verdes. O que a §5 ainda propõe — `/leituras/ultimas` e o `PUT` da P11 — segue proposta, e está marcado como tal | nada: P5–P7 já entregues; a P11 carrega o resto |

### DECISÃO (dono, 20/09/2026): o `total_vendas` que vale é o do ENCERRANTE

Motivo, como ele colocou: *"quem manda é o encerrante"*. O encerrante é o medidor **físico e acumulado**
do bico — um número só, independente de quantas pessoas passaram por ele. O fechamento recebe **vários
envios diferentes, de frentistas diferentes**, alimentando o mesmo encerrante; somar os envios seria
somar relatos parciais sobre o mesmo bico, e o total sobra ou falta conforme quem deixou de enviar. O
encerrante não tem esse modo de falha.

Consequências a registrar:

- A fatia **P8** esperava exatamente a (d) e **foi feita em 22/09/2026** (`5436b4c`, `c2368cd`,
  `0d0c9f3`): golden antes (o helper nasceu provado e sem call site), troca depois, e a somadora
  antiga apagada para não sobrar uma segunda fonte de venda no painel.
- O que a P8 **não** fez: a entrada da venda continua sendo `bico.combustivel.preco_venda`, o preço
  de HOJE. Reabrir janeiro/2026 no painel ainda mostra R$ 23.784,56 a mais que a planilha — é
  divergência de **preço**, não de soma, e trocá-la é outra decisão de dinheiro.
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
- **P8 (feita em 22/09):** `apps/web/src/utils/venda-do-dia.golden.spec.ts` verde antes da troca
  (`5436b4c`) e depois dela (`c2368cd`, test:golden 3564/0; após `0d0c9f3`, 3499/0);
  `useFechamento.test.ts:87-124` (sinal) e `:126-141` (I8) verdes. Canário rodado em 22/09: soma
  em float → 95 vermelhos, sem `null` → 31 vermelhos, restaurado → verde.
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
- ✅ ~~**O passo 5 grava `0` em `total_vendas`, nunca `null`**~~ — **corrigido em 22/09/2026 (P8,
  `c2368cd`)**, por decisão do dono de 21/09: a fonte passou a devolver `null` no dia não apurado e
  o caminho legado grava esse `null` (`gravacaoLegadaSupabase.ts:232`), como o `fechamento.service`
  e o `api-core`. ⚠️ **Resta:** nesse caminho a `diferenca` do dia não apurado continua gravada
  `0`, não `null` (`gravacaoLegadaSupabase.ts:230,234`); só o caminho da API manda o par nulo.
- ⚠️ **Nada da gravação é transacional hoje.** São 6 chamadas soltas ao PostgREST; falha no meio
  deixa o dia meio-gravado, e o pior caso (falha no passo 3) apaga o caixa dos frentistas inteiro
  sem reinserir. A transação do Command é ganho real da migração, sem mudar conta nenhuma.

- ⚠️ **Escrita sem identidade é porta aberta**: o PUT apaga e regrava o dia inteiro. P10 entra sem
  rota de propósito; P11 só depois da #102. Nenhuma "rota temporária".
- ⚠️ **Duas fórmulas de `total_vendas`/`diferenca` para a mesma coluna** (painel × api-core) —
  **a SOMA convergiu na P8 (22/09/2026)**: o painel soma por `totalVendasDoEncerrante`, em
  centavos a cada parcela, e o golden novo prova que dá o mesmo número do pacote nos 31 dias de
  janeiro (asserção c). **O que continua divergindo é a ENTRADA:** o painel multiplica pelo
  `preco_venda` de hoje, o `api-core` soma o `valor_total` já gravado em cada `Leitura`. Reabrir
  dia passado no painel ainda regrava venda a preço de hoje.
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
