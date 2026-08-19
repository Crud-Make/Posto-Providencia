---
name: janela-7-dias-bloqueia-lancamento-retroativo
description: RLS prende o INSERT de Leitura/Fechamento/FechamentoFrentista/Recebimento aos últimos 7 dias (anon E authenticated); Despesa/HistoricoTanque foram deixadas de fora da janela de propósito
metadata:
  type: project
---

Simular um mês passado (janeiro) lançando pelo app esbarra na RLS **antes** de
esbarrar em qualquer regra de cálculo. Confirmado por Read nas migrations em
16/08/2026.

- `dentro_da_janela_de_escrita(quando)` = `quando >= CURRENT_DATE - 7 days AND
  quando < CURRENT_DATE + 2 days`.
- Vale para **INSERT** em `Leitura`, `Fechamento`, `FechamentoFrentista` e
  `Recebimento`, e o `TO` da policy é **`anon, authenticated`** — logar não
  contorna. `FechamentoFrentista`/`Recebimento` herdam a janela do pai por
  `fechamento_id`.
- **`Despesa` e `HistoricoTanque` ficaram FORA da janela de propósito**, e as
  próprias migrations de 16/08 dizem o porquê: "lançar janeiro exige escrever em
  31/12". Elas exigem só `auth.role() = 'authenticated'`.

**Consequência prática:** num replay de mês antigo, o bloco de venda (litros e
R$) é o que trava; despesa, compra e medição de tanque passam. O resultado é uma
Planilha do Mês com despesa e compra preenchidas e venda vazia — que é pior que
falhar inteiro, porque o custo por litro divide por litros = 0.

**Why:** o dono planejou reconstruir janeiro dia a dia pelo caminho
frentista + encerrante. A trava é de 02/08 e não foi relaxada por nenhuma
migration posterior — o plano precisa decidir isso antes de começar, não no
dia 12.

**How to apply / reconferir** (é migration; se está aplicado em produção quem
responde é o agente `rls`):
```bash
rg -n "dentro_da_janela_de_escrita|FOR INSERT TO" supabase/migrations/20260802_trava_insert_janela_tabelas_dinheiro.sql
rg -ln "dentro_da_janela_de_escrita" supabase/migrations/*.sql   # ver se alguma posterior relaxou
rg -n "janela|authenticated" supabase/migrations/20260816_rls_despesa_escrita_anonima.sql
```

Relacionado: [[orquestracao-do-dia-para-o-mes]].
