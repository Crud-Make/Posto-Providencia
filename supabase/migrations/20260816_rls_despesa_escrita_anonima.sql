-- =============================================================================
-- Fecha a escrita anônima em `Despesa`.
--
-- PROBLEMA (achado em 16/08/2026, ao conferir a RLS ANTES de ligar a digitação
-- de despesa na tela `/planilha`):
--   A tabela tem RLS ligada e, ainda assim, o `anon` insere e altera. São duas
--   policies, e as duas são irrestritas:
--
--     "Despesa: Permitir inserção para anon"   FOR INSERT · TO anon · WITH CHECK (true)
--     "Despesa: Permitir atualização para anon" FOR UPDATE · TO anon · USING (true) WITH CHECK (true)
--
--   A anon key é pública por definição — vai no bundle publicado do painel.
--   Então hoje qualquer um que abra o site consegue lançar uma despesa nova, ou
--   alterar o valor de uma despesa existente, sem login nenhum.
--
-- POR QUE ESTA É PIOR QUE A DO `HistoricoTanque`, fechada mais cedo hoje:
--   Lá o estrago era num número de apuração. Aqui é na corrente inteira do
--   lucro, e a conta é curta:
--
--     custo operacional por litro = despesas do mês ÷ litros vendidos
--     valor p/ venda (piso)       = custo médio da compra + custo por litro
--     lucro do bico               = venda − litros × valor p/ venda
--
--   Ou seja: quem escreve em `Despesa` sem login move o custo do litro, move o
--   piso de venda de TODO produto e move o lucro apurado do posto inteiro. Uma
--   linha inventada de R$ 20.000 num mês de ~46 mil litros desloca o custo do
--   litro em ~R$ 0,43 e derruba o lucro do mês na mesma proporção — e a tela vai
--   mostrar isso como se fosse o resultado real do negócio.
--
--   O caminho contrário também vale: APAGAR valor via UPDATE (o `anon` pode) faz
--   o posto parecer mais lucrativo do que é. Não há nada no sistema que
--   contradiga a mentira, porque a `Despesa` é a autoridade do rateio.
--
-- POR QUE A REGRA NOVA NÃO É REGRA NOVA:
--   Ela copia a forma que a própria tabela já usa para o papel `authenticated`
--   ("Allow all access to authenticated users on Despesa") e que `Compra`,
--   `Tanque` e `HistoricoTanque` também usam. O `(SELECT ...)` em volta do
--   `auth.role()` é o que o §5 do CLAUDE.md exige: permite cache por transação
--   em vez de reavaliar linha a linha.
--
-- POR QUE **NÃO** TEM JANELA DE TEMPO:
--   Mesma razão do `HistoricoTanque`: o banco está em replay desde 14/08, sendo
--   reconstruído mês a mês pela UI. A carga de janeiro gravou despesa com data
--   31/01, e a digitação nova da `/planilha` grava no último dia do mês
--   apurado — sempre no passado. Uma janela de 7 dias bloquearia o trabalho em
--   curso. A trava aqui é QUEM escreve, não QUANDO.
--
--   A policy `despesa_delete_janela_edicao` (DELETE, anon, dentro da janela)
--   é DERRUBADA junto: com INSERT e UPDATE fechados para o anônimo, manter um
--   DELETE anônimo — ainda que limitado no tempo — deixaria de pé o pior dos
--   três verbos, o único que não deixa rastro nenhum do que havia.
--
-- O QUE MUDA NA PRÁTICA:
--   PWA do frentista — nada. Não toca nesta tabela (conferido no código em
--                      16/08: `from('Despesa')` não aparece em `apps/pwa-frentista`).
--   Painel logado    — igual. Conferido em 16/08 com sessão real
--                      (`posto@providencia.com`): `despesa.service`,
--                      `despesa-fixa.service` e a digitação nova da `/planilha`
--                      passam todos como `authenticated`.
--   Painel visitante — deixa de lançar e de alterar despesa. Atinge, de
--                      propósito: a tela de Despesas, as despesas fixas e o
--                      campo `Despesas do mês` da `/planilha`.
--   Leitura          — INTACTA. A policy de SELECT anônimo continua de pé; o
--                      painel lê como visitante e isso é a Fase 3, não esta.
--
-- O QUE ESTA MIGRAÇÃO **NÃO** RESOLVE, e é consciente:
--   - A leitura anônima do painel inteiro segue aberta (Fase 3).
--   - O bug de o app REPORTAR SUCESSO sobre uma recusa da RLS é da aplicação,
--     não da policy — ver a memória `reset-do-painel-apaga-em-silencio`. Na
--     `/planilha` a recusa já é traduzida por `mensagemDeErro`; nas telas
--     antigas de despesa, não.
--   - `get_frentistas_with_email` segue como estava.
--
-- REVERTER: derrube as policies novas e recrie as antigas —
--   DROP POLICY "Despesa: escrita só de usuário autenticado" ON public."Despesa";
--   CREATE POLICY "Despesa: Permitir inserção para anon"
--     ON public."Despesa" FOR INSERT TO anon WITH CHECK (true);
--   CREATE POLICY "Despesa: Permitir atualização para anon"
--     ON public."Despesa" FOR UPDATE TO anon USING (true) WITH CHECK (true);
--
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Guarda — aborta se existir OUTRA policy de escrita alcançando o anônimo
--    além das três que esta migração conhece e derruba.
--
-- Policies permissivas são OR entre si: uma quarta policy alcançando `anon`
-- tornaria tudo abaixo decorativo, e a verificação final passaria em verde sobre
-- um buraco aberto. Verde falso é pior que vermelho, porque o vermelho avisa.
--
-- Medido em 16/08/2026, a tabela tinha exatamente estas policies de escrita
-- alcançando anon: as duas do INSERT/UPDATE e a `despesa_delete_janela_edicao`.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    sobrando text;
BEGIN
    SELECT string_agg(policyname, ', ')
      INTO sobrando
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename  = 'Despesa'
       AND policyname NOT IN (
             'Despesa: Permitir inserção para anon',
             'Despesa: Permitir atualização para anon',
             'despesa_delete_janela_edicao'
           )
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
-- 1. Derruba as três portas anônimas de escrita.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Despesa: Permitir inserção para anon"    ON public."Despesa";
DROP POLICY IF EXISTS "Despesa: Permitir atualização para anon" ON public."Despesa";
DROP POLICY IF EXISTS "despesa_delete_janela_edicao"            ON public."Despesa";

