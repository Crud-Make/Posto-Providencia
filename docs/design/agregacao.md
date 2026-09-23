# Agregação — Design Doc

Issue: #100 (mãe: #60) · Estado: **aprovado** (dono, 18/09/2026) · Data: 17/09/2026 · Revisado: 18/09/2026 (§2 e §3 alinhados à CA-7; §4–§5: rateio no mês civil; fatia 2: o painel lê o endpoint — §1, §3, §4 Fluxo, §5, Testes e Riscos)

> A issue que tira a fórmula de lucro de dentro do banco. Não é migração mecânica: as RPCs de hoje
> **não calculam a mesma coisa entre si**, e portar qualquer uma "como está" carimba um número errado.
> Fonte da regra: `frontend/packages/utils/src/lucro.ts` (18 golden masters) e a skill
> `fechamento-posto-providencia`. Fonte dos tipos: `banco/init/01-esquema-base.sql`.

## 0. O achado — três fórmulas, não duas

| | `lucro.ts` (canônico, com golden) | `get_dashboard_proprietario` | `get_fechamento_mensal` (legado) |
|---|---|---|---|
| Custo do litro | custo médio de compra **do período** | custo médio **do mês da leitura** | `Combustivel.preco_custo` (preço de **hoje**) |
| Produto vendido sem compra | total vira **`null`** (não apurável) | cai em `preco_custo`, **em silêncio** | — |
| Taxa de cartão | dentro das despesas do mês | dentro das despesas (`custo_taxas = 0`) | **chumbada** 1,2 % / 3,5 % por `ILIKE` |
| Lucro líquido | `venda − custo − despesas` | `luc_bruto − despesas` | `luc_bruto − custo_taxas` (**sem despesas**) |
| Combustível | por produto real | por `combustivel_id` | `ILIKE` em 4 nomes — o 5º zera em silêncio |

`get_dashboard_proprietario` já foi corrigida e está **perto** do canônico; o desvio que sobra é o
fallback silencioso. `get_fechamento_mensal` está errada em quatro eixos ao mesmo tempo e é a fonte
do desvio medido em `duas-formulas-de-custo-divergem-no-mes`: **até R$ 2.582 no mês, R$ 132,69 no ano**.

## 1. Contexto — o que muda para quem está fora

Para o dono, nada deveria mudar em `/proprietario`. Em `/fechamento-mensal` **o lucro líquido vai
mudar de valor**, porque a tela hoje mostra um número que não desconta despesa. Isso não é regressão
desta issue — é a issue parando de mentir. Precisa ser avisado antes, não descoberto na tela.

**Fatia 2 (18/09/2026) — o que o dono vê no `/dashboard` do painel:** a troca de fonte só acontece onde
`VITE_API_URL` está definida (hoje `localhost`; a Vercel não a define, então a produção segue no
Supabase até o cutover). Dentro de um mês o número é o mesmo pelas duas fontes (paridade provada em
teste). Em período que atravessa meses o lucro **muda** e a legenda do card "Lucro Estimado" avisa
(`Custo e despesa de jan–fev/2026`). Se a API falhar, o dashboard mostra erro (`FETCH_ERROR`) em vez
de cair no Supabase — **escolha registrada**: um fallback silencioso esconderia a API quebrada atrás do
número antigo, e o strangler perderia o sinal. Em `localhost` a tela é **mista**: venda, compra e
rateio do Postgres local; estoque, frentistas, formas de pagamento e fechamentos da produção.

## 2. Subsistema

`App\Agregacao` — modelo **só de leitura**, sem escrita, sem Command. Lê as tabelas (`Leitura`,
`Compra`, `Despesa`, `Combustivel`, `Fechamento`, `Recebimento`) com o **query builder**
(`DB::table`, `SUM`/`GROUP BY` no Postgres), sem importar model de nenhum módulo.

Por quê (decisão do dono, 18/09/2026): a regra do `fase-a-laravel.md` §2 — módulos só se falam por
`Application` — **não ganha exceção** (CA-7). A versão anterior deste parágrafo dizia "consome
`App\Cadastro\Domain`", o que seria `Agregacao → Cadastro\Domain`. E `Leitura`, `Compra` e
`Despesa` pertencem a módulos que ainda não existem (Fechamento, Financeiro), então não há
`Application` deles para chamar. Agregado de leitura sobre tabela é o caminho que cumpre a regra: o
contrato de dado é o esquema (`banco/init/01-esquema-base.sql`), não a classe de outro módulo.

