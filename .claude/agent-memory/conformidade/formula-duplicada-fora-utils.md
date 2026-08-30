---
name: formula-duplicada-fora-utils
description: As 5 formas que a fórmula de lucro duplicada fora de packages/utils assume neste repo — trio inline, margem hardcoded, fallback 0,45, rateio proporcional e o lucro sem despesa
metadata:
  type: project
---

A consolidação em `@posto/utils` já está **largamente feita** (dezenas de arquivos
importam `conferido`/`diferenca`/`cartao`; 6 sites já usam
`lucroCombustivel`/`despesaOperacionalPorLitro`/`margemPercentual`). O que sobra é
resíduo, e ele tem **cinco formas recorrentes**. Reconhecer a forma é o que economiza
a varredura — o grep sozinho não distingue nenhuma delas.

O canônico é `packages/utils/src/lucro.ts`:
`lucro = receita − litros × (custoMedio + despesaOperacionalPorLitro)`, quantizado
por `emCentavos`. Toda forma abaixo é um desvio dele.

**Forma 1 — o trio do lucro reimplementado inline.** Um service/hook calcula à mão
`despesa/litro`, `preço sugerido = custoMedio + despesa/litro`, `lucro/litro =
praticado − sugerido` e `margem = lucro/praticado × 100`. Algebricamente equivalente
mas **pula o `emCentavos`** — a divergência é de arredondamento, portanto silenciosa.
Os dois concentradores desta forma, conferidos 28/08/2026:
```bash
grep -n 'suggestedPrice\|profitPerLiter\|despesaPorLitro' apps/web/src/services/api/salesAnalysis.service.ts
grep -n 'Pura(' apps/web/src/components/registro-compras/hooks/useCalculosRegistro.ts
```

**Forma 2 — a margem inventada.** Um percentual fixo multiplicando a venda para
exibir "Lucro" (§6 proíbe: custo por litro nunca é valor fixo). Caçar por:
```bash
grep -rnE '\*\s*0\.[0-9]+' apps --include='*.tsx' --include='*.ts' \
  | grep -viE 'opacity|scale|duration|rgba|delay|width|height|blur'
```
O filtro de CSS não é opcional: sem ele o hit útil se perde em `0.5` de Tailwind.

**Forma 3 — o fallback hardcoded DEPOIS da chamada canônica.** A mais traiçoeira,
porque o arquivo importa `despesaOperacionalPorLitro` e o grep de fórmula passa
limpo: chama a função certa, e quando ela devolve 0 (mês sem despesa lançada)
substitui por um número fixo. Viola §6 do mesmo jeito, e o mês sem despesa é
justamente o mês em replay. Caçar por:
```bash
grep -rn "despesa_operacional_litro\|=== 0" apps/web/src/services/api/aggregator.service.ts
```

**Forma 4 — o rateio proporcional inventado.** Calcula um lucro total correto e
depois **distribui** entre frentistas/dias multiplicando pela venda de cada um
(`profit = totalSales × margemMedia`). O total fecha, cada linha é ficção: o
frentista que vendeu diesel e o que vendeu gasolina recebem a mesma margem.
```bash
grep -rn 'margemMedia\|totalLucroEstimado' apps/web/src/services/api/aggregator.service.ts
```

**Forma 5 — o lucro sem a despesa operacional.** `volume × (preçoVenda − custo)`,
sem o rateio. Sempre otimista. Aparece em tela de estoque e de vendas. **Um dos
sites já se declara aproximação num `@remarks`** (`useRelatorioDiario.ts`) — esse é
desvio consciente, não achado; os outros não se declaram.
```bash
grep -rnE '(preco_venda|precoVenda|precoDoDia).*-.*(preco_custo|custoMedio|precoCusto)' apps --include='*.ts' --include='*.tsx'
```

**Onde NÃO procurar.** A soma dos 7 baldes de pagamento (`valor_pix + valor_dinheiro
+ …`) já foi consolidada em `conferido(meiosFromFechamentoRow(...))`. Os hits que
restam nesse formato são, na maioria, **um balde só por vez** para alimentar
gráfico/coluna — isso não é a fórmula de `valor_conferido`, é projeção de campo.
Só conta como violação quando os baldes são somados **entre si**.

Ver [[golden-master-como-conferir]] (nenhuma destas formas tem golden — consolidar
exige escrever o teste contra as duas implementações ANTES, §7) e
[[taxa-cartao-deduzida-duas-vezes]].
