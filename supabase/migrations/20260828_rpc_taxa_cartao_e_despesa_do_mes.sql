-- =============================================================================
-- `get_dashboard_proprietario`: o lucro líquido para de descontar taxa de
-- cartão por transação. Taxa de cartão é DESPESA DO MÊS.
--
-- DECISÃO (dono, 26/08/2026), já documentada no canônico
-- `packages/utils/src/lucro.ts:11-12`: a taxa de cartão NÃO é uma dedução por
-- transação — é mais um item da lista de despesas mensais que alimenta o
-- rateio. É o modelo da planilha.
--
-- O PROBLEMA ATÉ AQUI (onda 4.3 do saneamento):
--   lucro_liquido = lucro_bruto − custo_taxas − total_despesas
--   com custo_taxas ESTIMADO por percentuais CHUMBADOS no SQL
--   (`DÉBITO × 1,2%`, `CRÉDITO × 3,5%` sobre `Recebimento`). Nos meses em que
--   a fatura da adquirente está lançada na tabela `Despesa`, a taxa saía do
--   lucro DUAS VEZES — uma real (despesa) e uma estimada (chumbada). Em
--   julho/2026 a estimativa chumbada era R$ 57,50.
--
--   `useDashboardProprietario.ts:46-52` já NEUTRALIZAVA esta coluna de
--   propósito (calcula lucro_real = lucro_bruto − despesas no cliente) — o
--   comentário de lá era a documentação da decisão. Esta migração faz o banco
--   dizer a mesma coisa que o cliente já dizia.
--
-- O QUE MUDA:
--   - `lucro_liquido` passa a ser `lucro_bruto − total_despesas` — a MESMA
--     fórmula do painel do proprietário, validada por
--     `packages/utils/src/lucro-real.golden.spec.ts` (julho/2026:
--     R$ 18.272,31 contra a planilha real);
--   - `custo_taxas` passa a devolver 0: a estimativa chumbada morre. A coluna
--     FICA na assinatura (compatibilidade com os tipos gerados e chamadores);
--     a taxa real, quando lançada, já está dentro de `total_despesas`.
--
-- O QUE NÃO MUDA:
--   - assinatura, SECURITY DEFINER e `SET search_path` (motivos na migração
--     `20260802_rpc_custo_historico_security_definer.sql`: `Compra` é fechada
--     ao `anon`, e sem o search_path fixo a função rodaria sequestrável);
--   - o custo por época (compra do mês-calendário, fallback `preco_custo`),
--     travado por `packages/utils/src/custo-historico.golden.spec.ts`.
--
-- QUEM CONSOME:
--   - `useDashboardProprietario` lê só total_vendas/volume_total/lucro_bruto —
--     o painel não muda de número com esta migração;
--   - `aiService.analyzeBusinessHealth` (onda 3, sítio 6) lê `lucro_bruto`;
--   - a tela `/fechamento-mensal` consome OUTRA RPC (`get_fechamento_mensal`,
--     em `migrations/legado/`), que ainda desconta os mesmos percentuais
--     chumbados POR DIA e ignora despesas — corrigi-la exige decidir o rateio
--     diário de despesa mensal: fica para decisão à parte, não nesta migração.
--
-- Idempotente. Migration versionada; aplicar via CLI/CI, nunca painel (§5).
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
    -- Taxa de cartão é despesa do mês: lançada, já está em total_despesas.
    (v.luc_bruto - COALESCE(d.total_despesas, 0))::numeric AS lucro_liquido,
    v.vol_total::numeric,
    -- A estimativa chumbada (1,2%/3,5%) morreu; a coluna fica por assinatura.
    0::numeric AS custo_taxas
  FROM vendas_periodo v
  CROSS JOIN despesas_periodo d;
END;
$function$;
