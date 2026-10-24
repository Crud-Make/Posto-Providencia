---
name: despesa-tela-compras-vs-planilha-mes
description: A "Despesa do Mês" da tela de Compras HOJE lê a tabela Despesa (useDespesaDoMes); o input digitado de 19/08 não existe mais. Mesma fonte do useCustoMensal, mas outra cópia da query.
metadata:
  type: project
---

**[22/09/2026 — substitui a versão de 19/08, que dizia que o campo era `useState` digitado e
efêmero. Isso deixou de ser verdade.]**

A tela Registro de Compras lê a despesa do mês da tabela `Despesa` por
`frontend/apps/web/src/components/registro-compras/hooks/useDespesaDoMes.ts` (chamado em
`registro-compras/index.tsx`), e passa para `useCalculosRegistro` ("Valor p/ Venda").
É a mesma fonte que `useCustoMensal` (aba Gestão de Bicos) e `use-resumo-mensal.ts` usam —
mas são **três cópias da mesma query** `Despesa.valor` por `posto_id` e
`intervaloDoMes(mes, hoje)`, cada uma somando no cliente. Não há conta divergente entre elas;
o risco é uma mudar a janela e as outras não.

**Why:** pergunta de dinheiro recorrente ("a despesa da tela de Compras mexe no lucro?"). Hoje as
duas telas leem a mesma tabela; a memória antiga respondia "são caminhos separados" e estava errada.
**How to apply:** ao migrar leitura de Despesa para a API, trocar as três cópias, não só uma.
Ver [[mapa-implementacoes-de-custo]] e [[dashboard-da-api-ja-entrega-compra-e-despesa]].

Reconfirmar:
```
rg -n "from\('Despesa'\)" frontend/apps -g '*.ts' -g '*.tsx' -g '!*.test.*'
rg -n "useDespesaDoMes" frontend/apps/web/src
```
