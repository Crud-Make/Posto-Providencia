---
name: grep-por-caminho-perde-import-relativo
description: Grep de "quem importa X" pelo CAMINHO da pasta dá falso "órfão" quando o import é relativo; buscar pelo símbolo exportado
metadata:
  type: feedback
---

Para responder "quem usa este módulo", **grep pelo símbolo exportado, nunca pelo caminho da
pasta**. Se o caminho for a única busca, confirme o vazio com uma segunda busca pelo nome.

**Why:** em 28/08/2026 quase reportei que a tela `components/financeiro/` (o card
Receitas/Despesas, `useFinanceiro.ts`) estava órfã e que o bug da taxa dupla era código morto.
O `rg "from '.*components/financeiro'"` voltou vazio, e a rota `/financeiro` no `App.tsx` é
mesmo só um `<Navigate>` para `/fechamento` — duas evidências apontando para "morta". Estava
viva: `fechamento-diario/index.tsx` a importa como `from '../financeiro'`, caminho relativo
que não contém a string `components/financeiro`. O bug afeta uma tela que o dono usa.

É a assimetria do §12 na direção mais cara: grep que **volta vazio** parece confirmação, mas
vazio é ambíguo entre "não existe" e "o padrão não pega". Achado que sobrevive ao grep é
evidência; ausência no grep só vale depois de tentada por dois padrões diferentes.

**How to apply:** ao afirmar "não tem chamador" / "é código morto" / "nada escreve nessa
coluna", rode as duas formas antes de escrever a frase:
```
rg -n "NomeDoSimboloExportado" apps packages -g '*.ts' -g '*.tsx'   # pelo símbolo — decide
rg -Un "from ['\"].*caminho/do/modulo['\"]" apps packages           # pelo caminho — só apoia
```
Vale igual para coluna de banco (buscar o nome da coluna, não o `.from('Tabela')`) e para
método exposto por barril `index.ts`, que reexporta e some com o caminho original.
Ver [[mapa-implementacoes-de-custo]].
