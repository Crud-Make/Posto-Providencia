#!/usr/bin/env python3
"""
Extrai o esquema `public` do projeto Supabase (MAY-DAY) lendo o catálogo pela Management API
e escreve DDL reproduzível em `banco/init/01-esquema-base.sql`.

Por que não `supabase db dump`: o CLI exige IPv6 ou `supabase link` com a senha do banco.
A Management API roda como `supabase_read_only_user` com `transaction_read_only=on`, então
este script não consegue escrever em produção nem por acidente.

Também gera `banco/dados/cadastros.sql` (gitignored: tem nome/CPF/telefone de frentista)
com as tabelas de cadastro, para o Postgres local nascer com posto, bicos e formas de pagamento.

Uso:
    python3 scripts/extrai-esquema-do-catalogo.py          # esquema + cadastros
    python3 scripts/extrai-esquema-do-catalogo.py --so-esquema

Token: `.claude/settings.local.json` → env.SUPABASE_ACCESS_TOKEN (ou variável de ambiente).
"""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PROJECT_REF = 'kilndogpsffkgkealkaq'
SAIDA_ESQUEMA = RAIZ / 'banco' / 'init' / '01-esquema-base.sql'
SAIDA_DADOS = RAIZ / 'banco' / 'dados' / 'cadastros.sql'

# Tabelas de cadastro (sem movimento): o suficiente para o sistema abrir num banco novo.
TABELAS_CADASTRO = [
    'Posto', 'Usuario', 'UsuarioPosto', 'Turno', 'Combustivel', 'Tanque', 'Bomba', 'Bico',
    'FormaPagamento', 'Maquininha', 'Fornecedor', 'Estoque', 'CategoriaFinanceira',
    'Configuracao', 'Frentista',
]
COLUNAS_EXCLUIDAS_DO_SEED = {'Frentista': {'foto'}}  # data URL de imagem, pesada e desnecessária

CMD = {'r': 'SELECT', 'a': 'INSERT', 'w': 'UPDATE', 'd': 'DELETE', '*': 'ALL'}


def token() -> str:
    if os.environ.get('SUPABASE_ACCESS_TOKEN'):
        return os.environ['SUPABASE_ACCESS_TOKEN']
    cfg = json.load(open(RAIZ / '.claude' / 'settings.local.json'))
    return cfg['env']['SUPABASE_ACCESS_TOKEN']


