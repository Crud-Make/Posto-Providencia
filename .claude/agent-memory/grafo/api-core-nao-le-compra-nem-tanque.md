---
name: api-core-nao-le-compra-nem-tanque
description: packages/api-core só consulta Leitura/Bico/Fechamento; leitura de Compra e HistoricoTanque por período mora em widgets/hooks do web, não no pacote compartilhado
metadata:
  type: project
---

`packages/api-core` (confirmado 30/08/2026) não tem função alguma que leia `Compra` ou `HistoricoTanque`;
o único acesso a `preco_litro` é `getUltimosPrecosPorBico` (mapa bico→preço do último dia, sem período).
Quem lê Compra/HistoricoTanque por mês é `apps/web/src/widgets/resumo-mensal/model/use-resumo-mensal.ts`
e `apps/web/src/components/estoque/dashboard/hooks/useDashboardEstoque.ts` (este sem filtro de data).

**Why:** ao planejar a issue #61 (troca de preço × estoque) o grafo sugeria "api-core" como fonte; grep mostrou que não é.
**How to apply:** feature nova que precise dessas leituras por período ou cria função em api-core ou reaproveita o widget — não assuma que já existe.

Reconfirmar:
```bash
rg -n "from\('(Compra|HistoricoTanque)'\)" packages/api-core/src   # esperado: vazio
rg -n "from\('(Compra|HistoricoTanque)'\)" apps --glob '!*.test.*'
```
