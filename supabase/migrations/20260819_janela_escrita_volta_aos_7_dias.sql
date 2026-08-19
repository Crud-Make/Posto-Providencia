-- Devolve a janela de ESCRITA aos 7 dias, encerrado o replay de 2026.
--
-- Par de `20260819_janela_escrita_cobre_o_replay.sql`. Enquanto aquela estiver
-- aplicada, lançamento em qualquer data de 2026 é aceito — inclusive por engano.
-- Rodar esta é o passo que se esquece; se o replay acabou, é agora.

CREATE OR REPLACE FUNCTION public.dentro_da_janela_de_escrita(quando timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT quando >= (CURRENT_DATE - INTERVAL '7 days')
     AND quando <  (CURRENT_DATE + INTERVAL '2 days');
$function$;

-- A janela de edicao volta ao mes passado, como era.
CREATE OR REPLACE FUNCTION public.dentro_da_janela_de_edicao(quando timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT quando >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
     AND quando <  (CURRENT_DATE + INTERVAL '2 days');
$function$;

-- A policy de DELETE fica chamando a funcao (nao volta ao intervalo cravado):
-- o bug era justamente ela nao acompanhar a janela.
