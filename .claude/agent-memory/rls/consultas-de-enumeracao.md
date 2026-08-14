---
name: consultas-de-enumeracao
description: Consultas de catálogo para auditar RLS, grants e views — inclui a armadilha do information_schema vazio sob o MCP read-only
metadata:
  type: reference
---

# Consultas que enumeram o catálogo (nunca lista fixa)

Registrado em 12/08/2026. Guardo o **comando**, nunca o resultado.

## Denominador da auditoria

```sql
SELECT c.relname AS tabela, c.relrowsecurity AS rls_ligada, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1;
```

## ARMADILHA: `information_schema.role_table_grants` volta VAZIO

O `execute_sql` do MCP roda como papel read-only, e essa view só mostra grants em que
o usuário corrente é grantor/grantee/membro. **Resultado vazio ali significa "não sei",
não "não há grant"** — foi o que aconteceu em 12/08/2026: a view devolveu zero linhas
enquanto o `anon` tinha `DELETE,INSERT,SELECT,UPDATE` em quase tudo.

Fonte correta é o ACL do catálogo:

```sql
SELECT c.relname, a.grantee::regrole::text AS papel,
       string_agg(DISTINCT a.privilege_type, ',' ORDER BY a.privilege_type)
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl, acldefault('r', c.relowner))) a
WHERE n.nspname='public' AND c.relkind IN ('r','v','m')
  AND a.grantee::regrole::text IN ('anon','authenticated','public','service_role')
GROUP BY 1,2 ORDER BY 1,2;
```

`acldefault(...)` no COALESCE é obrigatório: `relacl` NULL significa "privilégios padrão",
não "nenhum privilégio".

## Políticas que alcançam o anon

Papel `public` (`polroles = '{0}'::oid[]`) **inclui o anon**. Filtrar só por `'anon' = ANY(polroles)`
esconde metade das políticas permissivas:

```sql
SELECT polrelid::regclass, polname, polcmd, pg_get_expr(polqual,polrelid), pg_get_expr(polwithcheck,polrelid)
FROM pg_policy
WHERE polpermissive AND (polroles = '{0}'::oid[] OR 'anon'::regrole = ANY(polroles));
```

## Tabelas com RLS e zero política (nega tudo, exceto para o dono)

```sql
SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind='r'
  AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid=c.oid);
```

## Views: `security_invoker` e se são auto-atualizáveis

```sql
SELECT c.relname, pg_get_userbyid(c.relowner) AS dono,
  COALESCE((SELECT option_value FROM pg_options_to_table(c.reloptions) WHERE option_name='security_invoker'),'false'),
  (pg_relation_is_updatable(c.oid,true) & 8)>0  AS pode_insert,
  (pg_relation_is_updatable(c.oid,true) & 4)>0  AS pode_update,
  (pg_relation_is_updatable(c.oid,true) & 16)>0 AS pode_delete
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relkind IN ('v','m');
```

Ver [[views-auto-atualizaveis-furam-rls]] para o porquê dessa última.
