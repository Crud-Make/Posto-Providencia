---
name: p8-golden-feito-falta-consolidar
description: P8 (#103) — o golden das duas contas de total_vendas JÁ existe desde 21/09; falta só a consolidação, e a divergência de janeiro é de PREÇO, não de float
metadata:
  type: project
---

Conferido em **21/09/2026** por grep, contra o `graphify-out/` gerado 22:16 do
mesmo dia (HEAD `71a3eb5`).

O enunciado da fatia P8 (e o Design Doc `fechamento-diario-api.md:307`, §7 d)
afirma que "nenhum golden hoje exercita `useFechamento` nem `calculators.ts`" e
que o comentário de `useFechamento.ts:137` mente. **Isso envelheceu**: o commit
`ef42ea0` ("golden das duas contas de total_vendas") criou os dois goldens, e o
comentário do hook foi reescrito em 20/09 e hoje está correto.

O que está feito e o que falta:

- **Feito:** `frontend/apps/web/src/utils/calculators.golden.spec.ts` (chama o
  `calcularTotais` real com os tipos da UI) e
  `frontend/packages/utils/src/total-vendas-encerrante.golden.spec.ts` (o lado do
  pacote, com canário B anotado em `:193-196`).
- **Falta:** a troca do call site.
  `frontend/apps/web/src/components/fechamento-diario/hooks/useFechamento.ts:101`
  ainda chama `calcularTotais`. `totalVendasDoEncerrante`
  (`frontend/packages/utils/src/leitura.ts:77`) **não tem nenhum consumidor de
  produção** — só os dois goldens; em `useFechamento.ts:144` o nome aparece só
  em comentário (a armadilha de grep cru de identificador).

**A causa da divergência é PREÇO, não float.** O golden prova nos 31 dias que ao
preço DO DIA o `calcularTotais` em float reproduz a planilha ao centavo
(`calculators.golden.spec.ts:134-139`); os R$ 23.784,61 a mais em janeiro
aparecem só ao preço de HOJE (`bico.combustivel.preco_venda`). Trocar apenas a
função somadora **não** apaga a divergência: enquanto a entrada for
`preco_venda` do cadastro, o número muda pouco. Quem já corrige o preço ao
reabrir dia salvo é `useLeituras.ts:301-302` → `useCarregamentoDados.ts:103`
(sobreposição em memória), e isso não vale para dia ainda não salvo.

**Why:** a fatia foi escrita como "escrever o golden e consolidar"; metade dela
já subiu, e planejar de novo a metade feita gastaria a rodada e reescreveria
golden verde.

**How to apply:** ao planejar/retomar a P8, o passo é só a consolidação + o
destino de `calculators.ts`, com os dois goldens verdes antes e depois de CADA
troca. Reconfirmar:

```bash
cd /home/thygas/Projetos/trabalho/Posto-Providencia
rg -n "calcularTotais|totalVendasDoEncerrante" frontend/apps/web/src/components/fechamento-diario/hooks/useFechamento.ts
rg -rn "totalVendasDoEncerrante" frontend --glob '!node_modules' --glob '!*.spec.ts'
git log --oneline -3 -- frontend/apps/web/src/utils/calculators.golden.spec.ts
```

Relacionado: [[dois-escritores-de-total-vendas]], [[preco-por-litro-duas-fontes]],
[[raio-de-impacto-do-total-vendas-do-painel]].
