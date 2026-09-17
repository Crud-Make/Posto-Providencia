---
name: preco-por-litro-duas-fontes
description: Preço por litro tem 2 fontes — Leitura.preco_litro (histórico, correto) e Combustivel.preco_venda (cadastro, "atual") — e vários hooks/services do web usam o cadastro em dia histórico
metadata:
  type: project
---

Preço por litro no sistema tem **duas fontes** (confirmado 14/08/2026):

- **Histórica/correta**: `Leitura.preco_litro` (+ `Leitura.valor_total`, gravado na
  submissão). É o que as RPCs usam (`get_dashboard_proprietario` em
  `supabase/migrations/20260802_rpc_custo_historico.sql`) e o `leitura.service.ts`.
- **Cadastro/"atual"**: `Combustivel.preco_venda` (tabela `Combustivel`). Usada em
  cálculo de dia histórico por: `useRelatorioDiario.ts`, `calculosResumo.ts`,
  `useLeituras.ts`, `TabelaLeituras.tsx`, `utils/calculators.ts` (vivo, importado
  por `useFechamento.ts`), `useCalculoGestaoBicos.ts`, `aggregator.service.ts`
  (fallbacks `|| preco_venda`).
- O PWA e o web **gravam** `preco_litro` copiando `combustivel.preco_venda` no
  momento da submissão (`EncerranteScreen.tsx`, `useSubmissaoFechamento.ts`,
  `useLeiturasDiarias.ts`) — correto no dia, desde que o cadastro esteja em dia.
- **Não há hardcode 6,98 em produção** — só no golden
  `custo-historico.golden.spec.ts` (correção documentada de dado) e num mock de teste.
- A RPC `custo_historico`/`get_dashboard_proprietario` não tem caller TS além do
  `useDashboardProprietario.ts` (`rpc('get_dashboard_proprietario')`).

**Why:** o dono viu janeiro calculado a R$ 6,98 (preço de julho) — o caminho errado
é qualquer leitura de `preco_venda` sobre dia passado.

**How to apply / reconferir:**
```bash
rg -n "preco_venda" frontend/apps/web/src --type ts -g '!*.test.*' | rg -v "types/|generated"
rg -n "preco_litro" apps packages supabase -g '*.ts' -g '*.sql'
```
