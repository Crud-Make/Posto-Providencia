-- =============================================================================
-- `get_dashboard_proprietario` passa a apurar o custo pela COMPRA DA ÉPOCA.
--
-- PROBLEMA (medido em 02/08/2026, com os 7 meses de 2026 carregados):
--   O lucro bruto saía de
--
--     SUM(l.litros_vendidos * (l.preco_litro - c.preco_custo))
--     JOIN "Combustivel" c ON l.combustivel_id = c.id
--
--   e `Combustivel.preco_custo` é UM valor por combustível, sem histórico: guarda
--   o custo do último mês carregado. Sobre as vendas de janeiro ele aplicava o
--   custo de julho. Erro por mês, contra o custo da época:
--
--     jan −16.983,35 | fev −13.386,16 | mar +3.626,69 | abr +14.401,34
--     mai  +6.366,91 | jun  +2.028,21 | jul      0,00
--
--   Julho dava ZERO porque o cadastro guardava exatamente os preços de julho — o
--   mês corrente sempre acerta, e foi isso que manteve o defeito invisível até a
--   tela ganhar seletor de mês. O erro TROCA DE SINAL: jan/fev exibiam lucro menor
--   que o real, mar–jun exibiam maior. Sem viés constante, não havia como
--   compensar de cabeça.
--
--   Efeito na tela: janeiro aparecia com PREJUÍZO de R$ 3.712,30 onde o resultado
--   real é LUCRO de R$ 13.272,18. Sinal invertido no número principal do painel.
--
-- QUAL CUSTO — decidido contra as fórmulas do .xlsx:
--   `compra_mensal.media_lt` .... `compra_rs / compra_lt`, aquisição PURA.  <= este
--   `compra_mensal.valor_venda` . `media_lt + despesa_do_mês ÷ litros_do_mês`.
--
--   A RPC devolve lucro BRUTO, e quem desconta a despesa é `montarResumoDoMes`,
--   no cliente. Usar `valor_venda` aqui descontaria a despesa DUAS VEZES — o mesmo
--   erro de 97,7% corrigido em 31/07. `Compra.custo_por_litro` foi carregado com
--   `media_lt`.
--
-- CASAMENTO POR MÊS-CALENDÁRIO, não por "compra mais recente até a data":
--   a planilha apura o custo do mês pelas compras DAQUELE mês, e o consolidado é
--   lançado no último dia (31/01, 28/02, ...). Um casamento por "compra anterior
--   mais próxima" faria as leituras de 01 a 30/01 procurarem o custo em dezembro,
--   que não existe. Mês-calendário é o que reproduz a planilha.
--
-- FALLBACK PRESERVA O COMPORTAMENTO ATUAL: mês sem compra lançada continua usando
--   `Combustivel.preco_custo`. Como os 7 meses de 2026 já estão carregados, hoje o
--   fallback não é acionado em nenhum deles — e julho dá resultado idêntico ao de
--   antes, porque o custo do cadastro É o de julho. A correção não mexe no único
--   mês que já estava certo.
--
-- MÚLTIPLAS COMPRAS NO MÊS: `SUM(valor) / SUM(litros)` — média ponderada, que é a
--   definição de `media_lt`. Hoje há uma linha por combustível/mês (consolidado da
--   planilha), mas lançamentos nota a nota passam a funcionar sem nova migração.
--
-- NÃO RESOLVE, e é consciente (a planilha também não resolve):
--   1. Estoque não é ponderado. O custo do mês sai só das compras do mês; o que
--      sobrou do mês anterior entra a custo novo. A planilha controla estoque só
--      em litros, nunca em reais. Em fev/2026 o Diesel tem compra de 1 LITRO por
--      R$ 5,00, e esse R$ 5,00/L vira o custo de ~1.515 L vendidos.
--   2. Perda de estoque não vira custo. Jan/2026 fechou com −3.565,94 L de
--      perca/sobra e a planilha não converte isso em reais em lugar nenhum.
--   Ambos travados no golden `packages/utils/src/custo-historico.golden.spec.ts`,
--   que reproduz a planilha COM as distorções — se um dia forem corrigidas, o
--   teste quebra e a decisão é tomada de novo, em vez de o número escorregar.
--
-- Só a expressão do custo muda. Assinatura, colunas devolvidas, taxas e despesas
-- ficam idênticas. Idempotente.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_proprietario(
  p_posto_id integer,
  p_data_inicio date,
  p_data_fim date
)
RETURNS TABLE(
  total_vendas numeric,
  lucro_bruto numeric,
  lucro_liquido numeric,
  volume_total numeric,
  custo_taxas numeric
)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH
  vendas_periodo AS (
    SELECT
      COALESCE(SUM(l.litros_vendidos), 0) AS vol_total,
      COALESCE(SUM(l.valor_total), 0) AS total_vendas,
      -- `custo_epoca.custo` é o custo de aquisição do MÊS da leitura; o
      -- `preco_custo` do cadastro só entra quando aquele mês não tem compra.
      COALESCE(SUM(
        l.litros_vendidos * (l.preco_litro - COALESCE(custo_epoca.custo, c.preco_custo))
      ), 0) AS luc_bruto
    FROM "Leitura" l
    JOIN "Combustivel" c ON l.combustivel_id = c.id
    LEFT JOIN LATERAL (
      SELECT SUM(cp.valor_total) / NULLIF(SUM(cp.quantidade_litros), 0) AS custo
      FROM "Compra" cp
      WHERE cp.combustivel_id = l.combustivel_id
        AND cp.posto_id = l.posto_id
        AND date_trunc('month', cp.data) = date_trunc('month', l.data)
    ) AS custo_epoca ON TRUE
    WHERE l.posto_id = p_posto_id
      AND l.data >= p_data_inicio
      AND l.data <= p_data_fim
  ),

  taxas_periodo AS (
    SELECT
      COALESCE(SUM(
        CASE
          WHEN fp.nome ILIKE '%DÉBITO%' THEN r.valor * 0.012
          WHEN fp.nome ILIKE '%CRÉDITO%' THEN r.valor * 0.035
          ELSE 0
        END
      ), 0) AS custo_taxas
    FROM "Fechamento" f
    LEFT JOIN "Recebimento" r ON r.fechamento_id = f.id
    LEFT JOIN "FormaPagamento" fp ON r.forma_pagamento_id = fp.id
    WHERE f.posto_id = p_posto_id
      AND f.data >= p_data_inicio
      AND f.data <= p_data_fim
  ),

  despesas_periodo AS (
    SELECT COALESCE(SUM(valor), 0) AS total_despesas
    FROM "Despesa" d
    WHERE d.posto_id = p_posto_id
      AND d.data >= p_data_inicio
      AND d.data <= p_data_fim
  )

  SELECT
    v.total_vendas::numeric,
    v.luc_bruto::numeric,
    (v.luc_bruto - COALESCE(t.custo_taxas, 0) - COALESCE(d.total_despesas, 0))::numeric AS lucro_liquido,
    v.vol_total::numeric,
    COALESCE(t.custo_taxas, 0)::numeric
  FROM vendas_periodo v
  CROSS JOIN taxas_periodo t
  CROSS JOIN despesas_periodo d;
END;
$function$;
