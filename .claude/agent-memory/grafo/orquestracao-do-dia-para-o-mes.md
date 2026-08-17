---
name: orquestracao-do-dia-para-o-mes
description: Cadeia confirmada dia→semana→mês; só Fechamento tem agregado persistido, o resto é recalculado na leitura; pwa-dono só lança HOJE e o painel carimba preço do cadastro
metadata:
  type: reference
---

Mapa reconferido por Read em **16/08/2026**, no worktree `pwa-dono`. Substitui o
que estava espalhado em `nao-existe-agregado-mensal` e `sincronizacao-diario-mensal`
(as duas seguem válidas no essencial; o que mudou está marcado abaixo).

**Único agregado persistido é diário:** `Fechamento.total_vendas/total_recebido/
diferenca`. Semana e mês **não têm tabela, view nem cache** — são recalculados a
cada abertura de tela, sempre a partir de `Leitura` cru.

**O que mudou desde as memórias anteriores:**
- `consolidarFechamento` migrou para `packages/api-core/src/encerrante.ts` e é
  chamado pelos **dois** PWAs. O "pai que nasce zerado e nunca é atualizado"
  **acabou**: todo filho gravado reconsolida o pai.
- O filtro por turno saiu do `salvarLeituras` **e** da leitura de `Leitura` no
  `consolidarFechamento` — o índice único de produção é `(bico_id, data)`, sem
  turno.
- **`sinal-da-diferenca-do-painel` está OBSOLETA**: a inversão do `useFechamento`
  foi corrigida em 16/08 e o hook agora chama `diferenca()` de `@posto/utils`.
  Não existem mais duas convenções de sinal vivas.

**Armadilhas que custam caro e não se deduzem lendo o código de relance:**
- `apps/pwa-dono` grava sempre em `hojeIso()` — **não tem seletor de data**.
  Quem precisa de data retroativa usa o painel web ou o PWA do frentista (esse
  tem `<input type="date">`).
- `salvarLeituras` **apaga o dia inteiro** (`.eq('data').eq('posto_id')`, sem
  bico) antes de reinserir só as linhas enviadas: mandar 4 de 6 bicos apaga os
  outros 2.
- Painel e pwa-dono carimbam `preco_litro` a partir de `Combustivel.preco_venda`
  (**cadastro de hoje**), não do preço da época — ver [[preco-por-litro-duas-fontes]].
- `encerranteMensal` tira litros do salto do odômetro (fechamento − inicial) mas
  o R$ da soma dos dias lançados: **dia faltando não perde litro, perde venda**.
  O resíduo aparece em `litrosEmLacuna`/`diasEmLacuna`.
- `recarregar` do `usePlanilhaDoBanco` continua **sem caller**; o único re-fetch
  é `salvarMedicoes` chamando `carregar()`.

**How to apply / reconferir:**
```bash
# quem escreve o agregado diário
rg -n "total_vendas|total_recebido" apps packages scripts -g '*.ts' -g '*.tsx' -g '!*.test.*'
# de quais tabelas cada tela mensal come
rg -n "\.from\('[A-Za-z]+'\)" apps/web/src/widgets/planilha-do-mes/model/use-planilha-do-banco.ts
# a RPC do painel do dono soma Leitura, não Fechamento
rg -n "FROM \"Leitura\"|SUM\(" supabase/migrations/20260802_rpc_custo_historico_security_definer.sql
# não existe agregado semanal: só agrupamento em memória
rg -n "semanal" apps/web/src/components/financeiro/hooks/useFluxoCaixa.ts
```

Relacionado: [[janela-7-dias-bloqueia-lancamento-retroativo]], [[preco-por-litro-duas-fontes]].
