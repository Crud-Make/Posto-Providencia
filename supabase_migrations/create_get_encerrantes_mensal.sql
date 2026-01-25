-- Migration: Create get_encerrantes_mensal function
-- Description: Audit view for nozzle readings (Start vs End of Month).

CREATE OR REPLACE FUNCTION get_encerrantes_mensal(
  p_posto_id BIGINT,
  p_mes INT,
  p_ano INT
)
RETURNS TABLE (
  bico_nome TEXT,
  combustivel_nome TEXT,
  leitura_inicial NUMERIC,
  leitura_final NUMERIC,
  vendas_registradas NUMERIC,
  diferenca NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE := make_date(p_ano, p_mes, 1);
  v_end_date DATE := (v_start_date + interval '1 month' - interval '1 day')::date;
BEGIN
  RETURN QUERY
  WITH 
  min_max_readings AS (
    SELECT 
      l.bico_id,
      MIN(l.leitura_inicial) as min_li,
      MAX(l.leitura_final) as max_lf,
      SUM(l.litros_vendidos) as total_litros
    FROM "Leitura" l
    WHERE l.posto_id = p_posto_id
      AND l.data >= v_start_date 
      AND l.data <= v_end_date
    GROUP BY l.bico_id
  )
  SELECT 
    b.nome as bico_nome,
    c.nome as combustivel_nome,
    COALESCE(mm.min_li, 0) as leitura_inicial,
    COALESCE(mm.max_lf, 0) as leitura_final,
    COALESCE(mm.total_litros, 0) as vendas_registradas,
    (COALESCE(mm.max_lf, 0) - COALESCE(mm.min_li, 0) - COALESCE(mm.total_litros, 0)) as diferenca
  FROM "Bico" b
  JOIN "Combustivel" c ON b.combustivel_id = c.id
  LEFT JOIN min_max_readings mm ON b.id = mm.bico_id
  WHERE b.ativo = true
    AND b.posto_id = p_posto_id
  ORDER BY b.nome;
END;
$$;
