-- =============================================================================
-- RLS Fase 1 — fecha os dois caminhos que contornam a RLS por fora.
--
-- PROBLEMA (auditado em 12/08/2026, reconferido no catálogo em 13/08/2026):
--   Nenhuma tabela está sem RLS — o §5 do CLAUDE.md está cumprido nesse ponto.
--   O buraco é que a RLS é CONTORNADA, por dois caminhos que se compõem:
--
--   1. DUAS VIEWS FURAM A RLS INTEIRA.
--      `vw_lucro_periodo` e `frentistas` foram criadas sem `security_invoker`,
--      então rodam como `postgres`, o dono. São auto-atualizáveis
--      (`pg_relation_is_updatable` = 28 = insert+update+delete), e o `anon` tem
--      SELECT/INSERT/UPDATE/DELETE nas duas. Como NENHUMA tabela tem
--      `FORCE ROW LEVEL SECURITY` (`relforcerowsecurity` = false em 44 de 44),
--      o dono ignora as próprias políticas.
--      Efeito medido: um `PATCH /rest/v1/vw_lucro_periodo` com a anon key
--      reescreve `total_vendas` e `lucro_liquido` dos 212 fechamentos, sem
--      passar por nenhuma das travas de janela de 31/07 e 02/08.
--
--   2. TRÊS POLÍTICAS DE DELETE ANÔNIMO COM `USING (true)`.
--      `FechamentoFrentista`, `Recebimento` e `Despesa`. As janelas temporais de
--      02/08 foram aplicadas ao INSERT e ao UPDATE, e o DELETE ficou de fora.
--      O FK `RESTRICT` protege o `Fechamento` pai — mas o anon apaga os filhos
--      primeiro, e aí o pai cai.
--
--   A anon key é pública por definição: vai no bundle publicado do painel, que
--   está na Vercel. A RLS é a única porta, e essas duas frestas a contornam.
--
-- POR QUE `security_invoker` E NÃO `DROP VIEW`:
--   Fecha o mesmo buraco, é reversível, e dispensa o `MergeDeep`/`type-fest`
--   que o `DROP` exigiria para recorrigir os tipos gerados (dependência não
--   instalada aqui). As definições originais ficam guardadas em comentário no
--   bloco 1, para que reverter não dependa de backup nem de memória.
--
-- POR QUE AS POLICIES NOVAS DE DELETE NÃO SÃO REGRA NOVA:
--   Elas copiam a forma já validada das policies de UPDATE dessas mesmas
--   tabelas (`dentro_da_janela_de_edicao`), instaladas em
--   `20260802_trava_update_janela_mes_anterior.sql` e medidas por
--   `verifica-rls-update.sh`. É a MESMA regra da edição, aplicada ao DELETE:
--   apagar um lançamento é uma edição destrutiva, e não faz sentido ser mais
--   permissivo que alterar.
--
-- O QUE MUDA NA PRÁTICA:
--   PWA    — igual. Só grava e regrava o dia corrente.
--   Painel — apagar lançamento do mês corrente e do anterior segue funcionando.
--            Apagar mês retrasado deixa de funcionar pela tela e passa a exigir
--            o painel do Supabase.
--   Views  — leitura intacta. Conferido no catálogo antes de escrever isto: as
--            duas tabelas base (`Fechamento`, `Frentista`) têm policy de SELECT
--            anônima `USING (true)`, então `security_invoker = on` NÃO derruba
--            o SELECT das views. E as duas têm ZERO consumidores no código
--            (só aparecem como tipo em `generated.ts`, que ninguém importa).
--   Ataque — o vetor de reescrita em massa dos 212 fechamentos fecha.
--
-- O QUE ESTA MIGRAÇÃO **NÃO** RESOLVE, e é consciente, não esquecimento:
--   - `get_frentistas_with_email` continua exposta. Revogar derruba a tela de
--     frentistas: `apps/web/src/services/api/frentista.service.ts:24` a chama.
--     Sai junto com o login, não aqui.
--   - `Despesa` segue com UPDATE/INSERT anônimo `USING (true)` — é Fase 2, que
--     reduz superfície de escrita e quebra tela de propósito.
--   - A leitura anônima do painel inteiro segue aberta — é Fase 3, e depende de
--     login existir.
--   - Buckets do `storage` e Edge Functions NÃO foram auditados. Não aparecem no
--     catálogo do Postgres, e podem ser um buraco do mesmo tamanho.
--
-- Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Guarda — aborta se sobrar policy que reabra o DELETE por outro caminho.
--
-- Policies são OR entre si: uma única policy `FOR ALL` alcançando `anon` numa
-- dessas tabelas tornaria as policies novas decorativas, e o verificador
-- passaria em verde sobre um buraco aberto. Verde falso é pior que vermelho,
-- porque o vermelho avisa. Então aqui a migração FALHA ALTO em vez de fingir.
--
-- Medido em 13/08/2026: nenhuma das três tem policy `ALL` para `anon` hoje.
-- Esta guarda existe para o dia em que alguém criar uma pelo painel.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  encontrada text;
BEGIN
  SELECT string_agg(format('%s.%s', tablename, policyname), ', ')
    INTO encontrada
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = ANY(ARRAY['FechamentoFrentista','Recebimento','Despesa'])
    AND cmd = 'ALL'
    AND 'anon' = ANY(roles);

  IF encontrada IS NOT NULL THEN
    RAISE EXCEPTION
      'Abortado: existe policy FOR ALL alcançando anon (%). Ela reabriria o DELETE por OR e tornaria esta migração decorativa. Resolva-a antes.',
      encontrada;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. As duas views deixam de rodar como `postgres` e perdem a escrita anônima.
