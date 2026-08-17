---
name: validacao-final-onde-parei
description: Estado ao fim de 16/08/2026 — branch test/validacao-final com 30 commits, o que já foi provado, e a fila do que fazer em seguida
metadata:
  type: project
---

**Branch `test/validacao-final`**, worktree `.claude/worktrees/pwa-dono`, **30
commits** sobre `a7f495d`, árvore limpa. Suíte: **300 vitest · 3204 golden ·
type-check limpo**. Nada pushado por mim; nada aplicado em produção.

A irmã `feat/pwa-dono-encerrante` está no remoto em `1864546` — **antes** das
correções de turno e das cinco do code-review. Quem olhar o remoto não vê o que
importa.

## O que está PROVADO

O dono testou pelo celular: os seis bicos, campo a campo do app ao banco ao
painel. O OCR foi medido de ponta a ponta com foto real do spike — **6 de 6
bicos** contra o gabarito, 18,5s. A consolidação subiu a soma para
`Fechamento.total_vendas` com o sinal certo (`concentrador − conferido`).

## Estado do banco AGORA

Zerado a pedido do dono, para testar. Só cadastro (Posto, 6 Bicos, 4
Combustíveis, 4 Tanques, 3 Bombas, 3 Turnos, 12 Frentistas, 1 Fornecedor, 1
Usuário) mais **duas leituras de abertura**, ambas com 0 litros por desenho:

- **31/12/2025** — a base de janeiro, inserida da fonte via MCP
- **16/08/2026** — a leitura real de hoje, enviada pelo app do dono

`Fechamento`, `FechamentoFrentista`, `Recebimento`, `VendaProduto`, `Despesa`,
`Compra`, `HistoricoTanque`, `ganhos`, `parcelas`: **zeradas**. `Estoque` com as
4 linhas em zero (apagar quebraria a baixa em silêncio). `AuditoriaDados`
preservada de propósito — é o único rastro e não aparece em tela.

## A FILA — por onde começar

1. **Carregar janeiro** (`Fechamento` + `FechamentoFrentista`). A `Leitura` de
   janeiro tem que voltar também: eu apaguei as 186 linhas no wipe. Tudo está em
   `docs/data/posto_jorro_2026.sqlite`, com correspondência **1 para 1** já
   conferida: as 7 formas de pagamento ↔ os 7 baldes, e os 8 nomes de frentista
   ↔ a tabela, sem ambiguidade. Entra por MCP (roda como `postgres`, não passa
   pela janela de 7 dias da RLS) e o trigger de auditoria registra sozinho.
   ⚠️ **Combine o preço por período antes** — o app carimba o preço de HOJE, e
   janeiro entraria avaliado a preço de agosto. A fonte tem `valor_lt` por dia.
   ⚠️ **Bico 06 tem `valor_lt` NULO nas 198 linhas** — o preço dele sai de
   `venda ÷ litros`. Preço zero faz a linha mostrar venda R$ 0,00 com lucro
   positivo e derruba o preço médio do produto inteiro.

2. **Os 14 achados restantes do `/code-review`** (5 dos 19 já corrigidos).
   Os que mais pesam: erros de query engolidos em `use-planilha-do-banco` e
   `use-resumo-mensal` (leitura negada vira `[]`, e despesa negada vira despesa
   DOBRADA); `ajusteDespesa` órfão inflando o mês para sempre; `AuthContext` sem
   `.catch` travando a tela de carregamento; e a tarja **"8 recebidos"** que é
   contagem de frentistas ATIVOS, não de envios — a tela afirma que oito
   mandaram o caixa quando nenhum mandou.

3. **`ResumoMensal` é inalcançável** — só `CentroDoMesConectado` é montado.
   ~800 linhas, incluindo dois achados, que não serão exercitadas em validação
   de tela. Decidir: ligar ou remover.

4. **As cinco pendências de produção**, nenhuma de código do app: a migração
   `20260816_fechamento_update_por_coluna.sql` escrita e **não aplicada**; a
   proteção da Edge Function na branch `fix/custo-edge-function-encerrante`
   **sem deploy** (em produção `verify_jwt = FALSE` — nenhum token é exigido);
   `--read-only` fora do `.mcp.json` e `apply_migration` **ausente** da lista
   `deny`; nunca rodou como app instalado num celular; e sem projeto Vercel.

5. **Preço de venda não é editável em lugar nenhum** e não há histórico. Nada no
   código escreve `Combustivel.preco_venda`. O dono pediu alerta de mudança de
   preço; falta a tabela, o trigger e a tela. Ver [[app-do-dono-nasceu]].

## O que a sessão irmã está fazendo

`refactor/remove-turno-do-sistema` — o dono mandou tirar turno do sistema
inteiro. `encerrante.ts` foi liberado para ela. **Fica uma decisão do dono**: o
`TURNO_CANONICO` ainda acha o `Fechamento` do dia por `turno_id = 1`, e
`Fechamento` é por turno de verdade. Ver [[encerrante-nao-tem-turno]].

## Ferramentas novas desta sessão

- skill **`validar-feature-posto-providencia`** — as 6 provas, com a P2 (tela ×
  banco) sendo a que mais achou bug e a mais pulada.
- hook **`diario-de-sessoes`** — sessões passam a se enxergar, na abertura e no
  instante da escrita, atravessando worktrees pelo `.git` comum.
