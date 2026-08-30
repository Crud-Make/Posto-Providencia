---
name: zerado-28-08-carga-conferida-pendente
description: "28/08 — banco zerado de novo (backup em /mnt/dados), referência conferida contra a planilha nos 7 meses, carga 01–07 pronta mas NÃO aplicada; dono pediu para esperar outra sessão terminar uma auditoria"
metadata: 
  node_type: memory
  type: project
  originSessionId: fd201e90-7080-4de5-9e67-2029dc97171a
  modified: 2026-08-28T11:42:01.684Z
---

**[28/08/2026]** O dono mandou "zerar tudo e conferir a planilha" antes de carregar os
meses 01–07. Feito:

- **Backup** do banco antes do wipe: `/mnt/dados/posto-backups/2026-08-28-pre-zerar.json`
  (30 Leitura, 11 Fechamento, 35 sessões, 4 Recebimento, 4 Compra, 15 Despesa, 4 HistoricoTanque).
  Continha 01–03/01 do replay manual **e envios reais do PWA de 20–27/08** (Leandro, Paulo,
  Filip, Nayla) — só existem nesse arquivo agora.
- **Zerado:** Fechamento/FechamentoFrentista/Recebimento/Compra/Despesa = 0, Estoque em 0.
  Ficou a base de 31/12/2025 (6 Leitura + 4 HistoricoTanque). Substitui o estado de
  [[replay-janeiro-compras-despesas-lancadas]] e [[salvar-travado-linhas-semeadas]].
- **Conferência (agente planilha):** `docs/data/posto_jorro_2026.sqlite` bate com a aba
  `POSTO JORRO 2026` em litros, venda, compra, estoque e despesa nos 7 meses. Golden 3233/0.
- **Scripts `carga-historico-*` em modo confere:** passam em 01–07, exceto **fechamento de julho**
  (abort `Posto - Jorro`; conserto em `scripts/etl-estagio1-staging.py:268` + reprocessar ETL +
  dono promove `docs/data/`). Ver [[estado-etl-estagio2]].

**Carga NÃO aplicada.** O dono disse que outra sessão está "organizando algumas coisas" e
quer esperar essa auditoria terminar. Quando liberar: SQL via API de management (token em
`.claude/settings.local.json`, `User-Agent` obrigatório), mês a mês, ordem Leitura → Compra →
Tanque → Despesa (`--fonte planilha`) → Fechamento, conferindo cada mês contra a tabela da
conferência. `Recebimento` fica 0 por desenho.

**How to apply:** antes de carregar, reconferir contagem no banco (pode ter mudado pela outra
sessão) e perguntar se a auditoria acabou.
