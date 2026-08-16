-- =============================================================================
-- Fecha a escrita anônima em `HistoricoTanque`.
--
-- PROBLEMA (achado e MEDIDO em 16/08/2026, ao ligar a tela `/planilha` ao banco):
--   A tabela tem RLS ligada (`relrowsecurity` = true) e, ainda assim, o `anon`
--   grava nela. A culpa é de uma policy só:
--
--     "Public Access"  ·  FOR ALL  ·  role `public`  ·  USING (true)  ·  sem WITH CHECK
--
--   `public` inclui `anon`. E, numa policy sem `WITH CHECK`, o Postgres usa o
--   `USING` como verificação do INSERT — então `USING (true)` libera INSERT,
--   UPDATE e DELETE para qualquer um com a anon key, que é pública por
--   definição (vai no bundle publicado do painel).
--
--   NÃO é teoria. Medido pela UI, em modo visitante, sem login: gravei
--   `volume_fisico = 1234` no tanque 1 (linha id 97, data 2026-06-30) pela tela
--   `/planilha` e apaguei em seguida — a tabela voltou a 0 linhas. O caminho
--   está aberto hoje.
--
-- POR QUE ESTA TABELA É PIOR DO QUE PARECE:
--   A medição de tanque é o ÚNICO insumo da perda de combustível:
--
--     perca_sobra = estoque medido na régua − estoque teórico
--
--   O estoque teórico sai de compra e venda, que já têm suas travas. A régua
--   não sai de cálculo nenhum — é gente olhando o tanque. Quem escreve nela sem
--   login **escolhe se o posto aparece com perda ou sem**, e nenhum outro número
--   do sistema contradiz a escolha. É o número que aponta o dedo para alguém.
--
-- POR QUE A REGRA NOVA NÃO É REGRA NOVA:
--   Ela copia, letra por letra, a policy que a tabela-mãe `Tanque` já usa e que
--   está em produção há tempo:
--
--     "Permitir tudo para usuários autenticados"
--        FOR ALL · USING ((SELECT auth.role()) = 'authenticated')
--
--   `Tanque` e `HistoricoTanque` guardam a mesma coisa em tempos diferentes — o
--   volume agora e o volume na data. Ter uma trancada e a outra aberta era
--   incoerência, não decisão. O `(SELECT ...)` em volta do `auth.role()` é o que
--   o §5 do CLAUDE.md exige: permite cache por transação em vez de reavaliar
--   linha a linha.
--
-- POR QUE **NÃO** TEM JANELA DE TEMPO, ao contrário das tabelas de dinheiro:
--   As travas de 02/08 (`dentro_da_janela_de_escrita`) prendem o INSERT a 7 dias
--   porque todo caminho legítimo daquelas tabelas é do dia corrente. Aqui é o
--   oposto: o banco está em **replay desde 14/08**, sendo reconstruído mês a mês
--   pela UI, e a medição de abertura de um período é gravada na VÉSPERA dele —
--   lançar janeiro exige escrever em 31/12. Uma janela de 7 dias bloquearia
--   exatamente o trabalho em curso. A trava aqui é QUEM escreve, não QUANDO.
--
-- O QUE MUDA NA PRÁTICA:
--   PWA do frentista — nada. Não toca nesta tabela (conferido no código: os
--                      únicos escritores são 4 arquivos de `apps/web`).
--   Painel logado    — igual. `signInWithPassword` já existe (`AuthContext`), e
--                      sessão autenticada passa na policy nova.
--   Painel visitante — deixa de gravar medição de tanque. Atinge, de propósito:
--                      `/planilha` (Gravar medições), o dashboard de estoque, o
--                      registro de compras e o reset do painel. A recusa da RLS
--                      já é traduzida para o dono em
--                      `use-planilha-do-banco.ts:mensagemDeErro` ("você está em
--                      modo visitante, entre com seu login").
--   Leitura          — intacta. A policy de SELECT anônimo continua de pé; o
--                      painel lê como visitante e isso é a Fase 3, não esta.
--
-- O QUE ESTA MIGRAÇÃO **NÃO** RESOLVE, e é consciente:
--   - `reset.service.ts` apaga `HistoricoTanque` e, em modo visitante, passará a
--     falhar. O bug de o app REPORTAR SUCESSO sobre uma recusa da RLS é da
--     aplicação, não da policy, e continua de pé — ver a memória
--     `reset-do-painel-apaga-em-silencio`.
--   - A leitura anônima do painel inteiro segue aberta (Fase 3).
--   - As pendências da Fase 1 (`Despesa` com INSERT/UPDATE anônimo, e a
--     `get_frentistas_with_email`) seguem como estavam.
--
-- REVERTER: derrube a policy nova e recrie a antiga —
--   DROP POLICY "Escrita só de usuário autenticado" ON public."HistoricoTanque";
--   CREATE POLICY "Public Access" ON public."HistoricoTanque"
--     FOR ALL TO public USING (true);
--
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Guarda — aborta se existir OUTRA policy que reabra a escrita por fora.
--
-- Policies são OR entre si: uma segunda policy permissiva `FOR ALL` alcançando
-- `anon` tornaria tudo abaixo decorativo, e a verificação final passaria em
-- verde sobre um buraco aberto. Verde falso é pior que vermelho, porque o
-- vermelho avisa. Então aqui a migração FALHA ALTO em vez de fingir.
--
-- Medido em 16/08/2026: além da `Public Access` (que esta migração derruba), a
-- tabela só tem `Permitir leitura anonima HistoricoTanque`, que é SELECT.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    sobrando text;
BEGIN
    SELECT string_agg(policyname, ', ')
      INTO sobrando
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'HistoricoTanque'
       AND policyname <> 'Public Access'
       AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
       AND permissive = 'PERMISSIVE'
       AND ('anon' = ANY (roles) OR 'public' = ANY (roles));

    IF sobrando IS NOT NULL THEN
        RAISE EXCEPTION
            'Abortado: policy de escrita alcançando anon fora do previsto (%). Audite antes de reaplicar.',
            sobrando;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Derruba a policy que abre a escrita para todo mundo.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public Access" ON public."HistoricoTanque";

-- -----------------------------------------------------------------------------
-- 2. Escrita só para sessão autenticada — a MESMA forma já usada em `Tanque`.
--
-- O `WITH CHECK` vai explícito, e não omitido como na policy de `Tanque`.
-- Comportamento idêntico (sem `WITH CHECK` o Postgres reaproveita o `USING`),
-- mas escrito por extenso a intenção não depende de quem lê saber dessa regra.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Escrita só de usuário autenticado" ON public."HistoricoTanque";
CREATE POLICY "Escrita só de usuário autenticado"
    ON public."HistoricoTanque"
    FOR ALL
    TO public
    USING      ((SELECT auth.role()) = 'authenticated')
    WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- -----------------------------------------------------------------------------
-- 3. Garante a leitura anônima — o painel lê como visitante.
--
-- Recriada por nome para a migração ser idempotente e não depender de a policy
-- de 13/08 continuar existindo com esse nome exato.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Permitir leitura anonima HistoricoTanque" ON public."HistoricoTanque";
CREATE POLICY "Permitir leitura anonima HistoricoTanque"
    ON public."HistoricoTanque"
    FOR SELECT
    TO anon
    USING (true);

-- -----------------------------------------------------------------------------
-- 4. Verificação — a migração prova a si mesma antes de commitar.
--
-- Sem isto, "aplicada" significaria "rodou sem erro", que não é a mesma coisa
-- que "fechou o buraco".
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    rls_ligada  boolean;
    escrita_livre integer;
    tem_leitura integer;
    tem_escrita integer;
BEGIN
    SELECT c.relrowsecurity INTO rls_ligada
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'HistoricoTanque';

    IF NOT rls_ligada THEN
        RAISE EXCEPTION 'Abortado: RLS desligada em HistoricoTanque — policy nenhuma vale nada assim.';
    END IF;

    -- Nenhuma policy de escrita pode sobrar com predicado irrestrito.
    SELECT count(*) INTO escrita_livre
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'HistoricoTanque'
       AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
       AND permissive = 'PERMISSIVE'
       AND coalesce(qual, 'true') = 'true';

    IF escrita_livre > 0 THEN
        RAISE EXCEPTION 'Abortado: sobrou % policy de escrita com USING(true).', escrita_livre;
    END IF;

    SELECT count(*) INTO tem_leitura
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'HistoricoTanque' AND cmd = 'SELECT';

    SELECT count(*) INTO tem_escrita
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'HistoricoTanque'
       AND policyname = 'Escrita só de usuário autenticado';

    IF tem_leitura = 0 THEN
        RAISE EXCEPTION 'Abortado: a leitura anônima sumiu — o painel ficaria cego.';
    END IF;

    IF tem_escrita = 0 THEN
        RAISE EXCEPTION 'Abortado: a policy de escrita autenticada não foi criada.';
    END IF;
END $$;

COMMIT;
