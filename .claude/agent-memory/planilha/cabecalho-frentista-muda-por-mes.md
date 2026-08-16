---
name: cabecalho-frentista-muda-por-mes
description: Nas abas Mes NN o cabeçalho de frentista muda de nome, de coluna e de quantidade a cada mês — é a causa do aborto do mês 07 por "Posto - Jorro"
metadata:
  type: project
---

Conferido em 16/08/2026 no xlsx original (ver [[mapa-aba-posto-jorro-2026]]).

Cada aba `Mes, NN.`/`MES, NN` tem 32 blocos `Caixa Dia` (31 dias + o bloco de
consolidação `Caixa Dia 01 a 31`), e o cabeçalho de frentista fica na **linha 22
no mês 01 e na linha 14 nos meses 02–07**. O conjunto e a posição das colunas
mudam todo mês: entram e saem frentistas, os nomes trocam de grafia
(`Filip` vira `Felip` no mês 07) e a coluna do posto anda de `L` (meses 01–04)
para `K` (meses 05–07).

A coluna do posto — a venda que não é de frentista nomeado — chama-se
`Posto - P - Jorro` nos meses 01 a 06 e **`Posto - Jorro` no mês 07**.

**Why:** é essa mudança de rótulo que faz o mês 07 abortar a carga de
fechamento (registrado em `.claude/memoria/estado-etl-estagio2.md`). Não é dado
faltando nem bug de leitura: é lista de nomes conhecidos que não previu a
variação.

**How to apply:** nunca afirmar posição de coluna de frentista por memória nem
por analogia com outro mês — ler o cabeçalho do bloco, como a skill de ETL já
exige. Quando o dono perguntar "por que o mês 07 falhou", a evidência é
`MES, 07!K14 = "Posto - Jorro"` contra `MES, 06!K14 = "Posto - P - Jorro"`.
