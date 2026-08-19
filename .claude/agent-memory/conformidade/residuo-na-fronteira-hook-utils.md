---
name: residuo-na-fronteira-hook-utils
description: A 3ª forma do resíduo de fórmula — o hook consome @posto/utils mas trunca a saída e re-deriva o denominador à mão; caçar por campo do módulo canônico que morre na interface do app
metadata:
  type: project
---

Terceira forma do resíduo de fórmula fora de `packages/utils`, achada em
**16/08/2026** no widget `planilha-do-mes`. As duas primeiras estão em
[[formula-duplicada-fora-utils]]; esta é mais difícil de ver porque **o arquivo
importa o módulo canônico** — a varredura por `grep` de fórmula passa limpo.

**A forma:** o hook chama a função de `@posto/utils`, mas **copia só parte do
retorno** para a sua própria `interface`, e depois **re-deriva à mão** um campo que
o módulo já tinha calculado. O resíduo não é uma fórmula duplicada solta: é um
**denominador escolhido de novo** na fronteira.

O caso concreto: `encerranteMensal` devolve por bico `litros` (salto do encerrante),
`litrosLancados` (só dias com os dois encerrantes), `litrosEmLacuna`, `bruto` e
`precoMedio = bruto ÷ litrosLancados`. A `interface BicoDoBanco` do hook guardou
`inicial`, `fechamento` e `bruto` — e **descartou os outros três**. Aí o preço médio
por produto voltou a ser calculado no hook como `Σbruto ÷ Σ(fechamento − inicial)`,
que é `bruto ÷ litros`, **outro denominador**.

**Por que importa:** os dois denominadores só coincidem quando não há lacuna. Com
lacuna, o preço sai mais baixo, e o preço alimenta `lucroLitro`. Medido com um mês
de lacuna interior: divergência de **−18,7% no preço** e milhares de reais a menos
no lucro do bico. Reproduzir a medição (não decorar o número):
```bash
grep -n 'precoMedio\|litrosLancados\|litrosEmLacuna' packages/utils/src/encerrante-mensal.ts
grep -n 'interface BicoDoBanco' -A12 apps/web/src/widgets/planilha-do-mes/model/use-planilha-do-banco.ts
```

**Nuance que impede chamar de bug simples:** `resumo-produto.ts` usa a convenção
`venda ÷ litros(salto)` e `encerrante-mensal.ts` usa `bruto ÷ litrosLancados`. Os
dois módulos canônicos **discordam do denominador**. Então o achado se reporta como
*divergência de convenção a decidir com o dono*, não como "o hook está errado" —
e mexer nisso é categoria **domínio**, nunca estrutural.

**Como caçar a forma em outro lugar:** procurar campo que o módulo canônico exporta
e que morre na `interface` do app.
```bash
grep -rn 'temLacuna\|litrosEmLacuna\|litrosLancados' apps --include='*.ts' --include='*.tsx'
```
Quem consome é `apps/web/src/components/fechamento-mensal/index.tsx` (mostra a lacuna
em vermelho, com os dias no `title`) — é o **sibling validado**. Tela nova de dinheiro
que não exibe lacuna está escondendo a condição em que o próprio número dela erra.

Ver [[formula-duplicada-fora-utils]] e [[golden-master-como-conferir]].
