-- =============================================================================
-- Presença do frentista: "quem está com o app aberto agora?"
--
-- PARA QUE SERVE:
--   O dono quer olhar o painel por volta das 23h e saber quem está no posto
--   prestes a fechar o caixa. O PWA passa a mandar um sinal de vida enquanto
--   estiver aberto com um frentista selecionado, e esta tabela guarda o último.
--
-- POR QUE UMA TABELA, E NÃO REALTIME PRESENCE:
--   Presença ao vivo morre com a tela do celular. O frentista guarda o aparelho
--   no bolso, o Safari suspende a aba e o websocket cai em segundos — o painel
--   mostraria "offline" às 23h com o frentista em pé na bomba. Um carimbo de
--   tempo sobrevive ao bloqueio e diz o que de fato se sabe: quando o app dele
--   deu sinal pela última vez.
--
-- UMA LINHA POR FRENTISTA, NÃO UM LOG:
--   `frentista_id` é a chave primária e o sinal é um UPSERT. A tabela nunca
--   passa da quantidade de frentistas do posto (hoje 8). Um log de batidas
--   cresceria ~700 linhas por frentista por dia de trabalho para responder uma
--   pergunta que só olha a última — e ninguém pediu histórico de presença.
--
-- O CARIMBO É DO SERVIDOR, NUNCA DO CELULAR:
--   O trigger abaixo sobrescreve `visto_em` com `now()` em todo INSERT e UPDATE.
--   Sem isso, o relógio errado de um aparelho (ou um curl mal-intencionado)
--   colocaria um frentista no futuro, e ele ficaria "online" para sempre — a
--   comparação do painel é contra o tempo decorrido.
--
-- O QUE ESTA TABELA NÃO É:
--   O PWA não tem autenticação (decisão do dono, 29/07). Quem abre o link
--   escolhe o nome que quiser, então isto registra "alguém abriu o app como
--   Paulo", não "o Paulo está no posto". Serve para coordenação; NÃO serve
--   como controle de ponto, e nenhum cálculo de dinheiro depende dela.
-- =============================================================================

create table if not exists public."PresencaFrentista" (
    frentista_id integer primary key
        references public."Frentista"(id) on delete cascade,
    posto_id integer,
    visto_em timestamptz not null default now()
);

comment on table public."PresencaFrentista" is
    'Último sinal de vida do PWA por frentista. Uma linha por frentista (upsert). '
    'Coordenação, não controle de ponto: o PWA não autentica ninguém.';

comment on column public."PresencaFrentista".visto_em is
    'Carimbado pelo servidor via trigger — valor enviado pelo cliente é ignorado.';

-- -----------------------------------------------------------------------------
-- Carimbo do servidor
-- -----------------------------------------------------------------------------
create or replace function public.carimba_visto_em()
returns trigger
language plpgsql
-- search_path fixo: função de trigger sem isso é vetor de sequestro por search_path.
set search_path = ''
as $$
begin
    new.visto_em := now();
    return new;
end;
$$;

drop trigger if exists carimba_visto_em on public."PresencaFrentista";
create trigger carimba_visto_em
    before insert or update on public."PresencaFrentista"
    for each row execute function public.carimba_visto_em();

-- -----------------------------------------------------------------------------
-- RLS (CLAUDE.md §5: ativa em toda tabela, inclusive nova)
--
-- Painel e PWA falam como `anon` (o login do web foi removido em 29/07), então
-- as permissões precisam alcançar esse papel. O que dá para restringir aqui:
--
--   SELECT — liberado. É o painel lendo quem está trabalhando.
--   INSERT/UPDATE — liberado, mas o trigger acima tira do cliente a única
--                   coisa que valeria a pena falsificar (o horário).
--   DELETE — NÃO existe policy. Ninguém apaga presença pela API; a linha é
--            sobrescrita pelo próximo sinal e some sozinha da tela por tempo.
-- -----------------------------------------------------------------------------
alter table public."PresencaFrentista" enable row level security;

drop policy if exists "presenca_select_anon" on public."PresencaFrentista";
create policy "presenca_select_anon"
    on public."PresencaFrentista"
    for select
    to anon, authenticated
    using (true);

drop policy if exists "presenca_insert_anon" on public."PresencaFrentista";
create policy "presenca_insert_anon"
    on public."PresencaFrentista"
    for insert
    to anon, authenticated
    with check (true);

drop policy if exists "presenca_update_anon" on public."PresencaFrentista";
create policy "presenca_update_anon"
    on public."PresencaFrentista"
    for update
    to anon, authenticated
    using (true)
    with check (true);
