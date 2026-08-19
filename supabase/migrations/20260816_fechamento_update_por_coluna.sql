-- =============================================================================
-- Tranca o `UPDATE` de `Fechamento` nas colunas que o sistema realmente grava.
--
-- PROBLEMA (medido em 16/08/2026, no catálogo, antes de publicar o app do dono):
--   `anon` e `authenticated` têm `UPDATE` de TABELA em `Fechamento`, sem
--   nenhum grant por coluna (`attacl` nulo). A única policy de UPDATE é:
--
--     fechamento_update_janela_edicao · TO anon, authenticated
--       USING/WITH CHECK (dentro_da_janela_de_edicao(data))
--
--   Ela olha UMA coisa: a data. Não olha posto, não olha coluna, não olha
--   status. Então qualquer um com a anon key — que é pública por definição, vai
--   no bundle de três apps — reescreve `total_vendas`, `diferenca`,
--   `total_recebido`, `status`, `usuario_id`, `posto_id` e até a própria `data`
--   de qualquer fechamento dentro da janela, com um `PATCH /rest/v1/Fechamento`.
--
--   `diferenca` é o número que aponta falta de caixa contra um frentista. Quem
--   escreve nele sem login escolhe quem deve dinheiro.
--
-- A JANELA É MAIS LARGA DO QUE O NOME SUGERE:
--     dentro_da_janela_de_edicao(d) →
--         d >= date_trunc('month', CURRENT_DATE - 1 month) AND d < CURRENT_DATE + 2
--   Em 16/08/2026 isso vale de 01/07 a 17/08 — 48 dias. No dia 31 de um mês ela
--   cobre dois meses inteiros, 62 dias. Ao ler o código, "janela" sugere os 7
--   dias do INSERT; são coisas diferentes.
--
-- POR QUE TRANCAR POR COLUNA, E NÃO POR PAPEL:
--   Porque não há papel para trancar. Os dois PWAs não têm login, e o painel
--   tem `modoVisitante` explícito, que segue falando como `anon`. Exigir
--   autenticação aqui quebraria a consolidação do fechamento em todos eles.
--   A coluna é a dimensão que dá para prender sem derrubar o fluxo real.
--
-- QUAIS COLUNAS, E POR QUE ESTAS CINCO — conferido nos dois únicos call sites
-- de UPDATE em `Fechamento` no monorepo inteiro (varredura em `apps/` e
-- `packages/` por `from('Fechamento')` seguido de `.update(`):
--
--   apps/web/.../useSubmissaoFechamento.ts:214   status, total_vendas,
--                                                total_recebido, diferenca,
--                                                observacoes
--   packages/api-core/src/encerrante.ts:309      total_vendas, total_recebido,
--                                                diferenca
--
--   Os demais arquivos que tocam `Fechamento` (`reset.service.ts`,
--   `limpezaMes.service.ts`, `aiService.ts`, `useDashboardProprietario.ts`,
--   `fechamentoFrentista.service.ts`) só fazem SELECT ou DELETE — conferido um
--   por um, não por amostra.
--
--   ⚠️ Uma auditoria anterior sugeriu conceder apenas TRÊS colunas
--   (`total_vendas`, `total_recebido`, `diferenca`), por ter classificado o
--   `fechamentoService.update` como código morto. Ele NÃO é: o
--   `useSubmissaoFechamento` o chama, e escreve também `status` e
--   `observacoes`. Aplicar com três colunas quebraria "Finalizar fechamento" no
--   painel — a funcionalidade central. As cinco vêm daí.
--
-- O QUE PASSA A SER IMPOSSÍVEL PARA QUEM NÃO É `service_role`:
--   - mudar `posto_id` de um fechamento (mover o dia de posto). Hoje existe um
--     posto só, então o ganho é preventivo — mas a policy nunca protegeu isso, e
--     no dia em que houver o segundo já estará fechado.
--   - mudar `data`, que é a coluna que a PRÓPRIA policy usa para decidir. Poder
--     reescrevê-la é poder arrastar uma linha para dentro ou para fora da
--     janela. É o furo mais desconfortável dos seis.
--   - mudar `usuario_id` (reatribuir quem fechou) e `id`.
--
-- O QUE ESTA MIGRAÇÃO **NÃO** RESOLVE, e é consciente:
--   - `authenticated` continua podendo APAGAR qualquer `Fechamento`, de
--     qualquer data, sem janela (policy `Permitir tudo para usuários
--     autenticados_delete`, `USING (true)`). Logar hoje dá mais poder de
--     destruição do que não logar. É outra migração, e precisa de decisão sobre
--     o fluxo de reset do painel antes.
--   - `anon` mantém `TRUNCATE` em `Fechamento` (grant herdado). O PostgREST não
--     expõe TRUNCATE, então não é alcançável pela API — mas é grant a mais, e
--     merece uma limpeza própria junto com as outras tabelas.
--   - A leitura anônima de tudo segue aberta. É a Fase 3.
--   - As cinco colunas concedidas continuam graváveis por anônimo dentro da
--     janela. Isto reduz a superfície, NÃO fecha a porta: fechar de verdade
--     exige login nos PWAs, que é decisão de produto.
--
-- REVERTER:
--   REVOKE UPDATE ON public."Fechamento" FROM anon, authenticated;
--   GRANT  UPDATE ON public."Fechamento" TO   anon, authenticated;
--
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Guarda — aborta se alguma coluna esperada não existir mais.
--
-- Um `GRANT` sobre coluna inexistente falha com erro do Postgres, mas o erro
-- não diz o que estava sendo tentado nem por quê. Falhar aqui, alto e com
-- nome, evita que alguém no futuro leia "column does not exist" e simplesmente
-- remova a coluna da lista — reduzindo a trava sem perceber.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    faltando text;
BEGIN
    SELECT string_agg(c, ', ')
      INTO faltando
      FROM unnest(ARRAY[
            'total_vendas', 'total_recebido', 'diferenca', 'status', 'observacoes'
           ]) AS c
     WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name   = 'Fechamento'
               AND column_name  = c
           );

    IF faltando IS NOT NULL THEN
        RAISE EXCEPTION
            'Abortado: coluna(s) ausente(s) em Fechamento (%). O esquema mudou — reveja os call sites de UPDATE antes de reaplicar.',
            faltando;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Tira o UPDATE de tabela inteira.