No mapa do Pest Arch (`direcaoPermitidaEntreModulos()`), `Agregacao => []`.

## 3. Componentes

- `App\Agregacao\Application\DadosDoPeriodo` — monta o agregado bruto por produto. **Não calcula lucro.**
- `App\Agregacao\Application\DadosDoMes` — o mesmo, quebrado por dia.
- `App\Agregacao\Http\Controllers\AgregacaoController` + `App\Agregacao\Http\Resources\*` (layout
  modular `App\<Modulo>\{Http,Application,Domain}`; não existe `App\Http\Controllers` de módulo).
- Nada em `Domain`: não há entidade nova, só leitura agregada sobre as tabelas existentes.
- Quem escreve código que soma ou calcula dinheiro, aqui e no `aggregator.service.ts`, é o **Fable**
  (decisão do dono, 18/09/2026; hook `so-fable-na-formula.py`).
- **Lado do painel (fatia 2):** `frontend/apps/web/src/services/api/dashboard.api.ts` — schema Zod do
  §5 (string decimal, sem envelope `data`), `lerDashboardDaApi()` em `ResultAsync<DashboardDaApi, ErroDaApi>`
  e `paraInsumosDeAgregacao()`, que só faz `Number()` e reshape. Em `aggregator.service.ts`,
  `insumosDaApi()` combina o endpoint com o cadastro de combustíveis (Supabase, só para `id → codigo`)
  e devolve `ResultAsync<InsumosDeAgregacao, ErroDaApi | { tipo: 'cadastro' }>`; `fetchDashboardData`
  consome com `isErr()` — sem `throw` na regra. A legenda do card ("Custo e despesa de jan–fev/2026")
  é lógica pura em `components/dashboard/rotulos.ts`, com teste.

## 4. Comportamento

### DECISÃO 1 — o endpoint **devolve dado bruto**; quem calcula é `packages/utils`

A issue deixou em aberto e a resposta é firme: **devolver dado**. Calcular em PHP criaria a
**quarta** implementação da fórmula de dinheiro, com zero golden master do lado PHP contra 18 do lado
TS. A skill nomeia exatamente esse modo de falha — *"a NEW copy of the formula being born inside a
hook or a service"*. A Fase A é migrar a API, não reescrever a fórmula.

Consequência: o endpoint entrega `litros_vendidos`, `receita` e `compras` por produto, mais o
`rateio` (despesa e litros do mês civil), e `custoLitrosVendidos()` + `despesaOperacionalPorLitro()`
+ `lucroCombustivel()` seguem sendo a autoridade, com os goldens que já existem cobrindo-os. O
cliente faz `despesaOperacionalPorLitro(Number(rateio.despesas_total), Number(rateio.litros_vendidos))`;
**o PHP não divide**.

### DECISÃO 2 — produto vendido sem compra no mês: **nenhuma das duas**. É custo informado.

Conferido na planilha em 17/09 (célula e fórmula em [`docs/planilha-formulas.md`](../planilha-formulas.md) §2).
O caso acontece **uma vez em 2026**: fevereiro, Ds.10, bico 04.

E a planilha **não resolve com fórmula** — o dono digitou uma compra simbólica de `1` litro por
`R$ 5,00` (`D50`, `E50`), e `F50 = E50/D50` devolveu custo de R$ 5,00/L naquele mês.

| Hipótese | A planilha faz isso? |
|---|---|
| Deixa vazio / `null` | **não** |
| Dá erro `#DIV/0!` | **não** (embora não tenha guarda nenhuma — zero `IFERROR` em 24.543 fórmulas) |
| Zera | **não** |
| Arrasta o custo do mês anterior | **não** — janeiro foi 5,38; fevereiro ficou 5,00 |
| Usa `preco_custo` do cadastro | **não** — número que a planilha nunca usou |

**O modelo real é um custo informado pelo usuário, por mês e por produto.** Ou seja: nem o `null` de
`custoMedioCompra` (que perde o mês inteiro), nem o fallback da RPC (que inventa o preço de hoje).

