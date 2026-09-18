---
name: mapa-aba-posto-jorro-2026
description: Estrutura do xlsx original — não existe aba "Posto Jorro"; a aba é "POSTO JORRO 2026" (sheet9) e "Posto - Jorro" é nome de coluna de frentista
metadata:
  type: reference
---

Mapeado em 16/08/2026 sobre `/home/thygas/Downloads/Posto,Jorro, 2026.xlsx`
(hash em [[estado-docs-data]]).

**Não existe aba chamada "Posto Jorro".** Quando alguém pedir "a aba Posto
Jorro", são três coisas diferentes e a pergunta precisa ser desambiguada:

1. **Aba `POSTO JORRO 2026`** (`xl/worksheets/sheet9.xml`) — o resumo
   mensal/anual. É a aba que a skill de ETL manda usar para reconciliar.
2. **`Posto Jorro, mês NN.`** — título de bloco *dentro* da sheet9 (`B2`, `B33`,
   `B64`, `B95`, `B126`, `B157`, `B188`; anual em `B221`; bloco-rascunho órfão
   em `B426`). Passo de 31 linhas entre meses.
3. **`Posto - P - Jorro` / `Posto - Jorro`** — **nome de coluna de frentista**
   nas abas `Mes, NN.`/`MES, NN`, não título de aba.

Abas do arquivo, na ordem: `Mes, 01.` `Mes, 02.` `Mes, 03.` `Mes, 04.`
`MES, 05` `MES, 06` `MES, 07` `-26` `POSTO JORRO 2026` `Plan1` `Planilha1`
`AFERICAO`.

**Como abrir sem openpyxl:** helper de dump em
`/tmp/.../scratchpad/dump.py` (descartável) — o essencial é que o xlsx é zip de
XML, a fórmula está em `<f>`, e **fórmula compartilhada** (`<f t="shared">`)
aparece vazia nas células filhas: é preciso guardar o `si` da âncora e lembrar
que as referências deslocam relativo à âncora. Ignorar isso faz parecer que
metade da planilha está com fórmula errada.

**Onde consultar cada coisa na sheet9** (linhas do bloco do mês 01; some 31 por
mês, e o bloco anual começa em 221):
- Venda por bico: `C4:M11` — `F=E-D` (litros), `H=F*G`, `I=G-G16` (lucro/L),
  `K=I/G` (margem), `L`/`M` (litros e % por produto).
- Compra e custo: `C15:I20` — `F=E/D` (custo médio/L),
  `I19 = I16/F11` = **custo operacional por litro** = despesa do mês ÷ litros
  vendidos do mês, e `G = F + I19` = preço mínimo de venda.
- Estoque/perda: `C23:H28` — `F = E − L` (estoque teórico), `G = H − F`
  (perda/sobra contra a medição do tanque).
- Despesa mensal (grade 12 colunas): linhas 256–287. **É a lista que alimenta o
  cálculo**: `I16{=D286}` … `I202{=J286}`, anual `I235{=P286}`.
- Despesa trimestral: linhas 354–412. **Não alimenta nada** — nenhuma fórmula
  fora do bloco aponta para ele. Ver [[divergencia-despesa-duas-listas]].
- Histórico 2017–2026: 292–322. Lubrificante: 326–349.

**A planilha inteira tem zero referência entre abas** (14.032 fórmulas, nenhuma
com `!`, sem `externalLink`). O resumo `POSTO JORRO 2026` **não lê** as abas
`Mes, NN.`: os encerrantes `Inicial`/`Fechamento` são redigitados à mão. Isso é
o que torna a reconciliação da skill de ETL uma checagem real e não uma
tautologia — e é onde nasce divergência entre resumo e diário.

Ver [[divergencia-venda-resumo-vs-diario]] e [[onde-para-cada-fonte]].

---

**Remapeado em 17/09/2026 na planilha de 30/08** (md5
`15cb9fe84b4f3163dec9b71af4601f54`). **As linhas e o número da sheet mudaram** —
o mapa acima é do arquivo de 07/08 e leva a célula errada se aplicado ao novo.

- **Abas, na ordem:** `Mes, 01.` `Mes, 02.` `Mes, 03.` `Mes, 04.` `MES, 05`
  `MES, 06` `MES, 07` `MES, 08` `MES, 08 ` (**sim, duas: a segunda com espaço
  no fim** — a sheet8 parece parcial e a sheet9 completa; desambiguar antes de
  usar) `-26` `POSTO JORRO 2026` `AFERICAO` `Sheet4`. Sumiram `Plan1` e
  `Planilha1`.
- **`POSTO JORRO 2026` agora é `xl/worksheets/sheet11.xml`**, não a sheet9.
  Nunca endereçar aba por número de arquivo; ler `xl/workbook.xml` +
  `xl/_rels/workbook.xml.rels`.
- **Títulos de bloco na coluna B:** mês 01 em `B2`, passo de 31 linhas até o
  **mês 08 em `B219`**; anual `Posto Jorro, Ano 26.` em `B256`;
  `Despeza, 2026.` em `B291` (grade de rubricas `C293:O320`, `Total.` na linha
  321); `Posto Providencia,C, J, Ano, 17 a 26.` em `B327`;
  `Lubrificante, Ano.` em `B361`; bloco-rascunho órfão `Posto Jorro, mês 0.`
  em `B461`.
- Dentro do bloco do mês: venda `C+2`…, compra `C+12`/`C+13`, estoque `C+21`
  (mês 01: venda 4–11, compra 14–20, estoque 23–28). `Desp,Mês` do mês 01 passou
  a ser `I16 = D321` (era `D286`).
