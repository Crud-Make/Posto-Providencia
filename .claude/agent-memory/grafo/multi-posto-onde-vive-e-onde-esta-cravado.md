---
name: multi-posto-onde-vive-e-onde-esta-cravado
description: O banco já tem Posto/posto_id/UsuarioPosto (migration 29/12/2025) e o web tem PostoContext; os dois PWAs cravam POSTO_ID = 1 e a RLS anon não filtra posto. DDL de Bico/Bomba/Tanque/Combustivel NÃO está no repo.
metadata:
  type: project
---

Levantado em 06/09/2026 para a pergunta "quanto o sistema está amarrado a um posto".

**Fato:** multi-posto existe no banco e no web, mas está desligado na prática.
- `supabase/migrations/20251229_create_posto_table.sql` cria `Posto` (3 linhas seed, ids 1–3) e
  `20251229_add_posto_id_columns.sql` adiciona `posto_id ... DEFAULT 1` a 19 tabelas + `UsuarioPosto`.
- Web: `frontend/apps/web/src/contexts/PostoContext.tsx` (default 1, localStorage, fallback hardcoded
  'Posto Providência'); `PostoSelector.tsx` é "modo posto único" (só exibe). O único dropdown que
  troca posto é `HeaderRegistroCompras.tsx` (`setPostoAtivoById`).
- PWAs: `const POSTO_ID = 1` em `frontend/apps/pwa-frentista/src/App.tsx`, `TanquesScreen.tsx`,
  `frontend/apps/pwa-dono/src/screens/EncerranteScreen.tsx`, `EnviosScreen.tsx`; `App.tsx` também crava
  `turnoId = 1` e `api.getOrCreateFechamento(..., usuarioId = 1)`.
- RLS: `user_has_posto_access(posto_id)` só nas policies `TO authenticated`; as `TO anon` (que os
  PWAs usam) são `USING (true)` — isolamento por posto no PWA é só o `.eq('posto_id')` do cliente.

**Armadilha:** o `CREATE TABLE` de `Bico`, `Bomba`, `Tanque`, `Combustivel`, `Estoque`, `Frentista`,
`Leitura`, `Fechamento` não existe em nenhum `.sql` do repo — nasceram pelo painel. A descrição
legível mais próxima é `frontend/packages/types/src/database.types.ts` (defasado: não tem HistoricoTanque,
Despesa nova, PresencaFrentista, InscricaoPush, AuditoriaDados).

**Tabelas sem posto_id** (nascidas depois de 29/12/2025 e não retroalimentadas): `HistoricoTanque`,
`InscricaoPush`, `AuditoriaDados`, `Parcela`, `PushToken`. `Despesa` só ganhou pela migration de
29/12 (o CREATE de 21/12 não tinha). `PresencaFrentista` tem.

**Cadastro de bico:** `GestaoBicos.tsx` tem botões ADICIONAR/editar/excluir SEM onClick — só lista.
`bicoService.create/update`, `tanqueService.create/delete`, `combustivelService.create/update`
não têm chamador na UI (buscado por símbolo). Bico entra por SQL/painel. O mapa rótulo→id dos 6
bicos atuais está em `scripts/carga-historico-leitura.py` (dict `BICOS`).

**Combustível fixo em 4:** RPC legado `get_fechamento_mensal` classifica por `c.nome ILIKE
'%GASOLINA%'/'%ETANOL%'/'%DIESEL%'` e devolve `vol_gasolina/adt/etanol/diesel`; consumido por
`frontend/apps/web/src/components/fechamento-mensal/index.tsx`. `combustivel.service.ts` tem
`ORDEM_COMBUSTIVEIS = ['GC','GA','ET','S10','DIESEL']`. OCR `ler-encerrante` assume "6 bicos" só
em comentário; o parser aceita N linhas.

Reconfirmar:
```bash
rg -n "POSTO_ID\s*=|postoId\s*=\s*1|turnoId\s*=\s*1|usuarioId: number = 1" apps --glob '*.ts' --glob '*.tsx'
rg -n -A3 'TO anon' supabase/migrations --glob '*.sql' | rg posto      # vazio = anon não filtra posto
rg -n 'onClick' frontend/apps/web/src/components/configuracoes/components/GestaoBicos.tsx  # vazio = só lista
rg -n 'setPostoAtivo(ById)?\(' frontend/apps/web/src | grep -v PostoContext      # quem troca posto na UI
rg -n 'CREATE TABLE[^;]*"Bico"' supabase/                              # vazio = DDL fora do repo
```
