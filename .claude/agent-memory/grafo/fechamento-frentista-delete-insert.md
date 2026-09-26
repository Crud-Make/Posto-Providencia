---
name: fechamento-frentista-delete-insert
description: FechamentoFrentista é DELETE+INSERT pelo painel e INSERT puro pelo PWA; o unique (fechamento_id, frentista_id) JÁ está no esquema base — corrige a memória antiga de "escrito e não aplicado"
metadata:
  type: project
---

Como `FechamentoFrentista` é gravado (confirmado por grep em 20/09/2026):

- **Painel** (`fechamento-diario`): `DELETE` por `fechamento_id` seguido de
  `INSERT` em lote. Nunca `upsert`, nunca `update` linha a linha.
  `hooks/useSubmissaoFechamento.ts:116` → `services/api/fechamentoFrentista.service.ts:246-257`
  (`.delete().eq('fechamento_id', …)`), depois `:199` → `:109-115` (`.insert(items)`).
  Antes do DELETE o service desvincula `Notificacao`, `NotaFrentista` e
  `VendaProduto` (`:196-240`) para não bater em FK.
- **PWA frentista**: `INSERT` puro, um envio por vez
  (`frontend/apps/pwa-frentista/src/services/api.ts:100-114`), seguido de
  `consolidarFechamento`.

**Dois frentistas no mesmo dia convivem** — a tabela é por
`(fechamento_id, frentista_id)` e **não tem `bico_id`**
(`banco/init/01-esquema-base.sql:237-256`); o `encerrante` é um número declarado
pelo próprio frentista. O pai soma os filhos relendo o banco.

**O unique EXISTE no esquema base**: `banco/init/01-esquema-base.sql:761`,
`fechamento_frentista_unico_por_dia (fechamento_id, frentista_id)` — mesmo índice
da migration `supabase/migrations/20260819_fechamento_frentista_unico_por_dia.sql`.
Isso **corrige** a memória do dono "o unique de FechamentoFrentista está escrito e
NÃO aplicado" (varredura de 19/08): para o Postgres do Docker está aplicado.
Se o índice está no Supabase de produção, só um `\d` no banco responde — o repo não prova.

**Why:** segundo envio do mesmo frentista dobrava o caixa do dia em silêncio,
porque `consolidarFechamento` SOMA os filhos.
**How to apply:** ao portar para Laravel, `DELETE+INSERT` por fechamento é o
comportamento atual do painel; o risco conhecido é o painel apagar um envio do PWA
que chegou depois da tela carregar (`useSessoesFrentistas.ts:181-228` só mescla no
carregamento).

Reconfirmar:
```bash
rg -n "\.insert\(|\.delete\(|\.upsert\(" frontend/apps/web/src/services/api/fechamentoFrentista.service.ts frontend/apps/pwa-frentista/src/services/api.ts
rg -n "fechamento_frentista_unico_por_dia" banco/init/01-esquema-base.sql supabase/migrations/
```
