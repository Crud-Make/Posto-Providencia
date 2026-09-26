---
name: raio-de-impacto-do-total-vendas-do-painel
description: Por onde sai o `totalVendas` que o painel calcula — três destinos (tela, gravação legada Supabase, PUT da API) e quem valida cada um
metadata:
  type: project
---

Conferido por grep em **21/09/2026** (HEAD `71a3eb5`).

`totalVendas` nasce em um lugar só e sai por **três portas**:

1. **Nasce** em `useFechamento.ts:100-101` (`calcularTotais`, soma float de
   `litros × bico.combustivel.preco_venda`), é devolvido em `:248` e consumido
   por `fechamento-diario/index.tsx:149`.
2. **Tela:** `FooterAcoes.tsx:36` exibe, e `:71` decide "sem encerrante" por
   `totalVendas < 0.005`; `useFechamento.ts:156` calcula o percentual da
   diferença. A diferença da tela é a canônica (`diferencaCanonica` em `:149`).
3. **Gravação legada (Supabase):** `gravacaoLegadaSupabase.ts:228` grava
   `total_vendas` — e grava **0**, nunca `null`, defeito anotado no próprio
   arquivo em `:218-226`.
4. **API (#103 P11):** `montarDiaDeclarado.ts:138-144` quantiza com `emCentavos`
   e manda no PUT; manda `null` quando `!podeFechar` ou nenhuma leitura
   declarada (`:132-135`).

**O servidor não recalcula nada.** `backend/app/Fechamento/Domain/TotaisDeclarados.php:10-22`
só revalida `diferenca = total_vendas − total_recebido` exato em centavos
(`bccomp`), e `GravaFechamentoDoDia.php:37-38` diz explicitamente que não
recalcula. Como `montarDiaDeclarado` deriva a diferença do par já quantizado, a
validação passa **por construção** — o servidor nunca vai recusar o painel por
1 centavo. O `POST /api/fechamentos/{id}/consolidar` citado no Design Doc
(§7 d, `fase-a-laravel.md:91`) **não existe**: `rg consolidar backend/routes
backend/app` não devolve nada; a única rota de escrita é
`PUT fechamento` (`backend/routes/api.php:93`).

Quem importa o quê (grep fechado, não só grafo):
- `calcularTotais` só tem 2 importadores: `useFechamento.ts:20` e
  `calculators.golden.spec.ts:27` (`calculators.test.ts:3` importa só
  `calcularLitros`/`calcularVenda`).
- `useFechamento` só tem 2: `index.tsx:32` e o próprio `useFechamento.test.ts:6`.
- Nada nos PWAs toca nenhum dos dois.

**How to apply:** mudar a fonte do `totalVendas` mexe nos três destinos de uma
vez — e o destino que grava número em produção é o legado
(`gravacaoLegadaSupabase`), porque a rota da API nasce desligada (sem
`VITE_API_URL` na Vercel). Se o valor passar a poder ser `null`
(`totalVendasDoEncerrante` devolve `null` com menos bicos lidos que ativos), o
tipo de `FooterAcoes.totalVendas: number` (`:5`) e o teste vitest
`useFechamento.test.ts:90` são os dois primeiros a quebrar.

Reconfirmar:
```bash
cd /home/thygas/Projetos/trabalho/Posto-Providencia
rg -n "total_vendas" frontend/apps/web/src/components/fechamento-diario/hooks/{gravacaoLegadaSupabase.ts,montarDiaDeclarado.ts}
rg -rn "consolidar" backend/routes backend/app --glob '*.php'
```

Relacionado: [[p8-golden-feito-falta-consolidar]], [[dois-escritores-de-total-vendas]].
