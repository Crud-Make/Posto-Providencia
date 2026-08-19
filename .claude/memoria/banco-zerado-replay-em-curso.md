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

## 16/08/2026 — janeiro/2026 carregado (parcial)

Primeiro mês do replay entrou, por SQL, **com ok do dono**, a partir de
`docs/data/posto_jorro_2026.sqlite` (estágio 1/2 já promovidos):

| Tabela | Linhas | Total | Confere com a referência |
| --- | --- | --- | --- |
| `Leitura` | 186 (31 dias × 6 bicos) | 46.843,062 L · R$ 290.062,94 | litros exatos; venda +R$ 0,02 de arredondamento por dia |
| `Compra` | 4 (todas em 31/01, fornecedor 3) | 47.000 L · R$ 241.195,00 | sim |
| `HistoricoTanque` | 8 (abertura 31/12/2025, fecho 31/01) | 15.683 → 12.274 L | sim |
| `Despesa` | **0 — pendente** | — | decisão da fonte em aberto |

Scripts usados: `carga-historico-leitura.py`, `carga-historico-compra.py` (já
existiam) e `carga-historico-tanque.py` (**novo**, escrito nesta sessão). Todos
emitem SQL idempotente e não escrevem sozinhos.

**Como aplicar SQL grande sem colar no chat:** a API de management aceita o
arquivo direto, e o `User-Agent` é **obrigatório** (o WAF devolve 403 code 1010
sem ele). Token em `.claude/settings.local.json` → `env.SUPABASE_ACCESS_TOKEN`.

**A despesa de janeiro ficou de fora de propósito**, porque as fontes discordam:
`despesa_categoria_mensal` (15 itens) soma **R$ 22.158,46** e é o que faz o
`lucro_bico` da planilha bater; `despesa_lancada` (21 itens, exportado da própria
tabela `Despesa` do app antes do wipe) soma **R$ 35.523,58** e inclui gastos
reais que a planilha não registra (Bombeiro AVCB, conserto de bomba, extintor,
Luz, Net, Embasa). Pelo §6 — *toda despesa entra no rateio, sem exceção* — a
lista do banco é a autoridade, e a planilha subregistra. Diferença: R$ 13.365,12
em janeiro. **Decisão do dono ainda não tomada.**
