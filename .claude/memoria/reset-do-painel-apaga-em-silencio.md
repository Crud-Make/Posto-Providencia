---
name: reset-do-painel-apaga-em-silencio
description: "O \"Resetar Sistema\" do painel roda como anônimo, apaga só o que a RLS deixa e reporta sucesso com zeros — e a \"janela de edição\" das policies cobre 1,5 mês, não 7 dias"
metadata: 
  node_type: memory
  type: project
  originSessionId: e14ef858-7750-49c5-99d4-ecbc9f8e8f49
  modified: 2026-08-14T11:28:13.676Z
---

**Medido em produção em 14/08/2026**, quando o dono clicou no reset
(`apps/web/src/components/configuracoes/` → `reset.service.ts`) e o app disse
"não apagou nada". Mentira dupla:

1. **Apagou, em silêncio parcial:** 152 `FechamentoFrentista` (julho inteiro +
   agosto), 36 `Leitura` (7 dias), 11 `Despesa` (julho, R$ 18.585,76) e 4
   `Recebimento`. `Fechamento` ficou intacto (anônimo sem policy de DELETE), e
   por isso o serviço mostrou "0 registros" como sucesso — `reset.service.ts`
   trata `data?.length || 0` como êxito; DELETE barrado por RLS **não dá erro**,
   devolve 0 linhas. Falha silenciosa clássica (Varredura 5 da skill
   entrega-real). O painel roda como `anon`: não há login.
2. **A janela das policies não é "7 dias":** `dentro_da_janela_de_edicao()` =
   `date_trunc('month', CURRENT_DATE - 1 month)` até `CURRENT_DATE + 2 dias`.
   Em 14/08 isso permitia a um anônimo apagar tudo desde 1º/julho em
   `FechamentoFrentista`/`Recebimento`/`Despesa`. Só `Leitura` tem janela de 7
   dias de verdade (`leitura_delete_janela_7d`).

**Pendências que isso abre (nenhuma corrigida ainda):** o serviço de reset
precisa acusar "nada foi apagado / apagado parcial" em vez de sucesso; e a
janela de DELETE anônimo merece revisão na Fase 2 da RLS. As linhas apagadas
naquele clique estão recuperáveis em `AuditoriaDados.dados_antes` e no backup
de [[banco-zerado-replay-em-curso]] (o wipe total veio logo depois, por decisão
do dono).