**Consequência para esta issue:** o endpoint devolve os dados como estão — litros vendidos e compras
do período, inclusive quando não há compra. Quem decide o que fazer com a lacuna é a camada de
cálculo, e o comportamento correto a implementar é **aceitar um custo informado**. Como `lucro.ts`
hoje devolve `null`, isso é **divergência conhecida contra a planilha** e vira issue própria — não
se resolve aqui, e **não se "conserta" trocando `null` por `preco_custo`**, que seria trocar um erro
por outro.

### DECISÃO 3 — a taxa de cartão não volta como coluna. **Confirmado na planilha, com célula.**

O caminho que vira dinheiro é único e está em
[`docs/planilha-formulas.md`](../planilha-formulas.md) §3c:

```
C294 / D294:O294  (literais)  →  D321  →  I16 "Desp,Mês"  →  I19 = I16/F11  →  G16 = F16+I19
```

A taxa chega ao lucro **uma vez só, diluída no custo por litro**. A taxa calculada por transação
existe em todo bloco de dia (`I19`/`N10`), mas **não é referenciada por fórmula nenhuma** — é
conferência. E o `Total Liquido` do mês 01 (`J1138`) é beco sem saída, não existe nos meses 02–08.

O endpoint **não devolve `custo_taxas`**. A taxa existe uma vez, dentro de `rateio.despesas_total`.
A coluna morre junto com a RPC.

### DECISÃO 4 — o endpoint diário **não expõe lucro líquido**. A planilha não tem esse conceito.

Varredura de rótulos em todas as abas diárias: **nenhum rótulo com "lucro" dentro de bloco de dia**.
O bloco `Caixa Dia NN` vai até `Concentrador x Frentista` e acaba. Lucro só existe **por mês e por
bico** (`I5 = G5-G16`, `J5 = I5*F5`), e já nasce líquido de despesa.

Logo o `lucro_liquido` diário da `get_fechamento_mensal` não tem contrapartida na planilha em
**nenhuma** leitura: nem como conceito diário, nem como "bruto − taxas" (na planilha a taxa é
despesa rateada por litro, não dedução da receita).

O que tem lastro diário: litros, venda por bico, conferido, `diferenca` e a taxa calculada. **Lucro,
só mensal.**

### Fluxo

```
GET /api/postos/{posto}/dashboard?inicio&fim   (Authorization: Bearer <access_token do Supabase>)
  → token.atual (401 sem token, token inválido ou sub sem Usuario ativo)
  → DefinePostoAtual (404 se posto não existe)
  → posto.acesso + posto.acesso:gerir (403 se o usuário não GERE o posto)
  → DadosDoPeriodo: agrega a VENDA (Leitura) por combustivel_id no período exato; Compra do MÊS
    CIVIL que contém o período, por combustivel_id (§5); rateio = Despesa (competência) E litros de
    todos os combustíveis, os dois somados no MESMO mês civil — nenhuma divisão no PHP
  → Resource (dinheiro em string decimal, nunca float)
  → painel (fatia 2, com VITE_API_URL): lerDashboardDaApi() valida com Zod → paraInsumosDeAgregacao()
    → insumosDaApi() junta o `codigo` do cadastro → fetchDashboardData: custoMedioPorCombustivel()
    → despesaOperacionalPorLitro() → lucroCombustivel() — as mesmas funções do caminho Supabase;
    Err da API ou do cadastro → ApiResponse FETCH_ERROR, sem cair no Supabase
```

## 5. Contratos

`GET /api/postos/{posto}/dashboard?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`

### Autorização (#103, 22/09/2026)

A rota mora no grupo protegido de `backend/routes/api.php` (`token.atual` → `DefinePostoAtual` →
`posto.acesso`) e sobe a habilidade para **`posto.acesso:gerir`**, no mesmo padrão do
`PUT /fechamento` da P11. **Decisão do dono em 22/09/2026: custo e despesa do posto são dado de
proprietário.** Por isso não basta `ver`: operador vinculado vê o dia (`GET /leituras`) e leva 403
no dashboard. Quem gere é `PostoPolicy::gerir`: Admin (em qualquer posto, sem vínculo) ou vínculo
ativo em `UsuarioPosto` com papel `admin` ou `gerente` (`PapelNoPosto::gerencia()`).