-- -----------------------------------------------------------------------------
-- 2. Escrita só para sessão autenticada.
--
-- A tabela já tinha policies de escrita para `authenticated` — três separadas
-- (INSERT, UPDATE, DELETE) mais uma `ALL`. Ficam como estão: são redundantes
-- entre si, mas todas exigem autenticação, e mexer nelas ampliaria o alcance
-- desta migração sem ganho. O que entra aqui é a regra explícita e nomeada, para
-- que a INTENÇÃO fique legível no catálogo e não dependa de somar quatro
-- policies de cabeça.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Despesa: escrita só de usuário autenticado" ON public."Despesa";
CREATE POLICY "Despesa: escrita só de usuário autenticado"
    ON public."Despesa"
    FOR ALL
    TO public
    USING      ((SELECT auth.role()) = 'authenticated')
    WITH CHECK ((SELECT auth.role()) = 'authenticated');

-- -----------------------------------------------------------------------------
-- 3. Garante a leitura anônima — o painel lê como visitante.
--
-- Recriada por nome para a migração ser idempotente e não depender de a policy
-- anterior continuar existindo com esse nome exato.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Despesa: Permitir leitura para anon" ON public."Despesa";
CREATE POLICY "Despesa: Permitir leitura para anon"
    ON public."Despesa"
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
    rls_ligada    boolean;
    anon_escreve  integer;
    tem_leitura   integer;
    tem_escrita   integer;
BEGIN
    SELECT c.relrowsecurity INTO rls_ligada
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'Despesa';

    IF NOT rls_ligada THEN
        RAISE EXCEPTION 'Abortado: RLS desligada em Despesa — policy nenhuma vale nada assim.';
    END IF;

    -- Nenhuma policy de escrita pode restar IRRESTRITA alcançando o anônimo.
    --
    -- Os dois lados importam, e testar só um deixa buraco:
    --   · o papel — `anon` direto, ou `public`, que o contém;
    --   · o predicado — a policy criada acima é `TO public` de propósito (é a
    --     forma que `Tanque` e `HistoricoTanque` já usam), então procurar apenas
    --     por "alcança public" reprovaria a própria correção. O que separa uma
    --     da outra é o predicado: aqui ele exige `authenticated`; nas antigas
    --     era `true`.
    --
    -- Irrestrita = nada barra a linha. `qual` nulo é o caso do INSERT, onde só
    -- o `WITH CHECK` vale; `with_check` nulo é o caso em que o Postgres
    -- reaproveita o `USING` — por isso os dois entram como `true` por omissão.
    SELECT count(*) INTO anon_escreve
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'Despesa'
       AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
       AND permissive = 'PERMISSIVE'
       AND ('anon' = ANY (roles) OR 'public' = ANY (roles))
       AND coalesce(qual, 'true')       = 'true'
       AND coalesce(with_check, 'true') = 'true';

    IF anon_escreve > 0 THEN
        RAISE EXCEPTION
            'Abortado: sobrou % policy de escrita irrestrita alcançando anon em Despesa.', anon_escreve;
    END IF;

    SELECT count(*) INTO tem_leitura
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'Despesa' AND cmd = 'SELECT';

    SELECT count(*) INTO tem_escrita
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = 'Despesa'
       AND policyname = 'Despesa: escrita só de usuário autenticado';

    IF tem_leitura = 0 THEN
        RAISE EXCEPTION 'Abortado: a leitura anônima sumiu — o painel ficaria cego.';
    END IF;

    IF tem_escrita = 0 THEN
        RAISE EXCEPTION 'Abortado: a policy de escrita autenticada não foi criada.';
    END IF;
END $$;

COMMIT;
