---
name: custo-produto-media-do-proprio-mes
description: na planilha o custo do combustível vendido é a média das compras do PRÓPRIO mês; o estoque "ano passado" entra só em litros, sem custo de abertura
metadata:
  type: reference
---

Onde: aba **`POSTO JORRO 2026`** (sheet9), um bloco por mês. Mês 01 nas linhas
15–28; os meses seguintes repetem o mesmo layout ~31 linhas abaixo (46, 77, …).

**Custo do produto vendido = média das compras do próprio mês.** Coluna F
(`Media LT R$`) = `Compra R$ (E) / Compra LT (D)`, com D e E digitados à mão para
aquele mês. Ex. mês 01: `F16 = E16/D16`. Não há média ponderada com estoque
anterior nem custo de abertura carregado do mês passado.

**O estoque "ano passado" é só volume, nunca custo.** Coluna D do bloco de
estoque (`Estoque ano passado`, ex. `D24`) é litros carregados, digitados à mão.
Entra apenas em `E = D_compra + D_anopassado` (`Compra e Estoque`, litros) para
fechar `Estoque Hoje` e `Perca e Sobra` contra o tanque físico. Nenhuma coluna
associa preço a esse estoque.

**Cadeia do lucro** (por bico, linhas 5–10 do bloco): `Valor pra Venda (G16) =
Media LT (F16) + custo operacional por litro (I19)`; `Lucro LT (I5) = preço de
venda (G5) − G16`; `Lucro bico (J5) = I5 × litros`. Ou seja o lucro usa o custo
de compra **do mês corrente**, não do mês da entrada física no tanque.

Consequência prática: a planilha **não** precisa da compra de dezembro/2025 para
o lucro de janeiro. Combustível abastecido em dez/2025 e vendido no começo de
jan/2026 é custeado pela média das compras de janeiro. Se o dono quiser custo
pela entrada física (dez), isso seria mudar o método — a fonte auditável não faz
isso. Só existem abas de 2026 (mês 01 a 07); não há dado de 2025 na planilha.

Espelha `compra_mensal` (media_lt, valor_venda) e `estoque_mensal` (ano_passado,
compra_e_estoque) no sqlite. Ver [[fixture-lucro-custo-mes01]].

**Reconferido célula a célula em 26/08/2026** (sheet9, mês 01, hash `abecc283…`):
- `Desp,Mês` = `I16 = D286`, e `D286 = SUM(D258:D284)`; rateio `I19 = I16/F11`
  com `F11 = F5+…+F10` (litros **vendidos**, não comprados).
- `Preço Atual` (`G5`, `G7`, `G8`) é **digitado**; `G6 = G5` e `G9 = G5`
  (Aditivada e Bico 05 herdam o preço da Comum). `G10` e `I10` ficam **vazios**:
  `H10 = F10*G9` e `J10 = I9*F10` usam o Bico 05 como proxy.
- Encerrantes `D5:E10` são **literais** (segunda digitação), não referência.
- `D24:D27` (estoque anterior) e `H24:H27` (tanque) são literais.
- **Frete não é digitado**: `D258 = D20*0.12` — 12% × litros comprados no mês.
