-- Migration: Create get_fechamento_mensal function
-- Description: Calculates daily consolidated financial and operational metrics for a given month/year.

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
  status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE := make_date(p_ano, p_mes, 1);
  v_end_date DATE := (v_start_date + interval '1 month' - interval '1 day')::date;
BEGIN
  RETURN QUERY
  WITH 
  -- 1. Agregação de Vendas (Volume e Faturamento) por Dia
  vendas_dia AS (
    SELECT 
      l.data,
      COALESCE(SUM(l.litros_vendidos), 0) as vol_total,
      COALESCE(SUM(l.valor_total), 0) as fat_bruto,
      -- Cálculo de Lucro Bruto baseado nas margens do documento (Hardcoded safety or from DB)
      -- Margens: Gasolina ~11.79%, Aditivada ~11.53%, Etanol ~9.02%, Diesel ~2.73%
      COALESCE(SUM(
        l.valor_total * 
        CASE 
          WHEN c.nome ILIKE '%GASOLINA ADITIVADA%' THEN 0.1153
          WHEN c.nome ILIKE '%GASOLINA%' THEN 0.1179
          WHEN c.nome ILIKE '%ETANOL%' THEN 0.0902
          WHEN c.nome ILIKE '%DIESEL%' THEN 0.0273
          ELSE 0.10 -- Default 10%
        END
      ), 0) as luc_bruto
    FROM "Leitura" l
    JOIN "Combustivel" c ON l.combustivel_id = c.id
    WHERE l.posto_id = p_posto_id
      AND l.data >= v_start_date 
      AND l.data <= v_end_date
    GROUP BY l.data
  ),
  
  -- 2. Agregação de Recebimentos (Taxas de Cartão) por Dia
  recebimentos_dia AS (
    SELECT 
      f.data,
      -- Taxas: Débito 1.2%, Crédito 3.5%
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

  -- 3. Status do Fechamento (Agrupado por dia, se todos os turnos fecharam OK)
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

  -- 4. Consolidação Final
  SELECT 
    v.data as dia,
    v.vol_total as volume_total,
    v.fat_bruto as faturamento_bruto,
    v.luc_bruto as lucro_bruto,
    COALESCE(r.taxas_total, 0) as custo_taxas,
    (v.luc_bruto - COALESCE(r.taxas_total, 0)) as lucro_liquido,
    COALESCE(s.status_agg, 'PENDENTE') as status
  FROM vendas_dia v
  LEFT JOIN recebimentos_dia r ON v.data = r.data
  LEFT JOIN status_dia s ON v.data = s.data
  ORDER BY v.data;
END;
$$;
