-- Corrigir cálculo de lucro para usar preco_custo da tabela Combustivel
-- ao invés de margens fixas hardcoded

CREATE OR REPLACE FUNCTION get_fechamento_mensal(
  p_posto_id INT,
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
  vol_gasolina NUMERIC,
  vol_aditivada NUMERIC,
  vol_etanol NUMERIC,
  vol_diesel NUMERIC,
  status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := make_date(p_ano, p_mes, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  RETURN QUERY
  WITH 
  -- 1. Agregação de Vendas Detalhadas por Dia
  vendas_dia AS (
    SELECT 
      l.data,
      COALESCE(SUM(l.litros_vendidos), 0) as vol_total,
      COALESCE(SUM(l.valor_total), 0) as fat_bruto,
      -- ✅ CORRIGIDO: Usar preco_custo da tabela ao invés de margens fixas
      COALESCE(SUM(l.litros_vendidos * (l.preco_litro - c.preco_custo)), 0) as luc_bruto,
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
  
  -- 2. Agregação de Taxas por Dia
  taxas_dia AS (
    SELECT 
      f.data,
      COALESCE(SUM(
        CASE 
          WHEN fp.nome ILIKE '%DÉBITO%' THEN r.valor * 0.012
          WHEN fp.nome ILIKE '%CRÉDITO%' THEN r.valor * 0.035
          ELSE 0
        END
      ), 0) as custo_taxas
    FROM "Fechamento" f
    LEFT JOIN "Recebimento" r ON r.fechamento_id = f.id
    LEFT JOIN "FormaPagamento" fp ON r.forma_pagamento_id = fp.id
    WHERE f.posto_id = p_posto_id
      AND f.data >= v_start_date
      AND f.data <= v_end_date
    GROUP BY f.data
  ),

  -- 3. Status do Fechamento
  status_dia AS (
    SELECT 
      f.data,
      COALESCE(f.status, 'ABERTO') as status
    FROM "Fechamento" f
    WHERE f.posto_id = p_posto_id
      AND f.data >= v_start_date
      AND f.data <= v_end_date
  )

  -- 4. Consolidação Final
  SELECT 
    v.data::DATE as dia,
    v.vol_total as volume_total,
    v.fat_bruto as faturamento_bruto,
    v.luc_bruto as lucro_bruto,
    COALESCE(t.custo_taxas, 0) as custo_taxas,
    (v.luc_bruto - COALESCE(t.custo_taxas, 0)) as lucro_liquido,
    v.v_gas as vol_gasolina,
    v.v_adt as vol_aditivada,
    v.v_eta as vol_etanol,
    v.v_die as vol_diesel,
    COALESCE(s.status, 'ABERTO') as status
  FROM vendas_dia v
  LEFT JOIN taxas_dia t ON v.data = t.data
  LEFT JOIN status_dia s ON v.data = s.data
  ORDER BY v.data;
END;
$$;