--
-- `anon` e `authenticated` juntos, de propósito: o painel escreve as MESMAS
-- cinco colunas logado ou em modo visitante, então não há motivo para o
-- autenticado manter poder de reescrever `posto_id` e `data`. Deixar só o
-- `anon` trancado daria a falsa impressão de porta fechada, com a porta ao lado
-- aberta.
-- -----------------------------------------------------------------------------
REVOKE UPDATE ON public."Fechamento" FROM anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Devolve o UPDATE só nas cinco colunas que o sistema grava.
--
-- Grant de coluna NÃO substitui a RLS: a policy da janela de edição continua
-- valendo por cima. São duas travas em série — o grant diz QUAIS colunas, a
-- policy diz QUAIS linhas.
-- -----------------------------------------------------------------------------
GRANT UPDATE (total_vendas, total_recebido, diferenca, status, observacoes)
    ON public."Fechamento"
    TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Verificação — a migração prova a si mesma antes de commitar.
--
-- "Rodou sem erro" não é a mesma coisa que "trancou". Aqui se confere que o
-- privilégio de tabela sumiu E que as cinco colunas voltaram, para os dois
-- papéis.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    r            text;
    ainda_tabela integer;
    colunas_ok   integer;
BEGIN
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP

        -- Privilégio de TABELA não pode mais existir.
        SELECT count(*) INTO ainda_tabela
          FROM information_schema.role_table_grants
         WHERE table_schema   = 'public'
           AND table_name     = 'Fechamento'
           AND grantee        = r
           AND privilege_type = 'UPDATE';

        IF ainda_tabela > 0 THEN
            RAISE EXCEPTION
                'Abortado: % ainda tem UPDATE de tabela em Fechamento — a trava não pegou.', r;
        END IF;

        -- E as cinco colunas têm de estar concedidas.
        SELECT count(*) INTO colunas_ok
          FROM information_schema.column_privileges
         WHERE table_schema   = 'public'
           AND table_name     = 'Fechamento'
           AND grantee        = r
           AND privilege_type = 'UPDATE'
           AND column_name IN ('total_vendas', 'total_recebido', 'diferenca',
                               'status', 'observacoes');

        IF colunas_ok <> 5 THEN
            RAISE EXCEPTION
                'Abortado: % ficou com % de 5 colunas graváveis. O fechamento do painel quebraria.',
                r, colunas_ok;
        END IF;

    END LOOP;

    -- A policy da janela precisa continuar de pé: sem ela, o grant de coluna
    -- sozinho liberaria qualquer DATA dentro das colunas permitidas.
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename  = 'Fechamento'
           AND cmd        = 'UPDATE'
    ) THEN
        RAISE EXCEPTION
            'Abortado: sumiu a policy de UPDATE de Fechamento — o grant de coluna sozinho não prende a data.';
    END IF;
END $$;

COMMIT;
