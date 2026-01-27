# Migrations Aplicadas no Supabase - 27/01/2026

## 1. add_profit_fields_to_fechamento

**Data:** 27/01/2026 09:30  
**Status:** ✅ Aplicada com sucesso

```sql
ALTER TABLE "Fechamento" ADD COLUMN:
- lucro_bruto DECIMAL(10,2)
- custo_combustiveis DECIMAL(10,2)  
- taxas_pagamento DECIMAL(10,2)
- lucro_liquido DECIMAL(10,2)
- margem_bruta_percentual DECIMAL(5,2)
- margem_liquida_percentual DECIMAL(5,2)
```

## 2. create_function_calculate_profit

**Data:** 27/01/2026 09:40  
**Status:** ✅ Aplicada com sucesso

```sql
CREATE FUNCTION calcular_lucro_fechamento(p_fechamento_id INTEGER)
RETURNS TABLE (
    faturamento, custo_total, lucro_bruto,
    taxas, faltas, lucro_liquido,
    margem_bruta_pct, margem_liquida_pct
)
```

## 3. create_view_lucro_periodo

**Data:** 27/01/2026 10:20  
**Status:** ✅ Aplicada com sucesso

```sql
CREATE VIEW vw_lucro_periodo AS
SELECT data, posto_id, total_vendas, custo_combustiveis,
       lucro_bruto, taxas_pagamento, lucro_liquido,
       margem_bruta_percentual, margem_liquida_percentual
FROM Fechamento WHERE total_vendas > 0
```

## Dados Atualizados

Todos os 24 fechamentos de Janeiro/2026 foram atualizados com:
- Lucro líquido total: R$ 36.516,29
- Margem líquida média: 16,00%
- Validado com planilha Excel
