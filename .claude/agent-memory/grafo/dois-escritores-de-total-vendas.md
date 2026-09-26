---
name: dois-escritores-de-total-vendas
description: Fechamento.total_vendas tem DOIS escritores que não se falam — o painel de fechamento-diário e consolidarFechamento do api-core; divergem na semântica de "não apurado"
metadata:
  type: project
---

`Fechamento.total_vendas` é gravado por **dois caminhos independentes**, e o
caminho do painel de fechamento diário **não** passa por `consolidarFechamento`.
Confirmado por grep em 20/09/2026.

**Escritor A — painel, aba Fechamento Diário**
`frontend/apps/web/src/components/fechamento-diario/hooks/useSubmissaoFechamento.ts:226`
grava `total_vendas: totalVendas`, vindo de
`hooks/useFechamento.ts:240` → `utils/calculators.ts:244 calcularTotais()`, que
soma em memória `(final − inicial) × bico.combustivel.preco_venda` a partir dos
inputs da tela. Grava **0** quando não há encerrante — não grava `null`.

**Escritor B — `consolidarFechamento`**
`frontend/packages/api-core/src/encerrante.ts:551-655`: relê `Leitura.valor_total`
do banco (`:575-579`), soma (`:621`), e chama `totaisDoDia()` de `@posto/utils`
(`frontend/packages/utils/src/fechamento.ts:118-134`, onde `totalVendas =
emCentavos(vendaConcentrador)`). Grava **`null`** em `total_vendas`/`diferenca`
quando o encerrante está ausente ou incompleto (`:620`, `:644-645`).
Chamadores: PWA frentista a cada envio (`frontend/apps/pwa-frentista/src/services/api.ts:111`),
`salvarLeituras` do api-core (`:529`), e o painel **só** pela tela Leituras
Diárias (`frontend/apps/web/src/components/leituras-diarias/hooks/useLeiturasDiarias.ts:134`
→ `services/api/consolidacao.service.ts:31`).

Os dois são **encerrante**, não soma de pagamento — mas divergem em (a) `0` vs
`null` para dia não apurado e (b) fonte do preço: A usa `preco_venda` do cadastro
(hoje) mesmo em dia histórico, B usa `Leitura.preco_litro` gravado.

**Why:** o Design Doc da API Laravel tratava isso como "decisão pendente do dono";
não é — são dois comportamentos já em produção, um deles violando a invariante
"NULL = não apurado" da migration `20260904_fechamento_nao_apurado_e_nulo.sql`.

**How to apply:** ao portar o fechamento para a API, portar B (é a canônica, usa
`@posto/utils`) e decidir explicitamente o que fazer com A — não assumir que são
a mesma conta.

Reconfirmar:
```bash
rg -n "total_vendas" frontend/apps/web/src/components/fechamento-diario/hooks/useSubmissaoFechamento.ts frontend/packages/api-core/src/encerrante.ts
rg -rn "reconsolidarDia|consolidarFechamento" frontend/apps frontend/packages --glob '!*.test.*'
```

Relacionado: [[preco-por-litro-duas-fontes]], [[orquestracao-do-dia-para-o-mes]].
