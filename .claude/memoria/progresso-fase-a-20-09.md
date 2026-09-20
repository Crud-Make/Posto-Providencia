---
name: progresso-fase-a-20-09
description: 20/09 medido na fase-a — esquema 100%, escrita 0%, leitura <5%, produção ainda 100% Supabase; CCN e gates apurados
metadata:
  type: project
---

**Medido em 20/09/2026** contra `origin/fase-a` (91593a8), com a árvore extraída para scratchpad —
o checkout principal estava 48 commits atrás e produzia informação errada.

| camada | estado |
|---|---|
| esquema versionado | **100%** — 45/45 tabelas, diff vazio (desde 17/09, `banco/init/`) |
| Models no Laravel | 16 de 45; 21 das faltantes têm **0 linhas** — não é dívida |
| rotas na API | 11, **todas GET** |
| **escrita** | **0%** — nenhuma rota de escrita existe |
| frontend | 42 leituras diretas no Supabase + ~132 escritas |
| produção | **100% Supabase** — a Vercel não define `VITE_API_URL` |

O "~17% da Fase A" anotado antes é do plano da fase inteira (travas, docs, design docs), **não** da
saída do Supabase, que está no começo.

**Complexidade ciclomática (front, produção, 2331 funções):** 97,2% em CCN ≤ 10; **66 acima de 10**
em 52 arquivos; 9 acima de 20; nenhuma acima de 35. Backend: 121 métodos, **máximo 3**. O gate do
oxlint trava em 20 com isenção até 35 para 13 arquivos — **5 dessas isenções já não servem**
(1 aponta para arquivo apagado, `ValidationAlert.tsx`; 4 têm CCN ≤ 20). Receita em
[[medir-complexidade-ccn]].

**Dívidas de dinheiro:** 2 das 3 fechadas. A divergência das duas fórmulas de custo foi resolvida
em 03/09; a taxa de cartão descontada duas vezes, em 28/08. **Sobrou `totalTaxas` em float**, 3
cópias (`usePagamentos.ts:183` e `:193`, `useFechamento.ts:157`) — drift de 1–2 centavos por
pagamento, e o conserto certo é um helper em `packages/utils`, que é Fable-gated.

**O gargalo real não é lentidão, é bloqueio:** toda rota de escrita depende do guard da #102
(feito em 20/09) e de **três decisões do dono** no §7 de `fechamento-diario-api.md` — Estoque no
ressalvamento, DELETE+INSERT × UPSERT em `FechamentoFrentista`, e qual `total_vendas` vale.

Ver [[porque-multitenant-e-o-destino]] e [[tetos-de-qualidade-19-09]].
