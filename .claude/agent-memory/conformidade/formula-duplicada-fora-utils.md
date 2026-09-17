---
name: formula-duplicada-fora-utils
description: As formas que a fórmula de lucro fora de frontend/packages/utils assume neste repo — trio inline (hoje em módulo com golden), margem hardcoded, lucro sem despesa; fallback 0,45 e rateio proporcional JÁ SAÍRAM do aggregator (17/09/2026)
metadata:
  type: project
---

A consolidação em `@posto/utils` está **largamente feita** (102 arquivos em `frontend/apps/`
importam `@posto/utils` em 17/09/2026 — reconte com
`grep -rl "from '@posto/utils'" apps --include='*.ts' --include='*.tsx' | wc -l`).
O que sobra é resíduo, e reconhecer a forma é o que economiza a varredura — o grep
sozinho não distingue nenhuma delas.

O canônico é `frontend/packages/utils/src/lucro.ts`:
`lucro = receita − litros × (custoMedio + despesaOperacionalPorLitro)`, quantizado
por `emCentavos`. Toda forma abaixo é um desvio dele.

**Forma 1 — o trio do lucro reimplementado inline.** `despesa/litro`, `preço sugerido
= custoMedio + despesa/litro`, `lucro/litro = praticado − sugerido`, `margem`.
**Estado em 17/09/2026:** os dois concentradores viraram módulos que **delegam** o
lucro total à canônica e mantêm inline só o que não é dinheiro final
(`suggestedPrice`, `profitPerLiter`, `cmv`), cada um com `*.golden.spec.ts` ao lado.
Continuam **fora de `frontend/packages/utils`** — é dívida de locality, não de fórmula errada:
```bash
grep -nE 'suggestedPrice|profitPerLiter|cmv' frontend/apps/web/src/services/api/calculos-analise-vendas.ts
grep -nE 'Pura\(|precoVenda - custoVenda' frontend/apps/web/src/components/registro-compras/hooks/useCalculosRegistro.ts
ls frontend/apps/web/src/services/api/calculos-analise-vendas.golden.spec.ts frontend/apps/web/src/components/registro-compras/hooks/useCalculosRegistro.golden.spec.ts
```
O inventário de "módulo de fórmula em app, com ou sem teste" sai deste laço — é o
que responde "quanto ainda mora fora de utils":
```bash
for f in frontend/apps/web/src/services/*.ts frontend/apps/web/src/services/api/calculos-*.ts frontend/apps/web/src/utils/*.ts; do case $f in *test.ts|*spec.ts) continue;; esac; echo "$f golden=$(ls ${f%.ts}.golden.spec.ts 2>/dev/null) test=$(ls ${f%.ts}.test.ts 2>/dev/null) utils=$(grep -c '@posto/utils' $f)"; done
```
Em 17/09 só `aiService.ts` (272 L) e `stockService.ts` (140 L) estavam sem teste e sem
`@posto/utils` — e os dois delegam a conta a um `calculos-*.ts` testado; a
aritmética própria deles é de estoque em litros, não de dinheiro.

**Forma 2 — a margem inventada.** Percentual fixo multiplicando a venda (§6 proíbe).
```bash
grep -rnE '\*\s*0\.[0-9]+' apps --include='*.tsx' --include='*.ts' \
  | grep -viE 'opacity|scale|duration|rgba|delay|width|height|blur'
```
O filtro de CSS não é opcional. Em 17/09 os 3 hits restantes são `fontSize * 0.36`
(avatar) e `avg * 0.6` (heurística de dia fraco no `aiService`) — **nenhum é dinheiro**.

**Forma 3 — fallback hardcoded DEPOIS da chamada canônica** (config
`despesa_operacional_litro` = 0,45). **REMOVIDA** — o `@remarks` de
`despesaOperacionalMensal` em `aggregator.service.ts` documenta a remoção. Reconfirmar
que segue fora (vazio = removido):
```bash
grep -n "despesa_operacional_litro" frontend/apps/web/src/services/api/aggregator.service.ts | grep -v '^\s*[0-9]*:\s*\*'
```

**Forma 4 — o rateio proporcional** (`profit = totalSales × margemMedia`).
**REMOVIDA** — o `performanceData` do aggregator hoje ranqueia por venda conferida e
o comentário explica por quê. Reconfirmar (vazio = removido):
```bash
grep -n 'margemMedia' frontend/apps/web/src/services/api/aggregator.service.ts
```

**Forma 5 — o lucro sem a despesa operacional.** `volume × (preçoVenda − custo)`.
Em 17/09 resta **um** site, e ele se declara: `useRelatorioDiario.ts` diz no JSDoc
"lucro bruto por litro, sem rateio; a despesa do dia é subtraída no total". Desvio
consciente, não achado — só vira achado se aparecer outro sem o `@remarks`.
```bash
grep -rnE '(preco_venda|precoVenda|precoDoDia)\s*-\s*(preco_custo|custoMedio|precoCusto|custoLitro)' apps --include='*.ts' --include='*.tsx' | grep -vE 'test\.|spec\.'
```

**Forma em SQL — lucro bruto dentro de RPC.** `get_dashboard_proprietario`
(`supabase/migrations/20260828_rpc_taxa_cartao_e_despesa_do_mes.sql`) calcula
`Σ litros × (preco_litro − custo_da_época)` em plpgsql. O golden
`frontend/packages/utils/src/custo-historico.golden.spec.ts` cobre a **reimplementação em TS**
da mesma conta, não o SQL — a RPC em si não tem teste que a execute. Consumida por:
```bash
grep -rn "rpc('get_dashboard_proprietario'" apps --include='*.ts' --include='*.tsx'
```

**Onde NÃO procurar.** A soma dos baldes de pagamento já é
`conferido(meiosFromFechamentoRow(...))` — o grep `valor_x + valor_y` dá **zero** em
17/09. Os `reduce` que restam (`TabelaConciliacaoFrentistas.tsx`, `useFinanceiro.ts`,
`useDashboardProprietario.ts`) somam **um balde por vez** ou **uma coluna já gravada**
— projeção de campo, não fórmula. Só conta quando os baldes são somados entre si.

Ver [[residuo-na-fronteira-hook-utils]] (6ª forma), [[taxa-cartao-deduzida-duas-vezes]]
e [[golden-master-como-conferir]].
