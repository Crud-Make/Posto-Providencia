---
name: formula-duplicada-fora-utils
description: A forma que a fórmula duplicada fora de packages/utils assume neste repo — o trio do lucro reimplementado e a margem hardcoded
metadata:
  type: project
---

A consolidação em `@posto/utils` já está **largamente feita** (dezenas de arquivos
importam `conferido`/`diferenca`/`cartao`). O que sobra é resíduo, e ele tem duas
formas recorrentes. Reconhecer a forma é o que economiza a varredura.

**Forma 1 — o trio do lucro reimplementado inline.** Um service calcula à mão
`despesa/litro`, `preço sugerido = custoMedio + despesa/litro`, `lucro/litro =
praticado − sugerido` e `margem = lucro/praticado × 100`, que são exatamente
`despesaOperacionalPorLitro`, `lucroCombustivel` e `margemPercentual` de
`packages/utils/src/lucro.ts`. A reimplementação é algebricamente equivalente mas
**pula o `emCentavos`** (quantização para centavo) do módulo canônico — a
divergência é de arredondamento, portanto silenciosa. Caçar por:
```bash
grep -rnE 'custoMedio *\+|precoPraticado|profitPerLiter|suggestedPrice|totalDespesas */' \
  apps --include='*.ts' --include='*.tsx' | grep -vE 'node_modules|/dist/'
```

**Forma 2 — a margem inventada.** Um percentual fixo multiplicando a venda para
exibir "Lucro" (§6 proíbe: custo por litro nunca é valor fixo). Caçar por:
```bash
grep -rnE '\*\s*0\.[0-9]+' apps --include='*.tsx' --include='*.ts' \
  | grep -viE 'opacity|scale|duration|rgba|delay|width|height|blur'
```
O filtro de CSS não é opcional: sem ele o hit útil se perde em `0.5` de Tailwind.

**Onde NÃO procurar.** A soma dos 7 baldes de pagamento (`valor_pix + valor_dinheiro
+ …`) já foi consolidada em `conferido(meiosFromFechamentoRow(...))`. Os hits que
restam nesse formato são, na maioria, **um balde só por vez** para alimentar
gráfico/coluna — isso não é a fórmula de `valor_conferido`, é projeção de campo.
Só conta como violação quando os baldes são somados **entre si**.

Ver [[golden-master-como-conferir]] — mexer em qualquer uma das duas formas é
categoria domínio, não estrutural.
