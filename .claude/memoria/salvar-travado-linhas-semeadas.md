---
name: salvar-travado-linhas-semeadas
description: Salvar travado pelas linhas semeadas — corrigido e VALIDADO em uso real 19/08; branch fix/fechamento-linhas-vazias também ganhou o avanço automático de dia
metadata: 
  node_type: memory
  type: project
  originSessionId: a76892f6-3d8e-4527-b36b-dd5cb48882a8
  modified: 2026-08-20T01:52:44.351Z
---

**[19/08/2026]** Durante o replay de 01/01 (ver [[validacao-final-onde-parei]]), o "Salvar
Fechamento" do painel ficava desabilitado sem mensagem. Causa provada: `carregarSessoes` semeia
uma linha por frentista **ativo** (decisão de 20/01) e `temFrentistasVazios` contava linha
intocada como erro → `podeFechar` falso. Com 10 ativos e 5 trabalhando, todo dia do replay era
infechável. RLS não tinha culpa (janelas alargadas para `>= 2025-12-31`).

Branch `fix/fechamento-linhas-vazias`, **validada em uso real pelo dono em 19/08**:
- `85a4478` — linha sem lançamento = "não trabalhou hoje": não bloqueia, não vira registro.
  Critério puro `sessaoSemMovimento`/`sessaoBloqueiaFechamento` em
  `frontend/apps/web/src/utils/fechamentoMeios.ts`.
- `ecd3575` — pedido do dono na sequência: salvou, a tela avança para o dia seguinte e as
  iniciais herdam as finais (semeadura já existia no `useLeituras`; o avanço usa
  `somarDias`/`deIsoLocal` de `@posto/utils/data-local`). Se o dia salvo é hoje, não avança.

Prova: 01/01 FECHADO (5 sessões, diferença −308,52), tela abriu 02/01 com as 6 iniciais
idênticas às finais de 01/01. **Falta: PR + merge com ok do dono.**

**Atenção no replay:** o salvar de 01/01 criou **0 `Recebimento`** — a aba Financeiro estava
vazia. `get_dashboard_proprietario` calcula as taxas de cartão a partir de `Recebimento`; sem
eles, custo_taxas = 0 e o lucro líquido sai superestimado. Se o replay quiser taxas, a aba
Financeiro precisa ser preenchida antes do Salvar (ou automatizar a distribuição dos baldes).

Da mesma sessão: o vite da 3015 travou (aceitava conexão sem responder) e foi reiniciado — se a
tela congelar, checar o processo antes de culpar o app.
