---
name: duas-formulas-de-custo-divergem-no-mes
description: O caminho de escrita de compra usa média ponderada com estoque anterior; a planilha custeia pelo mês. Erra até R$ 2.582 no mês e quase nada no ano — medido nos 7 meses em 26/08/2026
metadata:
  type: project
---

**[26/08/2026]** Validação dos 7 meses de 2026 contra `docs/data/posto_jorro_2026.sqlite`.

**A leitura está certa.** `resumoCompra` e `resumoEstoque` reproduzem a planilha célula a
célula em janeiro–julho, inclusive nos casos feios (estoque teórico negativo em fev e abr,
perda de −3.712,21 L de Comum em janeiro). Já era coberto pelo
`resumo-compra-estoque.golden.spec.ts`, que **já varria os 7 meses** — não só janeiro, como
eu tinha suposto.

**A escrita usa outra fórmula.** `apps/web/src/services/api/compra.service.ts:117` e
`usePersistenciaRegistro.ts:161` fazem a **mesma** média ponderada com o estoque anterior,
duas vezes, em dois arquivos, a partir de bases diferentes (`Estoque.custo_medio` num,
`Combustivel.preco_custo` no outro). A planilha custeia pela compra do próprio mês. Medido:

- **no ano:** R$ 132,69 sobre R$ 1.541.032 comprados (0,0086%) — quase empata
- **no mês:** erra até **R$ 2.582,18** (abril, lucro inflado); março +1.986; fev −1.338; jun −1.547
- pior caso unitário: Ds10 em fevereiro, R$ 5,00/L × R$ 5,38/L (7,6%), porque o mês teve
  compra de **1 litro** e o estoque anterior dominou a média

É por isso que passou despercebida: só aparece na janela que o dono olha. Ver
[[custo-e-por-mes-nao-estoque-anterior]].

**A regra da corrente:** `estoque_anterior[mês] = estoque_tanque[mês−1]` — o litro MEDIDO na
régua, nunca o teórico. Vale de março a julho. **Fevereiro/2026 quebra**: repetiu o
`ano_passado` de janeiro em vez de herdar o medido (Δ +2.187 L de Aditivada, +1.720 de Comum),
e é isso que produz a perda fantasma de −2.070,25 L. Erro **da planilha**, não do código.

Tudo travado em `packages/utils/src/estoque-encadeamento.golden.spec.ts` (24 casos, escrito
neste dia). O teste **replica** a ponderada em vez de chamar a real — `packages/*` não importa
de `apps/*` (§2) e a do hook é closure não exportada. Trava o tamanho da divergência, não a
chamada: mexeu no custo em `apps/web`, ele não avisa.

**[26/08/2026, tarde]** Branch `feat/tanque-derivado-compras-graficos` (3 commits, sem PR):
a tela `/compras` virou mensal e lê tudo do banco (vendas de `Leitura`, custo `Σ R$ ÷ Σ L` da
`Compra` do mês, régua de `HistoricoTanque`, despesa de `Despesa`); a média ponderada em
`Combustivel.preco_custo` saiu do Salvar. **Ainda ponderam:** `compra.service.ts:117`
(`Estoque.custo_medio`) e `stockService.ts:88` — os dashboards que leem esses campos seguem
tortos. O dashboard de tanques deriva o estoque (`estoque-derivado.ts`). Conferido pelo agente
`planilha` em 26/08: a memória antiga `H19 = D390` estava errada — é `I16 = D286`; leituras do
resumo são REDIGITADAS na planilha (`D5:E10` literais); Frete = `D20 × 0,12` calculado.
