---
name: bug-que-so-aparece-no-dado-grande
description: Por que o parse errado do encerrante sobreviveu 7 meses — só o Bico 01 passa de 1 milhão, então só ele tem dois pontos de milhar
metadata:
  type: project
---

O `replace('.', '')` sem `/g` só erra quando a string tem **dois** separadores
de milhar. Na operação real do posto isso significa **encerrante acima de 1
milhão**, e só o **Bico 01 (Gasolina Comum)** chega lá — os outros cinco ficam
abaixo de 700 mil e têm um ponto só, onde o parse sem `/g` acerta por acidente.

Foi o que manteve o bug invisível de `871b904` (11/01/2026) a `6c89f1d`
(16/08/2026).

Dois agravantes registrados em `6c89f1d`:
- A tela **mostrava** 348,487 L (parser certo, `useLeituras.ts`) enquanto o
  banco recebia 0,349 L (parser errado). Mesmo hook, dois números — não havia
  como o dono ver pela tela.
- Com o final deslocado e o inicial correto, o guarda `final > inicial` do
  `.filter()` **derrubava a linha sem erro visível**: digitava-se a leitura e
  nada era salvo.

Produção estava limpa (186 linhas em `Leitura`, 0 contaminadas, conferido em
16/08) **porque o dado veio de carga em lote, não do formulário** — não porque
a tela estivesse certa.

**How to apply:** ao avaliar se um bug de parse "já pegou produção", checar a
procedência da linha (timestamp único = carga em lote) antes de concluir. E
desconfiar de bug que "nunca apareceu": pode ser que só o registro maior o
dispare, e ele ainda não passou pela tela.

Ver [[parse-do-encerrante-divergencia-871b904]].
