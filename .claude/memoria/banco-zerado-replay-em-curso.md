---
name: banco-zerado-replay-em-curso
description: Em 14/08 o dono mandou zerar TODO o dado transacional de produção e recomeçar por replay dia a dia pela UI — nada se aplica no banco sem ok explícito dele
metadata: 
  node_type: memory
  type: project
  originSessionId: e14ef858-7750-49c5-99d4-ecbc9f8e8f49
  modified: 2026-08-14T11:27:57.431Z
---

**Estado desde 14/08/2026, decisão explícita do dono.** As tabelas transacionais
de produção estão **zeradas de propósito**: `Leitura`, `Fechamento`,
`FechamentoFrentista`, `Recebimento`, `Compra`, `Despesa`, `Receita` = 0 linhas;
`Estoque`/`Tanque` zerados. Cadastros preservados. Contagem baixa aqui **não é
bug nem perda**: é o replay.

- **Backup completo pré-wipe:** `/mnt/dados/posto-backups/2026-08-14T101948Z/`
  (25 tabelas + `AuditoriaDados` com `dados_antes` + as 108 despesas em
  `despesa_lancada_pre_reset_108.json`). A `Despesa` é autoridade do rateio —
  restaurar dali quando o replay chegar em cada mês.
- **Modo de reconstrução:** dia a dia, PELA UI (painel/PWA), validando contra a
  planilha antes de avançar — protocolo da skill entrega-real. **Nenhum
  INSERT/DELETE por SQL sem ok explícito do dono** (ele barrou a recarga por
  script já pronta; os `carga-historico-*.py --sql` continuam válidos se ele
  mudar de ideia).
- Roteiro do dia 01/01/2026 já entregue ao dono (preços 6,28/6,28/4,58/6,28;
  gabarito: venda 9.430,34 · conferido 9.738,86 · diferença −308,52 SOBRA).
  Antes dele: reativar Barbra (id 3) e Sinho (id 5), hoje `ativo=false` —
  cadastro só conhece o "hoje", frentista desligado some do lançamento
  histórico (mesma lacuna de modelagem do preço único).
- Janeiro foi auditado ANTES do wipe: produção era idêntica à referência linha a
  linha (186 Leitura, 31 Fechamento, 180 FechamentoFrentista, 4 Compra), e o
  pipeline de ETL reproduz `docs/data/` byte a byte. O wipe foi decisão de
  processo, não correção de dado.
- **16/08:** o dado de teste do PWA (14 e 15/08 — 2 Fechamento ABERTO, 12
  Leitura, 4 FechamentoFrentista com observação "Fechamento via PWA
  Frentista") foi **apagado a pedido do dono**, antes de começar o replay, para
  não misturar teste com dado real. Dump em
  `/mnt/dados/posto-backups/2026-08-16-dado-teste-pwa.json`. Contagem
  reconferida em zero nas 7 tabelas transacionais. O replay ainda não começou:
  01/01 não foi lançado.
- **O lançamento do replay é MANUAL, pela UI, simulando o dono** — nada de
  INSERT por SQL, nem "para adiantar". SQL aqui só para conferir e para limpar
  dado de teste com ok explícito.
- **Armadilha do preço no lançamento:** o cadastro hoje está em
  6,98/6,98/4,98/7,38 e a tela carimba `preco_litro` a partir do preço exibido
  (`useSubmissaoFechamento.ts:142`). O preço da época se digita **na própria
  tela**, clicando no valor na tabela de leituras
  (`TabelaLeituras.tsx:177`) — sem isso o dia histórico nasce a preço de hoje.
- Agosto (nascido no app, ~R$ 56,6k conferido) e o restante só existem no
  backup. O dono também queria testar o fluxo real de envio pelo PWA (porta
  3016) — envio cai no dia corrente, vira dado de teste a limpar depois.
  Ver [[reset-do-painel-apaga-em-silencio]] e [[fix-preco-litro-historico]].