def consulta(sql: str) -> list[dict]:
    req = urllib.request.Request(
        f'https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query',
        data=json.dumps({'query': sql, 'read_only': True}).encode(),
        method='POST',
        headers={
            'Authorization': f'Bearer {token()}',
            'Content-Type': 'application/json',
            'User-Agent': 'posto-providencia-extrai-esquema',  # sem User-Agent o WAF devolve 403
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        sys.exit(f'HTTP {e.code}: {e.read().decode()[:300]}')


def q(ident: str) -> str:
    """Aspas duplas em identificador (nomes CamelCase como "Bico", "createdAt")."""
    return '"' + ident.replace('"', '""') + '"'


def lit(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def esquema() -> str:
    colunas = consulta("""
        select c.relname as tabela, a.attnum, a.attname as coluna,
               format_type(a.atttypid, a.atttypmod) as tipo, a.attnotnull as nn,
               pg_get_expr(d.adbin, d.adrelid) as default_, a.attidentity as identity_
        from pg_attribute a
        join pg_class c on c.oid = a.attrelid
        join pg_namespace n on n.oid = c.relnamespace
        left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
        where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
        order by 1, 2""")
    constraints = consulta("""
        select conrelid::regclass::text as tabela, conname, contype, pg_get_constraintdef(oid) as def
        from pg_constraint where connamespace = 'public'::regnamespace order by 1, 2""")
    indexes = consulta("""
        select tablename as tabela, indexname, indexdef from pg_indexes
        where schemaname = 'public' order by 1, 2""")
    enums = consulta("""
        select t.typname, array_agg(e.enumlabel order by e.enumsortorder) as labels
        from pg_type t join pg_enum e on e.enumtypid = t.oid
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public' group by 1 order by 1""")
    sequences = consulta("""
        select s.relname as seq, d.deptype, t.relname as tabela, a.attname as coluna
        from pg_class s
        join pg_depend d on d.objid = s.oid and d.deptype in ('a', 'i')
        join pg_class t on t.oid = d.refobjid
        join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
        where s.relkind = 'S' and s.relnamespace = 'public'::regnamespace order by 1""")
    funcoes = consulta("""
        select p.proname, l.lanname, pg_get_functiondef(p.oid) as def
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        join pg_language l on l.oid = p.prolang
        where n.nspname = 'public' order by 1""")
    views = consulta("""
        select c.relname, c.reloptions, pg_get_viewdef(c.oid, true) as def
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'v' order by 1""")
    triggers = consulta("""
        select tgrelid::regclass::text as tabela, tgname, pg_get_triggerdef(oid) as def
        from pg_trigger where not tgisinternal
          and (tgrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace)
               or tgrelid = 'auth.users'::regclass)
        order by 1, 2""")
    policies = consulta("""
        select polrelid::regclass::text as tabela, polname, polcmd, polpermissive,
               case when polroles = '{0}' then 'public'
                    else array_to_string(array(select quote_ident(r::regrole::text) from unnest(polroles) r), ', ') end as papeis,
               pg_get_expr(polqual, polrelid) as using_, pg_get_expr(polwithcheck, polrelid) as with_check
        from pg_policy order by 1, 3, 2""")
    grants = consulta("""
        select c.relname, c.relkind, a.grantee::regrole::text as papel,
               string_agg(distinct a.privilege_type, ', ' order by a.privilege_type) as privs
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        cross join lateral aclexplode(coalesce(c.relacl,
            acldefault(case when c.relkind = 'S' then 's' else 'r' end::"char", c.relowner))) a
        where n.nspname = 'public' and c.relkind in ('r', 'v', 'S')
          and a.grantee::regrole::text in ('anon', 'authenticated', 'service_role')
        group by 1, 2, 3 order by 1, 3""")
    publicacao = consulta("""
        select tablename from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' order by 1""")
    versao = consulta('select version() as v')[0]['v'].split(',')[0]

    out: list[str] = []
    w = out.append
    w(f'-- Esquema `public` do Posto Providência, extraído do catálogo do projeto {PROJECT_REF}')
    w(f'-- em {date.today().isoformat()} ({versao}). GERADO por scripts/extrai-esquema-do-catalogo.py;')
    w('-- não edite à mão — mudança de esquema é migration, e depois se regenera este arquivo.')
    w('-- Pré-requisito: banco/init/00-papeis-e-stubs.sql (papéis anon/authenticated/service_role e schema auth).')
    w('')
    w('SET client_min_messages = warning;')
    w('SET search_path = public, pg_catalog;')
    w('')

    w('-- ---------- enums ----------')
    for e in enums:
        labels = e['labels'].strip('{}').split(',')
        w(f'CREATE TYPE public.{q(e["typname"])} AS ENUM ({", ".join(lit(l) for l in labels)});')
    w('')

    w('-- ---------- sequences (as que não são identity) ----------')
    for s in sequences:
        if s['deptype'] == 'a':
            w(f'CREATE SEQUENCE public.{q(s["seq"])};')
    w('')

    w('-- ---------- tabelas ----------')
    por_tabela: dict[str, list[dict]] = {}
    for c in colunas:
        por_tabela.setdefault(c['tabela'], []).append(c)
    for tabela, cols in por_tabela.items():
        linhas = []
        for c in cols:
            partes = [f'    {q(c["coluna"])} {c["tipo"]}']
            if c['identity_']:
                partes.append('GENERATED ' + ('ALWAYS' if c['identity_'] == 'a' else 'BY DEFAULT') + ' AS IDENTITY')
            elif c['default_']:
                partes.append(f'DEFAULT {c["default_"]}')
            if c['nn']:
                partes.append('NOT NULL')
            linhas.append(' '.join(partes))
        w(f'CREATE TABLE public.{q(tabela)} (\n' + ',\n'.join(linhas) + '\n);')
    w('')
    for s in sequences:
        if s['deptype'] == 'a':
            w(f'ALTER SEQUENCE public.{q(s["seq"])} OWNED BY public.{q(s["tabela"])}.{q(s["coluna"])};')
        elif s['seq'] != f'{s["tabela"]}_{s["coluna"]}_seq':
            # identity criada pelo Postgres com o nome padrão; em produção a tabela foi renomeada
            # depois (ex.: frentistas → Frentista) e a sequence guardou o nome antigo, que os GRANTs citam
            w(f'ALTER SEQUENCE public.{q(s["tabela"] + "_" + s["coluna"] + "_seq")} RENAME TO {q(s["seq"])};')
    w('')

    w('-- ---------- constraints: PK, UNIQUE, CHECK e por último FK ----------')
    ordem = {'p': 0, 'u': 1, 'c': 2, 'x': 3, 'f': 4}
    for k in sorted(constraints, key=lambda k: (ordem.get(k['contype'], 9), k['tabela'], k['conname'])):
        w(f'ALTER TABLE {k["tabela"]} ADD CONSTRAINT {q(k["conname"])} {k["def"]};')
    w('')

    w('-- ---------- índices (os que não vêm de constraint) ----------')
    nomes_constraint = {k['conname'] for k in constraints}
    for i in indexes:
        if i['indexname'] not in nomes_constraint:
            w(i['indexdef'] + ';')
    w('')

    w('-- ---------- funções ----------')
    for f in funcoes:
        w(f['def'].rstrip() + ';')
        w('')

    w('-- ---------- views ----------')
    for v in views:
        opts = f' WITH ({", ".join(v["reloptions"])})' if v['reloptions'] else ''
        w(f'CREATE VIEW public.{q(v["relname"])}{opts} AS\n{v["def"].rstrip().rstrip(";")};')
    w('')

    w('-- ---------- triggers ----------')
    for t in triggers:
        w(t['def'] + ';')
    w('')

    w('-- ---------- RLS ----------')
    for tabela in por_tabela:
        w(f'ALTER TABLE public.{q(tabela)} ENABLE ROW LEVEL SECURITY;')
    w('')
    for p in policies:
        restr = '' if p['polpermissive'] else ' AS RESTRICTIVE'
        sql = f'CREATE POLICY {q(p["polname"])} ON {p["tabela"]}{restr} FOR {CMD[p["polcmd"]]} TO {p["papeis"]}'
        if p['using_']:
            sql += f'\n    USING ({p["using_"]})'
        if p['with_check']:
            sql += f'\n    WITH CHECK ({p["with_check"]})'
        w(sql + ';')
    w('')

    w('-- ---------- grants ----------')
    for g in grants:
        objeto = 'SEQUENCE' if g['relkind'] == 'S' else 'TABLE'
        w(f'GRANT {g["privs"]} ON {objeto} public.{q(g["relname"])} TO {g["papel"]};')
    w('')

    w('-- ---------- publicação do realtime (só documenta o que o Supabase ouvia) ----------')
    if publicacao:
        w('CREATE PUBLICATION supabase_realtime FOR TABLE '
          + ', '.join(f'public.{q(p["tablename"])}' for p in publicacao) + ';')
    w('')
    return '\n'.join(out)


def cadastros() -> str:
    out = [
        f'-- Cadastros do posto extraídos em {date.today().isoformat()}. NÃO VERSIONAR (dado pessoal de frentista).',
        '-- Aplicar depois do esquema: docker compose exec -T postgres psql -U posto -d posto < banco/dados/cadastros.sql',
        'SET client_min_messages = warning;',
        'BEGIN;',
        '-- o trigger criaria Usuario/Frentista a partir de auth.users; os reais vêm abaixo',
        'ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;',
    ]
    usuarios = consulta('select id, email, created_at from auth.users order by created_at')
    for u in usuarios:
        out.append(
            f'INSERT INTO auth.users (id, email, created_at) VALUES ({lit(u["id"])}, {lit(u["email"])}, '
            f'{lit(u["created_at"])}) ON CONFLICT (id) DO NOTHING;')
    out.append('ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;')
    for tabela in TABELAS_CADASTRO:
        linhas = consulta(f'select row_to_json(t) as r from public.{q(tabela)} t order by t.id')
        excluidas = COLUNAS_EXCLUIDAS_DO_SEED.get(tabela, set())
        for l in linhas:
            reg = {k: v for k, v in l['r'].items() if k not in excluidas}
            out.append(
                f'INSERT INTO public.{q(tabela)} SELECT * FROM json_populate_record(NULL::public.{q(tabela)}, '
                f'{lit(json.dumps(reg, ensure_ascii=False))}) ON CONFLICT DO NOTHING;')
    out.append('-- realinha as sequences com o maior id carregado')
    out.append("""DO $seq$ BEGIN PERFORM setval(pg_get_serial_sequence(format('%I.%I', s.schemaname, s.tablename), s.attname),
              greatest((xpath('/row/max/text()', query_to_xml(format('select max(%I) from %I.%I', s.attname, s.schemaname, s.tablename), false, true, '')))[1]::text::bigint, 1))
FROM (SELECT n.nspname AS schemaname, c.relname AS tablename, a.attname
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      JOIN pg_attribute a ON a.attrelid = c.oid
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0
        AND pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) IS NOT NULL) s; END $seq$;""")
    out.append('COMMIT;')
    return '\n'.join(out) + '\n'


if __name__ == '__main__':
    SAIDA_ESQUEMA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA_ESQUEMA.write_text(esquema(), encoding='utf-8')
    print(f'esquema → {SAIDA_ESQUEMA.relative_to(RAIZ)} ({SAIDA_ESQUEMA.stat().st_size} bytes)')
    if '--so-esquema' not in sys.argv:
        SAIDA_DADOS.parent.mkdir(parents=True, exist_ok=True)
        SAIDA_DADOS.write_text(cadastros(), encoding='utf-8')
        print(f'cadastros → {SAIDA_DADOS.relative_to(RAIZ)} ({SAIDA_DADOS.stat().st_size} bytes, gitignored)')
