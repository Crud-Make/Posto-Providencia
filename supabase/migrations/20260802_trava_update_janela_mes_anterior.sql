-- =============================================================================
-- Trava o UPDATE anônimo das tabelas de dinheiro à janela "mês corrente + mês
-- anterior", e corrige a volatilidade da função da trava de INSERT.
--
-- PROBLEMA (medido em 02/08/2026, `supabase/migrations/verifica-rls-update.sh`):
--   As 4 tabelas de dinheiro aceitam `UPDATE` anônimo em QUALQUER linha:
--
--     Leitura, Fechamento, FechamentoFrentista, Recebimento
--
--   As travas de 31/07 (DELETE) e de hoje de manhã (INSERT) fecharam criar e
--   apagar no passado. Alterar linha já gravada continuava aberto — dá para
--   mudar o valor de um fechamento de fevereiro com um curl, e a divergência
--   aparece como falta do frentista.
--
-- COMO ISSO FOI MEDIDO, já que 204 não distingue negado de permitido:
--   O probe manda NULL numa coluna NOT NULL, filtrado por um id real. Se a RLS
--   deixa passar, o Postgres recusa com 23502 e aborta — o 23502 É a prova de
--   que a policy permitiu o UPDATE chegar à tabela. Se a RLS barra, a linha não
--   entra no conjunto e volta 204 vazio. Nada é gravado nos dois casos.
--
-- POR QUE A JANELA AQUI É MAIOR QUE A DO INSERT/DELETE (7 dias):
--   Criar ou apagar linha no passado nunca é legítimo. ALTERAR é: o gerente
--   corrige o fechamento do mês anterior pela tela (`fechamento-diario` abre em
--   hoje, mas `selectedDate` é livre). Uma janela de 45 dias entregaria isso no
--   começo do mês e falharia no fim — em 31/08, 45 dias não alcançam 01/07.
--   "Início do mês anterior" cumpre a intenção em qualquer dia do mês.
--
-- O QUE MUDA NA PRÁTICA:
--   PWA    — igual. Sempre regrava o dia corrente.
--   Painel — corrigir fechamento do mês corrente e do anterior, igual. Corrigir
--            mês retrasado deixa de funcionar pela tela e passa a exigir o
--            painel do Supabase.
--   Ataque — com as três travas juntas, o passado apurado fica congelado.
--
-- NÃO RESOLVE: mês corrente e anterior seguem graváveis por quem tiver a anon
--   key (ela é pública por definição, vai no bundle). Fechar o vetor de escrita
--   de vez exige auth real no painel ou Edge Function — decisão adiada
--   conscientemente, não esquecida.
--
-- Idempotente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Correção da trava de INSERT aplicada hoje de manhã.
--
-- `dentro_da_janela_de_escrita` foi criada IMMUTABLE, e usa CURRENT_DATE.
-- IMMUTABLE promete ao planejador que a mesma entrada devolve o mesmo resultado
-- para sempre, o que autoriza dobrar a chamada em plano de consulta em cache.
-- O PostgREST usa prepared statements sobre pool de conexão: o plano sobrevive
-- à virada do dia, e a janela poderia parar de andar — travando escrita legítima
-- ou liberando escrita antiga, sem aviso. STABLE é a promessa correta: constante
-- dentro de uma consulta, livre para mudar entre consultas.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dentro_da_janela_de_escrita(quando timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT quando >= (CURRENT_DATE - INTERVAL '7 days')
     AND quando <  (CURRENT_DATE + INTERVAL '2 days');
$$;

-- -----------------------------------------------------------------------------
-- 1. Janela de EDIÇÃO — mais larga que a de escrita, e por um motivo diferente.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dentro_da_janela_de_edicao(quando timestamptz)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  -- Do primeiro dia do mês anterior até amanhã (a folga de 1 dia evita briga
  -- de fuso na virada: o posto é GMT-3, o servidor pensa em UTC).
  SELECT quando >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
     AND quando <  (CURRENT_DATE + INTERVAL '2 days');
$$;

-- -----------------------------------------------------------------------------
-- 2. Derruba as policies de UPDATE existentes e instala a janela.
--
-- Varredura por catálogo, nunca por nome: há policies criadas pelo painel do
-- Supabase que não constam de arquivo nenhum deste repositório. As policies são
-- OR entre si — uma única `USING (true)` sobrevivente reabriria tudo.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  p    record;
  alvo text[] := ARRAY['Leitura','Fechamento','FechamentoFrentista','Recebimento'];
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(alvo) AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
    RAISE NOTICE 'policy UPDATE "%" em % derrubada', p.policyname, p.tablename;
  END LOOP;
END $$;

-- USING decide QUAIS linhas podem ser alteradas; WITH CHECK decide COMO a linha
-- pode ficar depois. Os dois precisam da janela: só USING deixaria mover uma
-- linha para fora dela (mudar `data` para janeiro e sumir do alcance da própria
-- policy); só WITH CHECK deixaria alterar linha antiga.
CREATE POLICY "leitura_update_janela_edicao" ON public."Leitura"
  FOR UPDATE TO anon, authenticated
  USING (public.dentro_da_janela_de_edicao(data))
  WITH CHECK (public.dentro_da_janela_de_edicao(data));

CREATE POLICY "fechamento_update_janela_edicao" ON public."Fechamento"
  FOR UPDATE TO anon, authenticated
  USING (public.dentro_da_janela_de_edicao(data))
  WITH CHECK (public.dentro_da_janela_de_edicao(data));

-- `Recebimento` e `FechamentoFrentista` não têm data própria: penduram no
-- `Fechamento` pai por `fechamento_id`, e a janela vem de lá — mesmo desenho da
-- trava de INSERT. Conferido contra a API real, não contra `database.types.ts`,
-- que declara colunas que não existem.
CREATE POLICY "recebimento_update_janela_edicao" ON public."Recebimento"
  FOR UPDATE TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public."Fechamento" f
            WHERE f.id = fechamento_id AND public.dentro_da_janela_de_edicao(f.data))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public."Fechamento" f
            WHERE f.id = fechamento_id AND public.dentro_da_janela_de_edicao(f.data))
  );

CREATE POLICY "fechamento_frentista_update_janela_edicao" ON public."FechamentoFrentista"
  FOR UPDATE TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public."Fechamento" f
            WHERE f.id = fechamento_id AND public.dentro_da_janela_de_edicao(f.data))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public."Fechamento" f
            WHERE f.id = fechamento_id AND public.dentro_da_janela_de_edicao(f.data))
  );

-- =============================================================================
-- VERIFICAÇÃO: `bash supabase/migrations/verifica-rls-update.sh`
--
-- Ele NÃO espera "tudo bloqueado" — isso também passaria se a policy quebrasse
-- o painel. Espera a REGRA: linha anterior ao mês passado bloqueada, linha
-- dentro da janela ainda gravável.
-- =============================================================================
