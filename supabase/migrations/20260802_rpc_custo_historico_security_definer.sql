-- =============================================================================
-- `get_dashboard_proprietario` passa a rodar como SECURITY DEFINER.
--
-- PROBLEMA (medido NO NAVEGADOR em 02/08/2026, contra localhost:3015):
--   A migração `20260802_rpc_custo_historico` passou a ler o custo de `Compra`.
--   Validada por SQL, dava certo nos 7 meses. No app, NÃO: janeiro continuava
--   exibindo lucro bruto de R$ 31.811,28 — o valor do bug que ela corrigia.
--
--   Causa: `Compra` tem uma única policy — `auth.role() = 'authenticated'` — e o
--   painel fala com o banco como `anon` (o login do web foi removido em 29/07).
--   A função era SECURITY INVOKER (o padrão), logo executava com as permissões do
--   chamador: o `LATERAL` sobre `Compra` voltava VAZIO para o `anon`, o
--   `COALESCE(custo_epoca.custo, c.preco_custo)` caía no fallback, e o número
--   exibido era exatamente o de antes da correção.
--
-- A LIÇÃO, que vale mais que o patch:
--   O fallback existe para o caso legítimo "mês sem compra lançada". Sob RLS ele
--   passou a significar TAMBÉM "sem permissão de ler", e as duas situações ficaram
--   indistinguíveis — falha SILENCIOSA num número de dinheiro.
--   Validar por `service_role` (MCP/SQL) NÃO pega isso: aquele papel enxerga tudo.
--   Só o teste pelo app, como `anon`, revelou. Toda RPC que passa a ler uma tabela
--   nova precisa ser conferida pela tela, não só pelo SQL.
--
-- POR QUE SECURITY DEFINER E NÃO ABRIR A `Compra` PARA O `anon`:
--   A função devolve 5 AGREGADOS de um posto e um intervalo — nunca linhas de
--   `Compra`. Criar policy de SELECT para `anon` exporia a tabela inteira
--   (fornecedor, nota fiscal, custo de cada carga) e ampliaria a exposição já
--   registrada como P0 em 31/07. SECURITY DEFINER mantém `Compra` fechada e
--   entrega só o agregado.
--
--   `SET search_path = public, pg_temp` é obrigatório: sem isso um schema
--   malicioso no search_path do chamador poderia sequestrar a resolução dos nomes
--   de tabela dentro de uma função que roda com privilégio do dono.
--
-- NÃO AMPLIA O QUE JÁ ERA VISÍVEL: `Leitura`, `Combustivel` e `Despesa` já eram
--   legíveis pelo `anon` — é de onde vinham receita, volume e despesa, que sempre
--   apareceram corretos na tela. Muda só o custo por época ficar alcançável.
--
-- CONFERIDO NO NAVEGADOR depois de aplicar (Chrome DevTools, como `anon`):
--   Janeiro/2026 .. bruto R$ 48.795,76 · real R$ 13.272,18 · margem 4,58%
--   Julho/2026 .... bruto R$ 37.669,98 — IDÊNTICO ao de antes, como o golden previa.
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
SECURITY DEFINER
SET search_path = public, pg_temp
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