| Situação | Código |
|---|---|
| Sem token, token inválido/expirado, `sub` sem `Usuario` ativo | 401 (antes de olhar posto ou período) |
| Token válido, posto inexistente ou id não numérico | 404 |
| Operador vinculado; gerente de outro posto; vínculo desligado | 403 |
| Token válido e período inválido | 422 (só depois de passar pela porta) |
| Admin, ou gerente/admin vinculado ao posto | 200 com o corpo abaixo |

Presos em `backend/tests/Feature/Agregacao/AcessoAoDashboardTest.php`, com canário: rota de volta ao
grupo público deixa 5 casos vermelhos; `gerir` trocado por `ver` deixa vermelho o do operador. O
`DashboardTest` autentica como Admin e prova só o conteúdo. O painel não mudou: `base.ts` já manda o
Bearer desde a P5, e 401/403 da API viram `FETCH_ERROR` sem cair no Supabase
(`aggregator.dashboard.test.ts`). **Pré-requisito para ligar `VITE_API_URL` em ambiente real:**
`Usuario.auth_user_id` vinculado (em produção, nenhum Usuario tem; no compose, o admin tem).

```json
{
  "periodo": { "inicio": "2026-01-01", "fim": "2026-01-31" },
  "produtos": [
    { "combustivel_id": 1, "produto": "GASOLINA COMUM",
      "litros_vendidos": "12345.678", "receita": "74074.07",
      "compras": { "litros": "15000.000", "valor_total": "82500.00" } }
  ],
  "rateio": {
    "mes_civil": { "inicio": "2026-01-01", "fim": "2026-01-31" },
    "despesas_total": "22158.46",
    "litros_vendidos": "45678.901"
  },
  "leituras": [
    { "bico_id": 1, "data": "2026-01-01", "leitura_inicial": "1716778.963", "leitura_final": "1717451.532" }
  ]
}
```

**`leituras` — campo aditivo da #103 P9 (decisão do dono, 22/09/2026, Q1 opção a).** As linhas cruas
de `Leitura` do PERÍODO EXATO (`bico_id`, dia em UTC, os dois encerrantes em string de escala 3), em
ordem de bico, dia e id (`DadosDoPeriodo::leituras()`). Existe para o cliente rodar `encerranteMensal`
(`packages/utils/src/encerrante-mensal.ts`) sobre os litros do rateio do custo do mês do fechamento
diário (`custoMensalDaApi`, D3: litros pelo salto do encerrante). O servidor **não** calcula o salto:
seria uma segunda cópia da regra (DECISÃO 1). **Nenhum campo existente mudou de significado:**
`rateio.litros_vendidos` e `produtos[].litros_vendidos` continuam sendo Σ `Leitura.litros_vendidos`,
e a Visão do Proprietário continua usando essa Σ (em fevereiro/2026 ela rateia a 0,6152 R$/L e o
fechamento diário, pelo encerrante, a 0,4693 — divergência registrada, alinhar é fatia própria). Presos
em `DashboardTest` (bloco `leituras`: forma, isolamento por posto, ordem com linhas gravadas fora de
ordem, período vazio), com canários.

Não existe `despesas_total` na raiz: o bloco `rateio` cola a janela, a despesa e os litros no mesmo
lugar, para que nenhum cliente divida despesa de um mês por litros de um período (o campo solto
convidava a isso; `DashboardTest` afirma a ausência).

**Decisões do dono em 18/09/2026** (fatia 1 implementada em `App\Agregacao`, `DadosDoPeriodo`):

- **Envelope:** o contrato acima é a raiz do JSON — sem `data` (`DashboardResource::$wrap = null`).
- **Quais produtos entram:** todo combustível que teve venda **ou** compra na janela. Produto só
  com compra sai com `litros_vendidos = "0.000"` e `receita = "0.00"`; `custoLitrosVendidos()`
  ignora litros 0. Ordem: `Combustivel.nome`, depois `id`.
- **Produto vendido sem compra:** `compras` sai zerado — `{"litros": "0.000", "valor_total": "0.00"}`,
  nunca `null` e nunca `preco_custo` (DECISÃO 2). `custoMedioCompra([{0, 0}])` já devolve `null`.