--
-- DEFINIÇÕES ORIGINAIS, extraídas com `pg_get_viewdef` em 13/08/2026 — guardadas
-- aqui para que a reversão não dependa de backup:
--
--   CREATE VIEW public.frentistas AS
--     SELECT id, nome, ativo, posto_id, turno_id
--       FROM "Frentista";
--
--   CREATE VIEW public.vw_lucro_periodo AS
--     SELECT date(data) AS data,
--            posto_id,
--            total_vendas AS receita_bruta,
--            custo_combustiveis,
--            lucro_bruto,
--            taxas_pagamento,
--            abs(diferenca) AS faltas,
--            lucro_liquido,
--            margem_bruta_percentual,
--            margem_liquida_percentual
--       FROM "Fechamento" f
--      WHERE total_vendas > 0::numeric;
--
-- As duas continuam existindo e legíveis. Só param de ser porta de escrita.
-- -----------------------------------------------------------------------------
ALTER VIEW public.frentistas         SET (security_invoker = on);
ALTER VIEW public.vw_lucro_periodo   SET (security_invoker = on);

-- `security_invoker` sozinho não bastaria: sem `FORCE ROW LEVEL SECURITY` nas
-- tabelas base, um caminho de escrita futuro pelo dono voltaria a ignorar as
-- policies. Revogar o privilégio é a trava que não depende disso — privilégio de
-- tabela é checado ANTES de qualquer linha, então nem chega na RLS.
--
-- `TRUNCATE`, `REFERENCES` e `TRIGGER` vêm do `GRANT ALL` padrão do Supabase e
-- não fazem sentido para `anon` numa view. Saem junto.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.frentistas       FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.vw_lucro_periodo FROM anon, authenticated;

-- O SELECT fica, explicitamente — para que ninguém leia o REVOKE acima como
-- "as views foram desligadas" e as recrie com GRANT ALL.
GRANT SELECT ON public.frentistas       TO anon, authenticated;
GRANT SELECT ON public.vw_lucro_periodo TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Derruba as policies de DELETE anônimo, por catálogo e nunca por nome.
--
-- Mesmo padrão da migração de 02/08, pelo mesmo motivo: há policies criadas pelo
-- painel do Supabase que não constam de arquivo nenhum deste repositório. Em
-- 13/08 as três eram "Enable All for Anon on FechamentoFrentista_delete",
-- "Permitir exclusão anônima Recebimento" e "Despesa: Permitir deleção para
-- anon" — mas confiar nesses nomes é como a lista de tabelas ficou errada duas
-- vezes antes.
--
-- Só as que alcançam `anon`: as de `authenticated` ficam de pé. `authenticated`
-- hoje não é usado pelo painel (o login do web saiu em 29/07), e mexer nele é
-- escopo do dia em que o login voltar.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  p    record;
  alvo text[] := ARRAY['FechamentoFrentista','Recebimento','Despesa'];
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = ANY(alvo)
      AND cmd = 'DELETE'
      AND 'anon' = ANY(roles)
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
    RAISE NOTICE 'policy DELETE anônima "%" em % derrubada', p.policyname, p.tablename;
  END LOOP;
