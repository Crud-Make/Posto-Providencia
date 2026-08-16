---
name: validacao-final-onde-parei
description: Estado em 16/08/2026 — branch test/validacao-final, o app do dono pronto e testado à mão, e as 5 pendências que impedem produção
metadata:
  type: project
---

Trabalho de 16/08/2026 sobre o app do dono e o encerrante. **Branch
`test/validacao-final`**, na worktree `.claude/worktrees/pwa-dono`, 21 commits
sobre `a7f495d`. A irmã `feat/pwa-dono-encerrante` está no remoto (empurrada
por outra sessão **antes** de o dono validar, contrariando o §9 — nada
mergeado).

Suíte ao fim: **296 vitest · 3204 golden · type-check limpo**.

**Entregue e provado com as mãos do dono, pelo celular:** o app grava os seis
bicos, os valores batem campo a campo com o banco, e o `consolidarFechamento`
sobe a soma para `Fechamento.total_vendas` com o sinal certo da diferença
(concentrador − conferido). O OCR foi medido de ponta a ponta com foto real do
spike: **6 de 6 bicos**, contra o gabarito, em 18,5s.

**As cinco pendências, e nenhuma é código do app:**

1. `supabase/migrations/20260816_fechamento_update_por_coluna.sql` — escrita,
   **não aplicada**. Tranca o UPDATE de `Fechamento` de 18 colunas para 5.
2. A proteção de custo da Edge Function (limite de taxa, teto de tamanho) está
   na branch `fix/custo-edge-function-encerrante` da outra sessão, **sem
   deploy**. Em produção a `ler-encerrante` roda com `verify_jwt = FALSE`:
   **nenhum token é exigido**, e cada foto custa duas chamadas ao Gemini.
3. `--read-only` fora do `.mcp.json` e `apply_migration` **ausente** da lista
   `deny` — apesar de o §14 do CLAUDE.md afirmar que está. Conferi no arquivo.
   Enquanto assim, qualquer sessão tem DDL aberto contra produção.
4. Nunca rodou em celular como app instalado, só no navegador do aparelho.
5. Sem projeto Vercel para o app novo.

**O plano do dono, e o que o bloqueia:** simular janeiro dia a dia pelo caminho
do frentista + encerrante e conferir contra a planilha, validando a orquestração
(dia → Visão do Proprietário → semanal → Planilha do Mês). **Não dá para
reconstruir janeiro pelo app**: ele grava sempre em `hojeIso()` e a janela da
RLS só aceita `hoje − 7 dias`. Ou entra por carga controlada, ou alguém decide
um modo retroativo — o que mexe em RLS. Ver [[app-do-dono-nasceu]].

Ficou pendente o mapa de **quem alimenta quem** do diário até a Planilha do Mês
— era o que o dono não sabia conciliar, e é por onde a próxima sessão começa.
