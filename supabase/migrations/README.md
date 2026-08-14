# `supabase/migrations/` — onde mora o SQL, e o que ele prova

> **Conferido em 13/08/2026.** Números datados de propósito: o histórico do banco
> cresce, e contagem em documento apodrece (§7 do CLAUDE.md).

## A regra: um lugar só

Todo `.sql` do projeto mora **aqui**. Até 13/08/2026 havia três lugares —
`supabase/migrations/`, `supabase_migrations/` na raiz do repo, e `.sql` soltos em
`supabase/` —, o que fazia cada leitor descobrir um terço do SQL e concluir coisas
diferentes sobre o banco.

```
supabase/migrations/          migração com data no nome, o padrão para tudo que for novo
supabase/migrations/legado/   12 arquivos herdados, sem data e sem garantia — leia abaixo
supabase/migrations/*.sh      verificadores de RLS, ao lado da migração que verificam
```

## A armadilha: este diretório NÃO é o histórico do banco

O histórico real vive em `supabase_migrations.schema_migrations`, **no Postgres** —
é o que a ferramenta `list_migrations` lê. (O nome colide com o da antiga pasta da
raiz, e a colisão já confundiu leitura de memória antes: `supabase_migrations.` com
ponto é o *schema*; era pasta quando aparecia com barra.)

Em 13/08/2026 o banco listava **100 versões**, com carimbo de 14 dígitos
(`20260802225627`), enquanto os arquivos daqui usam 8 (`20260802_...`) ou nenhum.
**Os dois conjuntos não se correspondem um-para-um.** Arquivo aqui é a fonte
*legível* de uma mudança; a prova de que ela chegou ao banco é o catálogo.

> Regra prática: antes de afirmar que algo está aplicado, **consulte o catálogo**
> (`to_regclass`, `pg_policies`, `pg_proc`). É o mesmo ciclo do §12 — o artefato
> local localiza, o banco confirma.

## `legado/` — aplicado em produção, fora do histórico

Os 12 arquivos de `legado/` são os que estavam espalhados. **Não são rascunho**: o
que eles criam existe no banco hoje. Mas foram aplicados por fora do sistema de
migrações — pelo painel do Supabase, que o §5 do CLAUDE.md proíbe justamente por
produzir este estado.

**Quatro constam do histórico do banco** (nome idêntico, versão de 14 dígitos):

| Arquivo | Versão no banco |
| --- | --- |
| `create_get_fechamento_mensal.sql` | `20260125205919` |
| `create_get_encerrantes_mensal.sql` | `20260125211007` |
| `update_get_fechamento_mensal.sql` | `20260125211028` |
| `fix_lucro_calculation.sql` | `20260127104627` |

**Oito não constam de versão nenhuma** — e mesmo assim seus objetos existem.
Comprovado no catálogo em 13/08/2026, um a um:

| Arquivo | Objeto conferido | Existe? |
| --- | --- | --- |
| `create_notas_fiado.sql` | tabelas `Cliente`, `NotaFrentista`, função `atualizar_saldo_cliente`, trigger `trigger_atualizar_saldo_cliente` | sim |
| `auto_create_frentista_trigger.sql` | função `handle_new_user`, trigger `on_auth_user_created` | sim |
| `fix_cliente_rls.sql`, `fix_cliente_rls_v2.sql`, `fix_posto_rls.sql` | policies sobre `Cliente`/`Posto` | sim |
| `create_notifications_table.sql` | versão *singular*; o banco tem `20260118154219 create_notifications_tables.sql`, no plural, e o plural está em `migrations/` | divergente |
| `migrate_existing_users.sql`, `setup_mobile_integration.sql` | script de carga/configuração, sem DDL próprio | n/a |

**Por que ficam guardados, e não apagados:** são a única descrição legível de como
o núcleo do banco (`Cliente`, `NotaFrentista`, o trigger de criação de usuário)
nasceu. Apagá-los deixaria o banco sem documento de origem — a mesma perda do
incidente do `docs/`. Ficam em `legado/` para que ninguém os leia como histórico
confiável nem os reaplique achando que são idempotentes.

**Não reaplique nada de `legado/` sem ler o arquivo inteiro antes.** Vários contêm
`CREATE TABLE` sem `IF NOT EXISTS` e `CREATE POLICY` sem `DROP` — rodar de novo ou
falha, ou empilha policy duplicada. Policies são OR entre si: policy duplicada não
é ruído, é superfície de escrita a mais.

## Mudança nova

1. Arquivo aqui, nome com data: `20260813_descricao_curta.sql`.
2. Cabeçalho dizendo **o problema medido**, não só o que o SQL faz. O padrão está
   em `20260802_trava_update_janela_mes_anterior.sql` e
   `20260813_rls_fase1_views_e_delete_anonimo.sql`.
3. Se mexe em RLS, **verificador junto** (`verifica-*.sh`). Ele testa a *regra* nos
   dois lados — o que deve barrar e o que deve continuar passando —, nunca só
   "tudo bloqueado", que passaria em verde com a tela quebrada.
4. Conferir **pela tela, como `anon`**, não só pelo SQL. SQL que roda no editor do
   Supabase roda como `postgres`, que ignora RLS: já produziu conclusão errada
   sobre a `Compra` antes.