- **Janela da compra E do rateio = mês civil que contém o período:** `[dia 1 do mês de inicio,
  último dia do mês de fim]` (`Periodo::mesCivil()`). Só a **venda por produto** fica no período
  exato. Decisões 1 e 2 do dono, 18/09/2026: despesa do mês ÷ litros do mês, igual à tela de hoje
  (`aggregator.service.ts:43-61`, `despesaOperacionalMensal`) e à planilha (`H22 = H19/F11`); compra
  do mês, igual a `mesCivil(dataInicio)` (`aggregator.service.ts:256-264`) e a `F16 = E16/D16`.
  Quando `inicio` e `fim` caem no mesmo mês, é idêntico ao de hoje.
- **Divergência decidida** (era "nomeada, não decidida"): o `/dashboard` do painel usa `Calendario`
  em `modoIntervalo`, sem trava de mês, então um período que atravessa meses é possível. O aggregator
  de hoje usa **só o mês de `dataInicio`** para a compra e para o rateio (`aggregator.service.ts:251`
  `mesDoRateio`, `:256` `mesDoCusto`, `:263-264`; `utils/periodo.ts:62-65` recebe UMA data). O
  endpoint usa **todos os meses civis** que o período toca. Logo, em período que atravessa meses, a
  troca do call site **vai mudar número na tela** — por decisão do dono, não por regressão; ele tem
  de ser avisado antes de ver a tela. A frase "a troca do call site não pode mudar nenhum número na
  tela" vale **só para período dentro de um mês**. Regra presa em `DashboardTest` ("período que
  atravessa meses": compras 8000.000/46800.00, despesas 2749.50, litros 1900.500).
- **Paridade com a RPC só no mês cheio:** `get_dashboard_proprietario` filtra a despesa no período
  exato (`01-esquema-base.sql:1166-1167`); o teste de paridade de despesa bate porque
  `PERIODO_JANEIRO` é mês cheio. Para período menor que um mês os dois divergem por decisão.
- **Escala:** `compras.litros` sai com escala 3 (como o exemplo acima) embora `Compra.quantidade_litros`
  seja `numeric(15,2)`; `litros_vendidos` já é `numeric(15,3)`. Reais sempre escala 2. Tudo cast
  no SQL (`::numeric(18,3)` / `::numeric(18,2)`) e entregue como string pelo PDO — zero float.

**Campo a campo, quem consome** (fatia 2, 18/09/2026: o `/dashboard` do painel já lê o endpoint quando
`VITE_API_URL` existe — `services/api/dashboard.api.ts` valida com Zod e faz o reshape em
`paraInsumosDeAgregacao`; `aggregator.service.ts` consome `InsumosDeAgregacao` sem saber a fonte):

