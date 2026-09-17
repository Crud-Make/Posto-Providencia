---
name: auditoria-03-09-veredito-e-bugs-de-dinheiro
description: "03–04/09/2026 — veredito PROTÓTIPO (frentistas em produção real, dono não fecha o ciclo); 3 bugs de dinheiro corrigidos (PR #80 mergeado, PR #81 aberto); migration de NULL já em produção; o que ficou registrado e não feito"
metadata:
  type: project
---

**[03/09/2026]** Auditoria de entrega (skill `entrega-real`) do sistema inteiro: **PROTÓTIPO**, com
uma nuance que importa — **4 frentistas (Leandro, Filip, Paulo, Nayla) mandam o caixa pelo PWA
todo dia desde 30/08, sozinhos**. A metade do frentista está em produção real. A do dono não: zero
`Leitura` desde 30/08 (o Elias está abrindo o 2º posto e não manda encerrante), pai do dia nunca
consolidado. Elias ciente; a planilha de 30/08 ainda tinha agosto preenchido em paralelo.

**Corrigido e mergeado — PR #80 (`5657237`, `fix/lucro-fonte-unica`):**
- Card Receitas/Despesas lia `Fechamento.lucro_*` carimbado (sempre 0) → janeiro mostrava R$ 253 mil
  de líquido. Agora calcula da fonte (`custoLitrosVendidos`, novo em `@posto/utils/lucro`, golden
  pela identidade `lucro = venda − custo − despesas` no mês 01). **Falta de caixa saiu do lucro**
  (dono): o agente `planilha` provou contra a planilha de 30/08 que a fórmula fecha em 0,00 com o
  `J11` dela e que ela não desconta `Falta.`. Janeiro: 13.272,20 no card × 25.337,92 na planilha —
  diferença é preço fixo 6,38 × preço do dia, e lista de despesa app × planilha (decisão pendente).
- `/dashboard`, `/analise-custos`, `/vendas/dashboard` liam `Estoque.custo_medio` congelado em
  janeiro (Diesel a 5,38 com compra de agosto a 6,50). Agora compra do mês via
  `frontend/apps/web/src/services/custo-do-mes.ts`; `compra.service` parou de carimbar. `/analise-custos`
  estava **quebrada** (`.bind()` sem tipo → envelope no lugar do array) e entrou no menu, só simulador.

**Corrigido, PR #81 aberto (`fix/fechamento-nao-apurado-e-nulo`) — bug 3b:**
- `Fechamento.total_vendas`/`diferenca` aceitam NULL (= não apurado). **Migration
  `20260904_fechamento_nao_apurado_e_nulo.sql` JÁ APLICADA em produção** em 04/09 via
  `bun scripts/aplica-migration.ts` (novo; API de management, token do `settings.local.json`).
- Painel reconsolida ao salvar leituras (`consolidacao.service.ts`); `scripts/reconsolidar-dia.ts`
  para dado via SQL — rodado: 28/08 FALTA 119,77 · 29/08 SOBRA 3,96 · 30/08–03/09 não apurados.
- `@supabase/supabase-js` alinhado em ^2.97.0 na raiz (dono). Primeiro teste do `api-core`.
- Sem trigger SQL de propósito: fórmula fica em `@posto/utils`, cópia em SQL não teria golden.

**Registrado e NÃO feito (por prioridade):** Issue #27 (`/dashboard` rateia despesa pelo mês
corrente — agosto dá 50.948 lá e 35.432 na Análise de Custos); `/vendas/dashboard` cortado em 1.000
linhas (agosto 17.706 L × 36.277 L); bug 3a (relatório diário filtra `Leitura` por `turno_id`, painel
grava `null`); `custoMedioPonderado` + `salesAnalysis` fallback no carimbo; `ResumoMensal` morto (490
linhas, zero importadores); Configurações lê envelope errado (listas vazias); `aiService` com sinal
da quebra invertido; dashboard pinta OK para 0<|dif|≤50; Despesa anon aberta (migration 16/08 não
aplicada — confirmar se o Elias loga no painel antes); `ler-encerrante` v9 de 26/07 sem o fix
(`verify_jwt=false`); `.mcp.json` sem `--read-only`; UNIQUE `(data, turno_id)` sem `posto_id` (2º posto).

**How to apply:** o veredito só muda com o dono fechando o ciclo — leitura de bico diária +
consolidação — e com 2 semanas medidas de correções por falha do sistema. Nada de código resolve
isso. Ver [[card-receitas-despesas-le-coluna-carimbada]], [[duas-formulas-de-custo-divergem-no-mes]],
[[doze-dias-nunca-fechados]].

## Fechamento 06/09/2026 — a lista de código da auditoria acabou

**10 PRs mergeados (#80–#89)**, tudo na `main`. Além dos três de 03–04/09: #82 dashboard rateia
despesa pelo mês filtrado; #83 vendas/dashboard sem o corte de 1.000 linhas; #84 relatório diário
sem turno e custeando pela compra do mês (bug 3a); #85 `custoMedioPonderado` apagada e
`/vendas/analise` sem o carimbo; #86 `ResumoMensal` morto apagado (−806 linhas); #87 Configurações
voltou a listar produtos/bicos/formas (vazia desde 22/02); #88 `ler-encerrante` **v11 em produção**
com guardas e `verify_jwt=true` (deploy pela CLI, feito pelo dono na mão; `supabase/config.toml`
novo); #89 `--read-only` e `apply_migration` na `deny` de volta.

**Estado do custo/lucro:** uma fórmula (`custoMedioCompra`), uma porta (`custo-do-mes.ts`),
nenhuma tela lendo cadastro ou carimbo. Julho dá R$ 29.318,1x na Visão Proprietário e na
`/vendas/analise` — pela primeira vez o mesmo número em duas telas.

**O que ficou (por decisão, não por falta de tempo):**
- Despesa aberta para anon — migration de 16/08 pronta; aplicar depende de "o Elias lança despesa
  logado no painel?" (sem login, quebra a tela de despesas dele).
- Cosméticos: formas de pagamento todas "Outros" em Configurações; `aiService` com sinal da quebra
  invertido; dashboard pinta OK para 0<|dif|≤50; consolidação por anon falha em silêncio fora da
  janela de edição; UNIQUE `(data, turno_id)` sem `posto_id` (2º posto).
- `Estoque.custo_medio` e `Fechamento.lucro_*` seguem no banco sem escritor de UI — dropar é
  migration à parte.
- **O que nenhum código resolve:** o Elias mandar o encerrante todo dia. Sem isso, setembro segue
  "não apurado" — honesto, mas não é o número que ele precisa. Veredito continua PROTÓTIPO até
  duas semanas de uso medido.

**Permissões:** o classificador do modo automático barra deploy/DDL em produção e barra o agente
escrever a própria regra em `settings.local.json`. O que funcionou: migration pelo
`bun scripts/aplica-migration.ts` (coberto por `Bash(bun *)`); deploy de função só pelo dono com
`! supabase functions deploy …` no prompt.
