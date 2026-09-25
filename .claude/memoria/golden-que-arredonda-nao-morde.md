---
name: golden-que-arredonda-nao-morde
description: 20/09 medido por mutação — a maioria dos goldens passava verde sobre erro de dinheiro; a causa é arredondar ou tolerar antes de comparar
metadata:
  type: project
---

Varredura por mutação em 20/09/2026 (83 mutações, commits `9a4366a` e `a5fdfc8`):
**a maioria dos goldens do repo passava VERDE sobre erro de dinheiro deliberado.**

O número que resume: **`emCentavos` podia virar identidade no pacote inteiro e
11 dos 13 goldens de `packages/utils` seguiam verdes.** Hoje acusam 5.

As três formas da armadilha — todas "parecem" asserção e não são:

1. **arredondar o lado do módulo antes de comparar** — `expect(centavos(x)).toBe(centavos(ref))`
   arredonda o artefato da mutação junto. Foi como a P8 descobriu o problema.
2. **tolerância escrita larga** — `toBeCloseTo(_, 1)` tolera **5 centavos**,
   `toBeCloseTo(_, 0)` tolera **50**, sobre valores de R$ 189 mil. `TOL = 1.0` em
   `lucro.golden` contra resíduo real de R$ 0,004. Tolerância de litros era
   0,002 L contra ruído real de **1,3e-10 L** — 15 milhões de vezes.
3. **a saída nunca é asserida** — `profitPerLiter`, `cmv` e `lucroLitro` não
   tinham asserção nenhuma, então **sinal invertido passava**.

A forma que MORDE: `expect(x).toBe(emCentavos(x))` (a saída de dinheiro nasce
quantizada; float sujo como `8697.390000000001` reprova) e igualdade exata
contra o canônico quantizado, sem arredondar o lado do módulo.

**Duas armadilhas de método, para não repetir:**
- testar uma regra num caso onde ela some: `calcLucroLtPura` só era exercitado
  num mês de **despesa zero**, onde somar e subtrair a despesa dão igual.
- mutação verde nem sempre é lacuna: pode ser **código morto** para o dado real
  (`RC-M4`) ou **mutação equivalente** (`PM-M1a`). Prova-se mutando o outro ramo.

Dívidas de FONTE achadas e NÃO consertadas (é fórmula, decisão do dono):
`somarDespesas` (`despesa.ts:66-71`) e `valorBrutoEstoque`
(`calculos-resumo-financeiro.ts:27`) acumulam em **float puro**; o
`encerrante-mensal` devolve bruto 1 a 8 centavos diferente da constante do
próprio spec há meses, escondido por R$ 1,00 de folga.

Ver [[gate-verde-sem-canario-nao-vale]] e [[so-fable-mexe-em-formula]].
