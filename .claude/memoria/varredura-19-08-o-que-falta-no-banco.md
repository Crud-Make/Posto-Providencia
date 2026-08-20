---
name: varredura-19-08-o-que-falta-no-banco
description: "Pós-merge dos PRs #52/#53 (19/08) — a migration do unique de FechamentoFrentista está ESCRITA mas NÃO aplicada; a policy de DELETE já foi alinhada por ALTER POLICY"
metadata: 
  node_type: memory
  type: project
  originSessionId: a83bf8f5-e56b-4a69-abde-474716a7d603
  modified: 2026-08-19T23:51:08.720Z
---

Em 19/08/2026 os PRs #52 e #53 foram mergeados na `main` (fix do envio do PWA que sumia/nunca aparecia, Caixa Geral e preço digitados que se perdiam, corrida de data no pwa-dono, travas do PWA do frentista).

**Pendente no banco (produção):**
- `supabase/migrations/20260819_fechamento_frentista_unico_por_dia.sql` — `unique (fechamento_id, frentista_id)` em `FechamentoFrentista` — **NÃO aplicada**. O app bloqueia duplicata na UI, mas o banco ainda aceita. Antes de aplicar: conferir se o replay/carga histórica não insere mais de um envio por frentista por fechamento, e checar duplicatas existentes (`select fechamento_id, frentista_id, count(*) ... having count(*)>1`).
- A policy `leitura_delete_janela_7d` **já foi corrigida em produção** (19/08, `ALTER POLICY ... TO anon, authenticated`) — não reaplicar.
- A janela de escrita larga (replay) segue ativa; o par `20260819_janela_escrita_volta_aos_7_dias.sql` existe para o fim do replay.

**Why:** migration escrita e não aplicada é exatamente o tipo de instrução que sobrevive à ferramenta — sem esta nota, a trava de duplicata parece existir e não existe.

**How to apply:** ao fechar o replay ou ao mexer em `FechamentoFrentista`, aplicar o unique (com ok do dono) e depois o par que devolve os 7 dias. Ver [[banco-zerado-replay-em-curso]] e [[travas-mcp-destravadas]].
