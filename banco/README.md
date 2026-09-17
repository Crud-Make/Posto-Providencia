# `banco/` — o Postgres do Posto Providência fora do Supabase

Esta pasta é o que faltava desde a Issue #93 (e a #60): **o esquema inteiro do banco, versionado
e reproduzível**. Até 17/09/2026, 24 das 43 tabelas não tinham `CREATE TABLE` em lugar nenhum
do repo — o núcleo do fechamento (`Fechamento`, `Leitura`, `Frentista`, `Bico`, `Tanque`,
`Combustivel`) existia só dentro do projeto Supabase.

```
banco/
├── init/
│   ├── 00-papeis-e-stubs.sql   escrito à mão: papéis anon/authenticated/service_role e o
│   │                           mínimo do schema `auth` que o esquema pressupõe
│   └── 01-esquema-base.sql     GERADO: 45 tabelas, 141 constraints, 130 índices, 22 funções,
│                               2 views, 9 triggers, 103 policies, grants — o `public` inteiro
└── dados/                      gitignored (nome/CPF/telefone de frentista — regra do §6)
    └── cadastros.sql           GERADO: posto, combustíveis, tanques, bombas, bicos, turnos,
                                formas de pagamento, frentistas, usuários
```

## Subir

```bash
docker compose up -d --wait                                                   # Postgres 17 em localhost:5433
docker compose exec -T postgres psql -U posto -d posto < banco/dados/cadastros.sql
docker compose down -v                                                        # zera tudo
```

Credenciais locais: usuário `posto`, senha `posto`, banco `posto`. Não são segredo: só existem
dentro do container.

## Regenerar (quando o esquema de produção mudar)

```bash
python3 scripts/extrai-esquema-do-catalogo.py               # esquema + cadastros
python3 scripts/extrai-esquema-do-catalogo.py --so-esquema
```

O script lê o catálogo de produção pela Management API do Supabase, que roda como
`supabase_read_only_user` com `transaction_read_only = on`: **não consegue escrever**.
Precisa do `SUPABASE_ACCESS_TOKEN` (`.claude/settings.local.json` → `env`).

Por que não `supabase db dump`: o CLI exige IPv6 na rede ou `supabase link` com a senha do
banco. Se um dia a senha estiver à mão, o `pg_dump` é o caminho mais fiel — este gerador
existe porque ele não estava.

## O que o Postgres local NÃO tem

- **Supabase Auth.** `auth.users` aqui é uma tabela de 4 colunas; `auth.uid()`, `auth.role()`
  e `auth.jwt()` leem `current_setting('request.jwt.*')`, que ninguém preenche. Logo toda
  policy "para autenticados" nega. É intencional: quem autoriza passa a ser o backend, que
  conecta como dono e não é filtrado por RLS.
- **PostgREST, Realtime, Edge Functions, Storage.** A publicação `supabase_realtime` é criada
  só para documentar as 3 tabelas que o painel ouvia (`Fechamento`, `FechamentoFrentista`,
  `Leitura`).
- **Histórico de migrations do Supabase** (`supabase_migrations.schema_migrations`, 103
  versões). Este arquivo é o estado final, não a sequência.

## Conferido em 17/09/2026

Contagens locais iguais às de produção (Postgres 17.6): 45 tabelas, 103 policies, 22 funções,
9 triggers, 2 views, 130 índices, 5 enums, 42 sequences, 141 constraints, RLS ligada em 45/45.
`get_dashboard_proprietario` e `dentro_da_janela_de_escrita` executam.
