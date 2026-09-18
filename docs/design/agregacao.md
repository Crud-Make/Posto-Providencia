# Agregação — Design Doc

Issue: #100 (mãe: #60) · Estado: **aprovado** (dono, 18/09/2026) · Data: 17/09/2026 · Revisado: 18/09/2026 (§2 e §3 alinhados à CA-7)

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

## 4. Comportamento

### DECISÃO 1 — o endpoint **devolve dado bruto**; quem calcula é `packages/utils`

A issue deixou em aberto e a resposta é firme: **devolver dado**. Calcular em PHP criaria a
**quarta** implementação da fórmula de dinheiro, com zero golden master do lado PHP contra 18 do lado
TS. A skill nomeia exatamente esse modo de falha — *"a NEW copy of the formula being born inside a
hook or a service"*. A Fase A é migrar a API, não reescrever a fórmula.

Consequência: o endpoint entrega `litros_vendidos`, `receita`, `compras` e `despesas` do período, e
`custoLitrosVendidos()` + `despesaOperacionalPorLitro()` + `lucroCombustivel()` seguem sendo a
autoridade, com os goldens que já existem cobrindo-os.

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

O endpoint **não devolve `custo_taxas`**. A taxa existe uma vez, dentro de `despesas_total`. A
coluna morre junto com a RPC.

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
GET /api/postos/{posto}/dashboard?inicio&fim
  → DefinePostoAtual (404 se posto não existe)
  → DadosDoPeriodo: agrega Leitura por combustivel_id; Compra do MESMO período por combustivel_id;
    Despesa somada no período
  → Resource (dinheiro em string decimal, nunca float)
  → cliente: custoLitrosVendidos() → despesaOperacionalPorLitro() → lucroCombustivel()
```

## 5. Contratos

`GET /api/postos/{posto}/dashboard?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`

```json
{
  "periodo": { "inicio": "2026-01-01", "fim": "2026-01-31" },
  "produtos": [
    { "combustivel_id": 1, "produto": "GASOLINA COMUM",
      "litros_vendidos": "12345.678", "receita": "74074.07",
      "compras": { "litros": "15000.000", "valor_total": "82500.00" } }
  ],
  "despesas_total": "22158.46"
}
```

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
- `bun run test:golden` verde antes e depois da troca de cada call site — **um por vez**, nunca em
  lote (regra da skill).

## Riscos e decisões em aberto

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
- `Leitura.data` é `date`; `Fechamento.data` também. Sem fuso envolvido aqui — mas
  `timestamps-leitura-em-utc` vale para `Leitura.created_at`, que esta issue não usa.
