---
name: nucleo-do-banco-nunca-veio-de-migration
description: 26 das 44 tabelas de produção não têm CREATE TABLE em nenhuma migration aplicada; as 6 primeiras migrations são de OUTROS projetos
metadata:
  type: project
---

> ⚠️ **Parcialmente revogada em 17/09/2026.** O DDL do núcleo **está no repo**
> desde o commit `b8fb465`, em `banco/init/01-esquema-base.sql` (45 tabelas, bate
> 45/45 com o catálogo — reconferido 20/09/2026). Ver
> [[banco-local-docker-espelha-producao]]. O que segue valendo aqui é só o que
> está escrito abaixo: o **histórico de migrations** não é inventário do esquema.

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

**Sem acesso ao banco** (ver [[portas-de-leitura-do-catalogo]]), a mesma pergunta
se responde pelo lado do repo, cruzando o `generated.ts` (snapshot do catálogo,
datado) com os `.sql` versionados. Conferido em **17/09/2026** — o comando, não o
número:

```bash
cd /home/thygas/Projetos/trabalho/Posto-Providencia
comm -23 <(grep -oE '^      [A-Za-z_]+: \{$' frontend/apps/web/src/types/database/generated.ts | tr -d ' {:' | sort -u) \
         <(grep -rhoiE 'CREATE TABLE (IF NOT EXISTS )?(public\.)?"?[A-Za-z_]+"?' supabase/migrations \
            | sed -E 's/CREATE TABLE (IF NOT EXISTS )?(public\.)?"?//I; s/"//' | sort -u)
```
(inclui nomes de função e view do bloco `Functions`/`Views` na primeira lista —
filtrar à mão.) Atenção: `20251221_create_mobile_tables.sql` tem um
`CREATE TABLE "FechamentoFrentista"` com colunas de dinheiro em
`double precision` e sem `posto_id`, `valor_moedas`, `baratao` — é uma **versão
antiga** da tabela, não o DDL da atual; contar esse arquivo como "DDL existe" é
falso positivo.

Ver [[quem-tipa-o-cliente-supabase]].