END $$;

-- Idempotência: se a migração já rodou, as policies novas existem e o DROP acima
-- não as pegou (elas alcançam anon, mas o loop acima roda antes da criação — no
-- reexecutar, elas SÃO pegas pelo loop e recriadas abaixo, o que é inofensivo).
DROP POLICY IF EXISTS "fechamento_frentista_delete_janela_edicao" ON public."FechamentoFrentista";
DROP POLICY IF EXISTS "recebimento_delete_janela_edicao"          ON public."Recebimento";
DROP POLICY IF EXISTS "despesa_delete_janela_edicao"              ON public."Despesa";

-- -----------------------------------------------------------------------------
-- 3. A janela de edição passa a valer para o DELETE.
--
-- DELETE só tem `USING` — não existe `WITH CHECK`, porque não há "como a linha
-- fica depois". O vetor de backdating que o UPDATE precisava fechar não existe
-- aqui.
-- -----------------------------------------------------------------------------

-- `Recebimento` e `FechamentoFrentista` não têm data própria: penduram no
-- `Fechamento` pai por `fechamento_id`, e a janela vem de lá. Mesmo desenho das
-- policies de INSERT e UPDATE dessas tabelas.
CREATE POLICY "fechamento_frentista_delete_janela_edicao" ON public."FechamentoFrentista"
  FOR DELETE TO anon
  USING (
    EXISTS (SELECT 1 FROM public."Fechamento" f
            WHERE f.id = fechamento_id AND public.dentro_da_janela_de_edicao(f.data))
  );

CREATE POLICY "recebimento_delete_janela_edicao" ON public."Recebimento"
  FOR DELETE TO anon
  USING (
    EXISTS (SELECT 1 FROM public."Fechamento" f
            WHERE f.id = fechamento_id AND public.dentro_da_janela_de_edicao(f.data))
  );

-- `Despesa` TEM data própria, e ela é `date`, não `timestamptz` como a do
-- `Fechamento`. O cast é explícito de propósito: date -> timestamptz é implícito
-- no Postgres e funcionaria calado, mas deixar implícito esconde do próximo
-- leitor que os tipos diferem, e é o tipo de detalhe que reaparece como bug
-- quando alguém troca a assinatura da função.
CREATE POLICY "despesa_delete_janela_edicao" ON public."Despesa"
  FOR DELETE TO anon
  USING (public.dentro_da_janela_de_edicao(data::timestamptz));

-- =============================================================================
-- VERIFICAÇÃO: `bash supabase/migrations/verifica-rls-fase1.sh`
--
-- Rode ANTES de aplicar (esperado: FALHA no bloco das views) e DEPOIS
-- (esperado: PASSA). Leia o cabeçalho do script: ele cobre as views por probe
-- HTTP seguro, e as três policies de DELETE por catálogo — porque sondar DELETE
-- de policy com a anon key contra produção APAGARIA dado real se a policy
-- estivesse aberta, que é exatamente o estado que se quer medir.
--
-- REVERTER (se o painel quebrar):
--   ALTER VIEW public.frentistas       SET (security_invoker = off);
--   ALTER VIEW public.vw_lucro_periodo SET (security_invoker = off);
--   GRANT INSERT, UPDATE, DELETE ON public.frentistas, public.vw_lucro_periodo
--     TO anon, authenticated;
--   DROP POLICY "fechamento_frentista_delete_janela_edicao" ON public."FechamentoFrentista";
--   DROP POLICY "recebimento_delete_janela_edicao"          ON public."Recebimento";
--   DROP POLICY "despesa_delete_janela_edicao"              ON public."Despesa";
--   -- e recriar as três `USING (true)` originais, se de fato forem necessárias
--   -- (elas não são: nenhuma tela apaga fechamento de mês retrasado).
-- =============================================================================
