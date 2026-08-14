---
name: rls-fase1-em-andamento
description: Auditoria de 12/08/2026 achou escrita anônima no dado financeiro; a Fase 1 está composta e conferida mas NÃO aplicada — falta reconectar o MCP
metadata:
  node_type: memory
  type: project
---

Branch **`fix/rls-fase1-exposicao-anonima`**, aberta em 12/08/2026. **Nada foi
aplicado em produção ainda.**

> **Reconferido no catálogo em 13/08/2026 (auditoria de entrega):** segue tudo
> igual. As duas views sem `security_invoker`, `pg_relation_is_updatable = 28`,
> `anon` com SELECT/INSERT/UPDATE/DELETE nas duas; as três policies de DELETE
> anônimo com `USING (true)` intactas; `relforcerowsecurity` falso em **0 de 44**
> tabelas; última migration do banco é `20260802225627`. O SQL não existe em
> arquivo `.sql` nenhum — só citado aqui e na memória do agente `rls`.
> A função `dentro_da_janela_de_edicao(timestamptz)` **existe** no banco, então o
> desenho das policies novas é executável.

## O que a auditoria achou (conferido por consulta própria ao catálogo, não só pelo agente)

Nenhuma tabela está sem RLS — o §5 está cumprido nesse ponto. O problema é que a
RLS é **contornada por fora**, por dois caminhos que se compõem:

1. **Duas views furam a RLS inteira.** `vw_lucro_periodo` e `frentistas`: sem
   `security_invoker` (rodam como `postgres`), auto-atualizáveis
   (`pg_relation_is_updatable` = **28** = insert+update+delete), e o `anon` tem
   `DELETE/INSERT/UPDATE/SELECT` nas duas. **Nenhuma tabela tem `FORCE ROW LEVEL
   SECURITY`** (`relforcerowsecurity = false` em todas), então o dono ignora as
   políticas. Efeito: `PATCH /rest/v1/vw_lucro_periodo` reescreve `total_vendas` e
   `lucro_liquido` dos 212 fechamentos, sem passar pela janela de 7 dias.
2. **Três políticas de DELETE anônimo com `USING (true)`** — `FechamentoFrentista`,
   `Recebimento` e `Despesa`. As janelas temporais foram aplicadas ao INSERT e ao
   UPDATE e **o DELETE ficou de fora**. O FK `RESTRICT` protegeria o fechamento pai,
   mas o anon apaga os filhos primeiro.

A `anon key` está no bundle publicado do painel.

## A correção do agente que estava errada

O agente `rls` pôs **`get_frentistas_with_email`** na Fase 1 dizendo que nada
quebraria. **Falso:** `apps/web/src/services/api/frentista.service.ts:24` a chama.
Revogar derruba a tela de frentistas. Ficou de fora, para junto do login.

`abrir_caixa` só aparece como tipo em `generated.ts`, sem nenhum `.rpc()` real —
essa sai com segurança. Grep de `from('<view>')` para as duas views e para
`ganhos`/`parcelas`/`frentistas_old_backup`: **0 consumidores**.

## Decisões de desenho já tomadas

- **Views com `security_invoker = on` + revogar escrita**, em vez de `DROP`: fecha o
  mesmo buraco, é reversível, e dispensa o `MergeDeep`/`type-fest` que o agente
  `schema` levantou (dependência não instalada). Definições originais guardadas em
  comentário na migration.
- **As novas políticas de DELETE copiam a forma já validada** das políticas de
  UPDATE dessas mesmas tabelas (`dentro_da_janela_de_edicao(f.data)`). Não é regra
  nova: é a mesma regra da edição, aplicada ao DELETE. `Fechamento.data` é
  `timestamptz`, que casa com a assinatura da função.

## O que falta

**Atualizado em 13/08/2026:** a migration e o verificador **agora existem em
arquivo**, e o verificador já rodou contra produção *antes* de aplicar:

- `supabase/migrations/20260813_rls_fase1_views_e_delete_anonimo.sql`
- `supabase/migrations/verifica-rls-fase1.sh` (executável)

Estado do verificador rodado em 13/08, **antes** de aplicar: bloco A com **6
falhas** — que é a prova por HTTP, com a anon key pública, de que as duas views
aceitam INSERT/UPDATE/DELETE anônimo (`23502` no POST prova que o INSERT chega à
tabela; `204` no PATCH/DELETE prova que não há `42501`). Bloco B verde (leitura de
pé, baseline). Bloco C **PENDENTE**, por desenho: as 3 policies de DELETE não são
sondáveis por HTTP sem apagar dado real, então ele mede por catálogo e se declara
incompleto (exit 2) em vez de fingir verde. Nada foi escrito: contagens antes e
depois iguais — 213 `Fechamento`, 12 `Frentista`, 108 `Despesa`.

**Falta:** aplicar (o `apply_migration` do MCP, com [[travas-mcp-destravadas]]
repostas logo em seguida), rodar o verificador de novo esperando verde no bloco A,
conferir o painel como `anon` em `localhost:3015`, e a entrada no `CHANGELOG.md`.
Não há `.env` no repo (só `.env.example`) — o verificador aceita `SUPABASE_URL` e
`SUPABASE_ANON_KEY` do ambiente por causa disso, e os **dois verificadores
anteriores não rodam** sem que alguém crie o arquivo.

**Fase 2** (reduz superfície de escrita, quebra tela: `Despesa`, `Frentista`,
tabelas `ALL USING (true)`) e **Fase 3** (fecha a leitura anônima, **derruba o
painel inteiro** enquanto não houver login) não foram tocadas.

Não auditados e podem ser do mesmo tamanho: **buckets do `storage`** e **Edge
Functions** — nenhum dos dois aparece no catálogo do Postgres.
