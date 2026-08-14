---
name: nucleo-do-banco-nunca-veio-de-migration
description: 26 das 44 tabelas de produção não têm CREATE TABLE em nenhuma migration aplicada; as 6 primeiras migrations são de OUTROS projetos
metadata:
  type: project
---

O histórico de migrations **não descreve** o núcleo do banco. Conferido em
**12/08/2026** contra `supabase_migrations.schema_migrations`.

- **26 tabelas existem em produção sem `CREATE TABLE` em migration alguma** —
  entre elas `Fechamento`, `FechamentoFrentista`, `Leitura`, `Frentista`,
  `Bico`, `Bomba`, `Combustivel`, `Usuario`. Ou seja: o coração do fechamento
  nasceu de painel/Prisma, não de arquivo versionado (§5).
- **16 tabelas criadas por migration não existem no banco**: `usuarios`,
  `crm_clientes`, `crm_transacoes`, `crm_dividas`, `crm_metas`, `crm_receitas`,
  `casais`, `dividas`, `metas`, `pagamentos`, `transacoes`,
  `eventos_calendario`, `marcos`, `mensagens_chat`, `regras_alocacao`,
  `configuracoes_usuario`.

**Why:** a migration `20251129103456 initial_schema_setup` tem o cabeçalho
`-- MAY DAY - Schema do Banco de Dados PostgreSQL` e cria `usuarios`
(minúsculo). As `20251202*` criam um CRM. **O projeto Supabase foi reaproveitado
de outro sistema** — as primeiras migrations são lixo herdado, não história
deste posto. Nada foi "apagado por clique": nunca existiu aqui.

**How to apply:** nunca use `list_migrations` como inventário do esquema deste
projeto — só o catálogo vale. E não proponha "recriar" as 16: são de outro
sistema. A própria `20260729_lockdown_tabelas_orfas.sql` já reconhece isso em
comentário: *"A tabela pode não existir no ambiente (o banco diverge das
migrations)"*.

Reconferir (a consulta, nunca a contagem — ela envelhece):
```sql
WITH stmts AS (SELECT unnest(statements) AS st FROM supabase_migrations.schema_migrations),
criadas AS (SELECT DISTINCT lower(m[1]) AS t FROM stmts,
  regexp_matches(st,'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?','gi') m)
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE'
  AND lower(table_name) NOT IN (SELECT t FROM criadas) ORDER BY 1;
```

⚠️ O `regexp_match` (singular) só pega a **primeira** ocorrência por statement, e
cada migration aqui é **um blob só** — use `regexp_matches(...,'g')` ou o
resultado sai inflado. Errei assim na primeira passada.

Ver [[quem-tipa-o-cliente-supabase]].
