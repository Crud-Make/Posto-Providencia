-- Alarga a janela de ESCRITA para permitir o replay do ano de 2026.
--
-- POR QUÊ
-- `dentro_da_janela_de_escrita` aceitava apenas `CURRENT_DATE - 7 dias`. A regra
-- existe para impedir que alguém backdate lançamento financeiro meses depois — é
-- controle legítimo e continua valendo para o futuro. Mas ela também impede a
-- carga inicial: o banco transacional foi zerado em 14/08/2026 e a reconstrução
-- é dia a dia pela interface, de 01/01/2026 em diante. Com a janela de 7 dias,
-- 205 dos 212 dias do histórico são irrecusáveis pelo banco.
--
-- O QUE MUDA
-- O piso passa a ser 31/12/2025 (a leitura de abertura de janeiro). O teto NÃO
-- muda: continua `CURRENT_DATE + 2 dias`, então lançar no futuro segue barrado,
-- que é o lado da regra que protege contra fraude, não contra atraso.
--
-- QUANDO REVERTER
-- Terminado o replay, rode `20260819_janela_escrita_volta_aos_7_dias.sql`, no
-- mesmo diretório. Enquanto esta estiver aplicada, qualquer data de 2026 aceita
-- inserção — inclusive por engano.
--
-- Decisão do dono em 19/08/2026, com o trade-off posto na mesa.

CREATE OR REPLACE FUNCTION public.dentro_da_janela_de_escrita(quando timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT quando >= DATE '2025-12-31'
     AND quando <  (CURRENT_DATE + INTERVAL '2 days');
$function$;

-- ---------------------------------------------------------------------------
-- A janela de EDICAO acompanha, pelo mesmo motivo: a consolidacao de
-- `Fechamento.total_vendas` e UPDATE e o apaga-e-regrava de
-- `FechamentoFrentista` e DELETE. Sem alargar as duas, o replay passa na
-- primeira gravacao e quebra na segunda.
CREATE OR REPLACE FUNCTION public.dentro_da_janela_de_edicao(quando timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT quando >= DATE '2025-12-31'
     AND quando <  (CURRENT_DATE + INTERVAL '2 days');
$function$;

-- `leitura_delete_janela_7d` tinha o intervalo CRAVADO na policy em vez de
-- chamar a funcao, e por isso nao acompanhava as outras. Passa a chamar.
DROP POLICY IF EXISTS leitura_delete_janela_7d ON public."Leitura";
CREATE POLICY leitura_delete_janela_7d ON public."Leitura"
  FOR DELETE TO anon, authenticated
  USING (dentro_da_janela_de_escrita(data));
