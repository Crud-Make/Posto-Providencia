# Fórmulas da planilha — referência com célula

Levantado em **17/09/2026** a partir de `~/Downloads/Posto,Jorro, 2026.xlsx`
(md5 `15cb9fe84b4f3163dec9b71af4601f54`, byte-idêntico a
`/mnt/dados/backups-posto/Posto,Jorro, 2026 (2026-08-30).xlsx`).

> **Para que serve:** a planilha é a autoridade de regra de negócio (CLAUDE.md §0). Este arquivo
> guarda o que ela faz, **com célula e fórmula literal**, para não ser preciso reabrir o xlsx a cada
> dúvida. Valor real se consulta em `docs/data/posto_jorro_2026.sqlite`; **fórmula é aqui**.
>
> Mapa de abas: `POSTO JORRO 2026` é `xl/worksheets/sheet11.xml` nesta versão (não sheet9). A grade
> `Despeza, 2026.` está em `B291`/`C293:O320`, `Total.` na 321.

---

## 1. A planilha não tem nenhuma guarda de erro

Varredura das **24.543 fórmulas de todas as abas**: **zero** ocorrências de `IFERROR`, `IFNA`,
`ISBLANK`, `ISERROR` ou `IF(`. Divisão sem denominador aparece como `#DIV/0!` na cara, e isso
acontece de verdade no arquivo (ex.: `Mes, 02.` `G320 = H320/F320`, dias 09–14 do buraco de
fevereiro).

**Consequência de modelagem:** não existe "comportamento de fallback" na planilha para copiar. Onde
falta dado, ou aparece erro, ou **alguém digitou um número**.

## 2. Custo do litro — e o que acontece quando vendeu sem comprar

Cadeia de custo na aba `POSTO JORRO 2026`, bloco `Compra` de cada mês (+31 linhas por mês:
`F16, F47, F78, F109, F140, F171, F202, F233`):

```
D  = Compra, LT.     ← literal, digitado
E  = Compra, R$.     ← literal, digitado
F16 = E16/D16        ← Media LT R$. (custo médio de compra do mês)
I19 = I16/F11        ← despesa do mês ÷ litros vendidos = despesa operacional por litro
G16 = F16 + I19      ← custo TOTAL do litro
I5  = G5 - G16       ← lucro por litro (preço de venda − custo total)
J5  = I5 * F5        ← lucro do bico
J11 = SUM(J5:J10)    ← lucro do mês
```

### Vendeu sem comprar: **fevereiro/2026, Ds.10 (Diesel S-10, bico 04)**

Único caso em todo o ano. A planilha **não resolve com fórmula** — o dono digitou uma compra
simbólica:

| Célula | Conteúdo | Leitura |
|---|---|---|
| `D50` | `1` literal | 1 litro comprado |
| `E50` | `5` literal | R$ 5,00 |
| `F50` | `=E50/D50` → **5,00** | custo médio do mês |
| `F39` | `=E39-D39` → 1.768,27 L | Ds.10 realmente vendido |
| `I39` | `=G39-G50` → 0,9107 | lucro/L do bico |

**O que a planilha NÃO faz:** não deixa vazio, não dá erro, não zera, **não arrasta o custo do mês
anterior** (janeiro foi `F19 = 5,38`; fevereiro ficou 5,00) e não usa preço de tabela do cadastro.

**O modelo verdadeiro é: custo informado pelo usuário, por mês e por produto.** Nem `null` (perde o
mês) nem `preco_custo` do cadastro (número que a planilha nunca usou) reproduzem isso.

Efeito colateral: o litro simbólico vaza para o estoque via `E58 = D50+D58`, e daí para `F58`
(`Estoque Hoje`) e `G58` (`Perca e Sobra`).

Nos outros 7 meses (01, 03–08) os 4 produtos têm compra real — nenhum `D` vazio em 2026.

## 3. Taxa de cartão — aparece em três lugares, só um vira dinheiro

### (a) Por transação, por dia — calculada e **não consumida**

Rótulo `Despeza com das taxas do Cartao.` em todo bloco `Caixa Dia NN`.

Mês 01 (colunas H/I): `I14 = F14*H14`, `I15 = F15*H15`, `I17 = F17*H17`, `I19 = SUM(I14:I18)`.
Meses 02–08 (colunas K–N): `N5..N8 = M*L`, `N10 = SUM(N5:N9)`.

**Esse total diário não é referenciado por fórmula nenhuma.** É conferência, não entra em resultado.

### (b) `Total Liquido` — beco sem saída

Só no mês 01: `J1133 = F1133-I1133`, `J1138 = SUM(J1133:J1137)`. **Não é lido fora do próprio
bloco**, e o rótulo não existe nos meses 02–08.

### (c) Onde vira dinheiro — **despesa do mês**

