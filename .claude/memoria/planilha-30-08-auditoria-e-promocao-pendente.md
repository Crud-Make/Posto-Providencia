---
name: planilha-30-08-auditoria-e-promocao-pendente
description: "30/08 — planilha nova (jan–ago, sha 3357eed9…) auditada contra o Supabase já carregado; ETL adaptado em fix/etl-planilha-30-08; docs/data NÃO promovido e 11 asserções de golden ficam vermelhas até o dono decidir"
metadata: 
  node_type: memory
  type: project
  originSessionId: 715dc866-f648-40c2-8f66-de926fbe6123
  modified: 2026-08-30T13:44:21.439Z
---

**[30/08/2026]** Chegou `~/Downloads/Posto,Jorro, 2026 (1).xlsx` (sha `3357eed9…`), copiada
para o nome canônico e para `/mnt/dados/backups-posto/Posto,Jorro, 2026 (2026-08-30).xlsx`;
a de 07/08 (`abecc283…`) ficou datada lá. Manifesto de ativos atualizado no mesmo commit.

**O Supabase já estava carregado jan–ago** (outra sessão, worktree `formula`, 30/08 10:15–10:21,
commits `5272df2`/`0214af6`). Checklist contra a planilha nova:
- **Compra** ✔ 32/32 linhas (litros, R$, custo/L) · **Leitura de agosto** ✔ 36.277,288 L, dia a dia.
- **Estoque (HistoricoTanque)** ✔ fev–ago; ✖ `31/01/2026` gravado 7.392/4.124/1.752/2.415 (a
  carga de fevereiro sobrescreveu o fechamento de janeiro 5.672/1.937/2.631/2.034 via
  `ON CONFLICT DO UPDATE`, porque a planilha abre fevereiro repetindo a abertura de janeiro).
  Planilha de **2025** fecha dezembro em 2.586/110/761/151 e tem só 3 dias — o 7.392 não vem dela.
- **Despesa** ✔ agosto (15.516,00 = planilha); jan–jul é a lista do app (§6). Julho foi
  **reescrito** na planilha: 13.961 → 19.271,95 (taxa cartão 1.902, CSLL 1.490,72, IRPJ
  1.238,23, Frete 4.200) e o app tem 18.585,76 com itens diferentes — decisão do dono.
- **Custo:** `Compra.custo_por_litro` ✔; `Combustivel.preco_custo`/`Estoque.custo_medio`
  parados em janeiro (só afetam "valor em estoque" do dashboard). `Fechamento.custo_*` = 0
  (carimbo que a UI não grava, já conhecido).
- **Estoque vivo** é derivado (`estoque-derivado.ts`), `Tanque.estoque_atual`=0 é irrelevante.
  Régua de agosto gravada como 31/08 embora o resumo tenha parado no dia 27.
- **30/08, com ok do dono:** `Compra` 73–76 e `Despesa` 262–270 de agosto redatadas de 31/08
  para **05/08** por SQL. Motivo: `intervaloDoMes` (`apps/web/src/utils/periodo.ts`) corta o
  mês corrente em *hoje*, e lançamento no último dia ficava invisível na Visão Proprietário
  (custo/litro "—", "sem despesa", só lucro bruto). **Carga futura: nunca datar no dia 31** —
  usar uma data ≤ hoje, ou o mês nasce "sem despesa" até virar.

**Branch `fix/etl-planilha-30-08`** (1 commit sobre `c4cbec4`): estágio 1 escolhe entre abas
duplicadas e marca `confere_parcial`; estágio 2 tem `DESPESA_PLANILHA_ESPERADA=161.283,22` e
`DESPESA_LANCADA_ESPERADA=210.746,40`. Staging limpo em `docs/data-staging/2026-08-30/`.

**Pendente, do dono:** promover `docs/data/` (`cp` dos 3 arquivos do staging) e decidir as 11
asserções de golden que apontam para a planilha velha — janeiro no resumo passou de 6,48 para
**6,38** (lucro jan 28.974,97 → 25.337,92), julho completo (1.188 → 1.404 leituras), compra de
julho 5,802 → 5,806. Golden contra a base nova roda com `scratchpad/prep-golden-novo.py`.

**How to apply:** não promova nem "conserte" golden sem o ok; a diferença é da planilha, não do
código. Ver [[zerado-28-08-carga-conferida-pendente]], [[duas-formulas-de-custo-divergem-no-mes]].


**Adendo 30/08 (noite), via #72:** a investigação do estoque negativo confirmou no banco vivo
os dois meses que esta auditoria marcou — a régua de **31/01** no Supabase é cópia da abertura
de 31/12 (7.392/4.124/1.752/2.415) e a de **31/07** (5.340/469/150/485) diverge do docs/data
atual (4.921/1.870/1.317/1.520). O código já se defende (corrente negativa → "não apurável",
PR #73, mergeado), mas **a correção das réguas em produção espera a decisão da promoção** — e
as compras da carga histórica seguem todas carimbadas no último dia do mês (limitação da
planilha, sem data por carga). Issue #72 está FECHADA; o que sobrou de dado mora aqui.
**30/08 (mais tarde): a régua de 31/01 FOI corrigida em produção** (ok do dono) para a medição
original — 5.672/1.937/2.631/2.034 — porque o valor da planilha nova era célula sobrescrita
(idêntico à abertura nos 4 combustíveis). Restam pendentes: **julho** (reescrito de propósito na
nova; banco já reflete a nova) e as datas de compra no fim do mês — os dois esperam a promoção.