| Campo do contrato | Caminho Supabase (`aggregator.service.ts`, `insumosDoSupabase`) | Caminho API (`dashboard.api.ts` → `insumosDaApi`) | Função canônica (`packages/utils/src/lucro.ts`) |
|---|---|---|---|
| `produtos[].litros_vendidos` | `acc[codigo].litros` das leituras | `Number()` → `VendaPorCombustivel.litros`; `Σ` → `kpis.totalVolume` e `fuelData[].volume` | `lucroCombustivel` via `litros` — o dashboard **não** usa `custoLitrosVendidos` (essa é a `/analise-custos`) |
| `produtos[].receita` | `acc[codigo].valor` das leituras | `Number()` → `VendaPorCombustivel.valor`; `Σ` → `kpis.totalSales` | `precoVenda = valor / litros` dentro do laço de lucro |
| `produtos[].compras.{litros,valor_total}` | `compraService.getByDateRange(mesCivil(dataInicio))` | `Number()` → `CompraParaCusto` (um por produto, `0/0` quando sem compra) | `custoMedioPorCombustivel` (`services/custo-do-mes.ts`) → `custoMedioCompra`; `null` → `produtosSemCompra` |
| `rateio.despesas_total` | `despesaService.getByMonth` → `totalDespesas` | `Number()` → `rateio.despesasTotal` | `despesaOperacionalPorLitro`, 1º argumento |
| `rateio.litros_vendidos` | `Leitura` do mês inteiro, sem filtro de combustível → `totalLitros` | `Number()` → `rateio.litros` | `despesaOperacionalPorLitro`, 2º argumento |
| `rateio.mes_civil` | `mesCivil(dataInicio)` — só o mês de `inicio` | `janelaDoRateio` → `kpis.janelaDoRateio` → legenda do card "Lucro Estimado" | — (`Periodo::mesCivil()`, `Periodo.php`) |
| `produtos[].produto` | `bico.combustivel.nome` | `fuelData[].name` | — |
| `leituras[]` (#103 P9) | não lê — o dashboard do proprietário rateia por `rateio.litros_vendidos` | não lê; quem lê é `custoMensalDaApi` (`fechamento-diario/hooks/custo-mensal.ts`), via `lerCustoDoMes` | `encerranteMensal` → `despesaOperacionalPorLitro`, 2º argumento (D3) |

**Fatia 2 — decisões registradas (18/09/2026):**

- **Cor do combustível vem do cadastro, não da API.** `fuelData[].color = corDoProduto(codigo)` precisa do
  `codigo`, que `ProdutoAgregadoResource` não devolve. Com `VITE_API_URL`, `insumosDaApi` lê
  `combustivelService.getAll(postoId)` (Supabase) só para o mapa `id → codigo`; combustível fora do
  cadastro cai em `corDoProduto(undefined)` (cinza). Preferido ao `Estoque` porque produto com venda e sem
  linha de estoque perderia a cor. Migrar para `GET /api/combustiveis` é fatia futura — um call site por vez.
- **Troca parcial, e é a única possível:** venda, compra e rateio migram juntos (invariante
  `Σ fuelData = totalVolume`); estoque (`maxCapacity`), frentistas, formas de pagamento e fechamentos
  continuam no Supabase — a API de agregação não os entrega. Em `localhost` com `VITE_API_URL` a tela
  fica **mista**: venda/lucro do Postgres local, frentistas e fechamentos da produção.
- **Período que atravessa meses muda número na tela — e a tela avisa.** `kpis.janelaDoRateio` chega ao
  card "Lucro Estimado": dentro de um mês a legenda é a de sempre; em mais de um mês vira
  `Custo e despesa de jan–fev/2026` (ou `sem compra de X em jan–fev/2026`). Teste nomeado em
  `aggregator.dashboard.test.ts` ('período que atravessa meses (API) …'), ao lado do que prende o
  comportamento do Supabase ('… (Supabase): compra e rateio vêm só do mês de dataInicio').
- **Paridade provada dentro de um mês:** mesma venda/compra/despesa sintética pelas duas fontes →
  mesmos `totalSales`, `totalVolume`, `totalProfit`, `produtosSemCompra` e `fuelData` (ordem das barras
  pode diferir: a API ordena por nome, o Supabase pela primeira leitura). O lucro esperado é calculado à
  mão no teste e conferido com `lucroCombustivel`, não copiado da saída.

`GET /api/postos/{posto}/fechamento-mensal/{ano}/{mes}`

```json
{
  "dias": [
    { "data": "2026-01-02", "volume_total": "1234.567", "faturamento_bruto": "7407.40",
      "volumes_por_combustivel": { "1": "800.000", "2": "434.567" }, "status": "FECHADO" }
  ],
  "compras_por_combustivel": [ { "combustivel_id": 1, "litros": "15000.000", "valor_total": "82500.00" } ],
  "despesas_total": "22158.46"
}
```

`volumes_por_combustivel` é chaveado por **id**, não por nome. É isso que mata o risco do #93: posto
novo com combustível fora dos 4 nomes deixa de zerar coluna em silêncio.

`GET /api/frentistas?com_email=1` — **esta RPC não tem porto.** `get_frentistas_with_email` existe só
para alcançar `auth.users`, que é tabela do Supabase e não existe no Laravel. Com a #102 o e-mail
passa a viver em `Usuario`, e o endpoint vira um campo a mais no recurso de frentista que a #97 já
entrega. Fica registrado aqui para não virar endpoint órfão.

## Testes

- **Golden de paridade contra `get_dashboard_proprietario`** nos 7 meses: mesma entrada, mesma saída,
  **exceto** nos meses em que algum produto vendido não teve compra — ali a RPC devolve número e o
  endpoint devolve `null` por decisão. As exceções entram na asserção **nomeadas**, não toleradas.
- **Não há golden de paridade contra `get_fechamento_mensal`.** Ela está errada nos quatro eixos da
  §0; exigir "mesma saída da RPC" como aceite, como a issue escreveu, **congelaria o bug**. O aceite
  correto é: bate com `lucro.ts` + os goldens de janeiro.
- Pest com Postgres real do compose, `DatabaseTransactions`, sem migration (padrão da #97).
- **"Período que atravessa meses" é regra, não divergência:** `DashboardTest` prende compra e rateio
  de todos os meses civis do período (decisões 1 e 2 do dono, 18/09/2026). A paridade de despesa com a
  RPC só é afirmada em mês cheio, com o motivo escrito no teste.
- `bun run test:golden` verde antes e depois da troca de cada call site — **um por vez**, nunca em
  lote (regra da skill).
- **Paridade Supabase × API no painel** (`aggregator.dashboard.test.ts`): a mesma venda/compra/despesa
  sintética pelas duas fontes dá os mesmos KPIs e o mesmo gráfico; o período que atravessa meses tem os
  dois comportamentos nomeados; falha da API e falha do cadastro de combustíveis viram `ApiResponse`
  de erro (`FETCH_ERROR`), sem exceção e sem cair no Supabase. Rótulos do card em `rotulos.test.ts`.

## Riscos e decisões em aberto

- 📌 **Fatia própria registrada em 22/09: fechar o catálogo público.** O dashboard fechou, mas as
  rotas do catálogo (`routes/api.php:50-60`) seguem sem token e expõem `preco_custo`/`preco_venda`
  (em `combustiveis`, e em `tanques`/`bicos`, que trazem o combustível), `taxa` de formas de
  pagamento e maquininhas, `cnpj`/`contato` de fornecedores e `telefone`/`data_admissao` de
  frentistas. Detalhe e consumidores em `cadastro.md` §Riscos.
- ⚠️ **A issue #100 pede um aceite que congela um bug.** "Mesma saída da RPC" vale para o dashboard,
  não para o fechamento mensal. O texto da issue precisa ser corrigido junto com esta aprovação.
- ⚠️ **`get_encerrantes_mensal` é uma 4ª RPC e não achei chamador nela** no frontend, enquanto
  `packages/utils/src/encerrante-mensal.ts` já existe com golden. Provavelmente morta — confirmar com
  `grafo` antes do cutover, em vez de portar por via das dúvidas. Agrava a suspeita: ela faz
  `MIN(inicial)`/`MAX(final)` agrupando o **mês inteiro** por bico, o que não sobrevive a troca de
  encerrante no meio do mês.
- ⚠️ **`docs/data/` é gitignored** e já se perdeu uma vez. Os goldens de paridade dependem dele
  existir na máquina; confirmar se o CI consegue rodá-los ou se ficam sendo gate local.
- As 3 RPCs **permanecem no banco** sem chamador até o cutover (#105). Não dropar nesta issue.
- 📌 **ACHADO da validação local da fatia 2 (18/09/2026) — não é para corrigir nesta fatia.** Com o
  janeiro real carregado no Postgres do compose, a receita pela API é **R$ 290.062,94** (soma de
  `Leitura.valor_total`, a preço do dia), **R$ 2.337,66 menor** que a venda do golden
  (**R$ 292.400,60**, preço único por bico). Litros, compras e rateio batem com o golden. É o desvio
  conhecido do "preço único", anterior à #100: o caminho antigo da tela soma a mesma coluna
  (`insumosDoSupabase`, `acc[codigo].valor += l.valor_total`), então a troca de fonte **não muda esse
  número** — só o torna visível ao lado do golden.
- **Corrigido em 18/09/2026:** `Leitura.data` e `Compra.data` **são `timestamptz`**, não `date`
  (`01-esquema-base.sql:306` e `:138`), gravados em **00:00 UTC** (memória
  `timestamps-leitura-em-utc`, 1.230/1.230 linhas). Só `Despesa.data` e `Fechamento.data` são
  `date`. O endpoint toma o dia em UTC: `(data AT TIME ZONE 'UTC')::date BETWEEN inicio AND fim`.
  A RPC `get_dashboard_proprietario` compara `timestamptz >= date` cru: em sessão UTC (Supabase)
  funciona; em Postgres fora de UTC (o compose está em `America/Sao_Paulo`) o dia 1º cai fora,
  porque `'2026-01-01 00:00+00' >= '2026-01-01'::date` é falso. Medido no cenário sintético de
  `DashboardTest`: RPC em UTC `volume_total 1800.500 / total_vendas 10953.00`; em
  `America/Sao_Paulo` `800.500 / 4953.00` (perdeu a leitura de 01/01: 1000,000 L, R$ 6.000,00).
  O endpoint devolve 1800.500 nos dois fusos.
