---
name: custo-operacional-fixo-so-no-historico
description: o custo operacional por litro é fórmula (despesa ÷ litros) em todo bloco mensal de 2025 e 2026; valor digitado só existe na coluna G do bloco histórico "Ano 17 a 26", um por ano; o bloco anual da planilha 2025 é lixo (dezembro vazio)
metadata:
  type: reference
---

Conferido em 06/09/2026 com `zipfile` nas duas planilhas (`~/Downloads/Posto,Jorro,
2026.xlsx` sha `3357eed9…` e `~/Downloads/Posto,Jorro, 2025.xlsx` sha `8a01e79f…`).

**Mensal é fórmula, nos dois anos.** 2026 (`POSTO JORRO 2026`): `I19 = I16/F11`,
`I16 = D321` (Total da `Despeza, 2026.`), `F11` = litros do mês. 2025
(`POSTO JORRO,2025`): `H22 = H19/F11`, `H19 = D390` (Total da `Despeza, 2025.`);
o padrão repete nos 12 blocos (`H50=H47/F39`, … `H323=H320/F313`). Nenhuma
fórmula da planilha contém literal `0.4x`.

**Digitado só no bloco histórico** (`Posto Providencia,C, J, Ano, 17 a 26.`,
linhas 327–343 na de 2026; 396–410 na de 2025): coluna `G` (`Custo, LT,R$.`) é
literal em cada linha de ano 2017–2025 e muda de ano para ano — **não é um
0,45 constante desde 2018**; 0,45 é a célula de um ano só (`G331` = 2018 na de
2026; `G400` na de 2025). A linha 2026 (`G339 = I273`, `I273 = I270/F265`,
`I270 = P321`) é fórmula: despesa do ano ÷ litros do ano. A linha `Total.`
(`G341`/`G408`) é literal.

**Armadilhas:**
- Na planilha **2025**, a linha 2025 do histórico (`G407 = H352`) e o bloco
  `Posro Jorro Ano, 25.` (linhas 331–356) são lixo: `E334 = E307` aponta para o
  fechamento de dezembro, vazio → litros negativos na casa dos milhões (bug 2 da
  skill de ETL em escala anual). O valor válido para 2025 está na linha 338 da
  planilha **2026**, digitado à mão (compra, custo, litros, venda).
- O bloco mensal 12 de 2025 (`F313`, `H313`, `J313`) tem o mesmo lixo; somar
  2025 é jan–nov (`F11…F286`), e a `Despeza, 2025.` só tem jan–nov.
- Os litros/venda de 2025 digitados na planilha 2026 (`I338`, `K338`) **não
  batem** com Σ dos blocos mensais jan–nov da planilha 2025 — a diferença tem
  cara de dezembro parcial, mas não há célula que prove.

Ver [[custo-produto-media-do-proprio-mes]] e [[venda-bico-lixo-em-dia-incompleto]].