```
C294      = "Despeza com das taxas dos Cartao."
D294:O294 = valores LITERAIS, redigitados à mão
D321 = SUM(D293:D319)     ← Total. do mês
I16  = D321               ← "Desp,Mês."
I19  = I16/F11            ← despesa operacional por litro
G16  = F16 + I19          ← entra no custo do litro
```

**A taxa chega ao lucro uma única vez, diluída no custo por litro.** Não existe dedução de taxa da
receita em nenhum caminho que alimente lucro. Descontar da receita *e* contar como despesa é
contagem dupla — e a planilha não faz isso. (Confirma o que o dono disse em 26/08, agora com célula.)

### Alíquotas mudaram no meio do ano

| Período | Pix | Crédito | Débito | Baratão |
|---|---|---|---|---|
| Meses 01–03 | 0 | 0,025 | 0,007 | 0,019 |
| Abril | transição (20 dias antigas, 7–11 novas) | | | |
| Maio em diante | **0,0075** | **0,0301** | **0,0074** | 0,019 |

São **literais digitados em cada bloco de dia**, não constante nem referência. **Pix passou a ser
taxado.**

### ⚠️ Divergências entre a soma dos dias e o que foi digitado na linha 294

O bloco de consolidação ficou com as alíquotas **antigas** (`M875=0`, `M876=0,025`, `M877=0,007`,
`M878=0,019` em todos os meses) e foi **ele** que virou a linha 294 — não a soma dos dias:

| Mês | Σ dos dias | Consolidação | Digitado na 294 | |
|---|---|---|---|---|
| 01 | 1.922,82 | 1.922,82 | 1.922,82 | ✔ |
| 02 | 1.478,02 | 1.478,02 | 1.478,00 | ✔ |
| 03 | 1.839,78 | 1.839,78 | 1.840,00 | ✔ |
| 04 | **2.062,57** | 1.982,61 | 1.982,61 | ⚠ −79,96 |
| 05 | **2.270,02** | 1.817,52 | 1.818,00 | ⚠ −452,50 |
| 06 | 2.144,33 | 2.144,33 | 2.144,33 | ✔ |
| 07 | 1.902,02 | 1.902,02 | 1.902,00 | ✔ |
| 08 | 1.573,49 | 1.573,49 | **VAZIO** | 🔴 |

**Agosto não tem taxa de cartão na despesa.** `K321 = 15.516,00` foi somado sem ela, então `I236`
(despesa por litro de agosto) está subestimado, e o lucro de agosto está **inflado**. É achado, não
erro a corrigir sozinho: qual valor manda é decisão do dono.

## 4. Lucro líquido por dia **não existe na planilha**

Varredura de rótulos em todas as abas diárias: o único rótulo com "despe" é
`Despeza com das taxas do Cartao.`, e **não há nenhum rótulo com "lucro"** dentro de bloco de dia.

O bloco `Caixa Dia NN` tem, e só tem:

```
Venda Concentrador         F = E-D (litros) ; H = F*G ; H11 = SUM(H5:H10)
Taxa de cartão             (item 3a)
Venda Frentista            por meio de pagamento × pessoa ; M = soma da linha
Venda Concentrador         por pessoa (digitado)
Falta.                     D24 = D23-D22     (concentrador − frentista)
%
Concentrador x Frentista   N26 = H11-M23
```

**Lucro existe só por mês e por bico** (`I5`, `J5`, `J11`), e **já nasce líquido de despesa**, porque
`G16 = F16 + I19`. Não há etapa separada "lucro bruto − despesa". A `Falta.` **não** é descontada
do lucro.

Não confundir com o bloco mensal `Participacao de Lucro` (`D1152 = D1151*0,003`),
`Participacao - Falta` (`D1153 = D1152-D1148`) e `Salario Pago` (`D1154 = 1700+D1153`): é **comissão
de frentista**, não resultado.

## 5. Ressalvas estruturais

- **Duas abas de agosto**: `MES, 08` e `MES, 08 ` (com espaço no fim). Ambas têm 32 blocos; a
  primeira tem taxa preenchida em 18 dias, a segunda em 30. Este levantamento usou a **segunda**.
  Qual vale é decisão do dono — **e afeta o ETL**.
- **A planilha não tem nenhuma referência entre abas.** `POSTO JORRO 2026` não lê as abas `Mes, NN.`;
  tudo que aparece nas duas está digitado duas vezes. É daí que nascem as divergências do item 3.
- Buraco de fevereiro (dias 09–14) aparece como `#DIV/0!` nas células de `%` — não é falha de leitura.
- Valores aqui estão em **reais decimais**, como a planilha guarda, não em centavos.

## Como repetir

`zipfile` + `xml.etree` sobre `xl/worksheets/sheetNN.xml`; fórmula no `<f>`, valor em cache no `<v>`.
**Fórmula compartilhada** (`<f t="shared">`) vem vazia nas células-filhas — é preciso guardar o `si`
da âncora, senão metade da planilha parece não ter fórmula.
