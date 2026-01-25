-- Migration: Update get_fechamento_mensal function
-- Description: Adds sales breakdown by fuel type and detailed daily metrics.

CREATE OR REPLACE FUNCTION get_fechamento_mensal(
  p_posto_id BIGINT,
  p_mes INT,
  p_ano INT
)
RETURNS TABLE (
  dia DATE,
  volume_total NUMERIC,
  faturamento_bruto NUMERIC,
  lucro_bruto NUMERIC,
  custo_taxas NUMERIC,
  lucro_liquido NUMERIC,
  status TEXT,
  -- Breakdown Columns
  vol_gasolina NUMERIC,
  vol_aditivada NUMERIC,
  vol_etanol NUMERIC,
  vol_diesel NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE := make_date(p_ano, p_mes, 1);
  v_end_date DATE := (v_start_date + interval '1 month' - interval '1 day')::date;
BEGIN
  RETURN QUERY
  WITH 
  -- 1. Agregação de Vendas Detalhadas por Dia
  vendas_dia AS (
    SELECT 
      l.data,
      COALESCE(SUM(l.litros_vendidos), 0) as vol_total,
      COALESCE(SUM(l.valor_total), 0) as fat_bruto,
      -- Profit Calculation (Margins)
      COALESCE(SUM(
        l.valor_total * 
        CASE 
          WHEN c.nome ILIKE '%GASOLINA ADITIVADA%' THEN 0.1153
          WHEN c.nome ILIKE '%GASOLINA%' THEN 0.1179
          WHEN c.nome ILIKE '%ETANOL%' THEN 0.0902
          WHEN c.nome ILIKE '%DIESEL%' THEN 0.0273
          ELSE 0.10
        END
      ), 0) as luc_bruto,
      -- Volume Breakdown
      COALESCE(SUM(CASE WHEN c.nome ILIKE '%GASOLINA%' AND NOT c.nome ILIKE '%ADITIVADA%' THEN l.litros_vendidos ELSE 0 END), 0) as v_gas,
      COALESCE(SUM(CASE WHEN c.nome ILIKE '%ADITIVADA%' THEN l.litros_vendidos ELSE 0 END), 0) as v_adt,
      COALESCE(SUM(CASE WHEN c.nome ILIKE '%ETANOL%' THEN l.litros_vendidos ELSE 0 END), 0) as v_eta,
      COALESCE(SUM(CASE WHEN c.nome ILIKE '%DIESEL%' THEN l.litros_vendidos ELSE 0 END), 0) as v_die
    FROM "Leitura" l
    JOIN "Combustivel" c ON l.combustivel_id = c.id
    WHERE l.posto_id = p_posto_id
      AND l.data >= v_start_date 
      AND l.data <= v_end_date
    GROUP BY l.data
  ),
  
  -- 2. Agregação de Recebimentos (Taxas) por Dia
  recebimentos_dia AS (
    SELECT 
      f.data,
      COALESCE(SUM(
        CASE 
          WHEN fp.nome ILIKE '%DÉBITO%' THEN r.valor * 0.012
          WHEN fp.nome ILIKE '%CRÉDITO%' THEN r.valor * 0.035
          ELSE 0
        END
      ), 0) as taxas_total
    FROM "Recebimento" r
    JOIN "Fechamento" f ON r.fechamento_id = f.id
    JOIN "FormaPagamento" fp ON r.forma_pagamento_id = fp.id
    WHERE f.posto_id = p_posto_id
      AND f.data >= v_start_date 
      AND f.data <= v_end_date
    GROUP BY f.data
  ),

  -- 3. Status
  status_dia AS (
    SELECT
      f.data,
      STRING_AGG(DISTINCT f.status, ', ') as status_agg
    FROM "Fechamento" f
    WHERE f.posto_id = p_posto_id
      AND f.data >= v_start_date 
      AND f.data <= v_end_date
    GROUP BY f.data
  )

  -- 4. Final Query
  SELECT 
    v.data as dia,
    v.vol_total as volume_total,
    v.fat_bruto as faturamento_bruto,
    v.luc_bruto as lucro_bruto,
    COALESCE(r.taxas_total, 0) as custo_taxas,
    (v.luc_bruto - COALESCE(r.taxas_total, 0)) as lucro_liquido,
    COALESCE(s.status_agg, 'PENDENTE') as status,
    v.v_gas as vol_gasolina,
    v.v_adt as vol_aditivada,
    v.v_eta as vol_etanol,
    v.v_die as vol_diesel
  FROM vendas_dia v
  LEFT JOIN recebimentos_dia r ON v.data = r.data
  LEFT JOIN status_dia s ON v.data = s.data
  ORDER BY v.data;
END;
$$;
