import { supabase } from '../supabase';
import { custoMedioCompra, type CompraDoProduto } from '@posto/utils';
import { compraService } from './compra.service';
import { despesaService } from './despesa.service';
import { estoqueService } from './estoque.service';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';
import { despesaPorLitroVendido, linhaLucroProduto } from './calculos-analise-vendas';

export interface SalesAnalysisData {
  products: {
    id: string;
    name: string;
    code: string;
    colorClass: string;
    bicos: string;
    readings: { start: number; end: number };
    volume: number;
    price: number;
    cost: number;
    total: number;
    profit: number;
    margin: number;
    suggestedPrice?: number;
    expensePerLiter?: number;
    avgCost?: number;
  }[];
  profitability: {
    name: string;
    value: number;
    percentage: number;
    margin: number;
    color: string;
  }[];
  totals: {
    volume: number;
    revenue: number;
    profit: number;
    avgMargin: number;
    avgProfitPerLiter: number;
  };
  previousPeriod?: {
    volume: number;
    revenue: number;
    profit: number;
  };
}

/**
 * Serviço de Análise de Vendas
 * 
 * @remarks
 * Gera análises detalhadas de vendas, lucratividade e margem por combustível
 */
export const salesAnalysisService = {
  /**
   * Gera análise mensal completa (vendas, lucro, margem)
   * @param year - Ano
   * @param month - Mês (1-12)
   * @param postoId - ID do posto (opcional)
   */
  async getMonthlyAnalysis(year: number, month: number, postoId?: number): Promise<ApiResponse<SalesAnalysisData>> {
    try {
      // Calculate date range for the month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

      // 1. Fetch Expenses for the month
      const despesasResponse = await despesaService.getByMonth(year, month, postoId);
      const despesas = despesasResponse.success ? despesasResponse.data : [];
      const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0);

      // Fetch all readings for the month with bico and combustivel details
      let query = supabase
        .from('Leitura')
        .select(`
        *,
        bico:Bico(
          id,
          numero,
          combustivel:Combustivel(*)
        )
      `)
        .gte('data', startDate)
        .lte('data', endDate);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data: leituras, error } = await query.order('data');

      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      // [onda 3, grupo B] Custo por litro: a COMPRA DO PRÓPRIO MÊS
      // (`custoMedioCompra`, canônica da planilha F16 = E16/D16), não mais o
      // carimbo `Estoque.custo_medio` (média ponderada com estoque anterior),
      // que deslocava o lucro do mês em até R$ 2.582 — medido no golden
      // calculos-analise-vendas. O carimbo fica só como FALLBACK de mês sem
      // compra lançada (mesma política da RPC de custo histórico).
      const [estoquesResponse, comprasResponse] = await Promise.all([
        estoqueService.getAll(postoId),
        compraService.getByDateRange(startDate, endDate, postoId),
      ]);
      const estoques = estoquesResponse.success ? estoquesResponse.data : [];
      const custoCarimboPorCombustivel: Record<number, number> = {};
      estoques.forEach(e => {
        if (e.combustivel) {
          custoCarimboPorCombustivel[e.combustivel.id] = e.custo_medio || 0;
        }
      });

      const comprasDoMes: Record<number, CompraDoProduto[]> = {};
      (comprasResponse.success ? comprasResponse.data : []).forEach(c => {
        if (!c.combustivel_id) return;
        (comprasDoMes[c.combustivel_id] ??= []).push({
          litros: Number(c.quantidade_litros) || 0,
          valorTotal: Number(c.valor_total) || 0,
        });
      });

      /** Custo do mês por combustível; carimbo (ou 0) quando o mês não tem compra. */
      const custoDoMes = (combustivelId: number): number =>
        custoMedioCompra(comprasDoMes[combustivelId] ?? []) ??
        custoCarimboPorCombustivel[combustivelId] ??
        0;

      // 2. Aggregate by combustivel & Calculate Total Sales Volume
      let totalSalesVolume = 0;

      // Define tipo para leitura com bico e combustível
      type LeituraComBico = {
        litros_vendidos?: number;
        valor_total?: number;
        leitura_inicial: number;
        leitura_final: number;
        bico?: {
          id: number;
          numero: number;
          combustivel?: {
            id: number;
            nome: string;
            codigo: string;
            preco_venda?: number;
          };
        };
      };
      const leiturasTyped = (leituras || []) as LeituraComBico[];

      // First pass to sum volume
      leiturasTyped.forEach((l) => {
        if (l.litros_vendidos) totalSalesVolume += l.litros_vendidos;
      });

      // 3. Calculate Expense Per Liter
      // Se não houver vendas, expensePerLiter seria Infinito, então tratamos como 0
      const despesaPorLitro = despesaPorLitroVendido(totalDespesas, totalSalesVolume);

      const porCombustivel: Record<string, {
        combustivel: NonNullable<LeituraComBico['bico']>['combustivel'];
        bicoIds: Set<number>;
        litros: number;
        valor: number;
        custoMedio: number;
        leituraInicial: number;
        leituraFinal: number;
      }> = {};

      leiturasTyped.forEach((l) => {
        if (!l.bico || !l.bico.combustivel) return;

        const codigo = l.bico.combustivel.codigo;
        const combId = l.bico.combustivel.id;
        const custoMedio = custoDoMes(combId);
        const litrosVendidos = l.litros_vendidos || 0;
        const valorVenda = l.valor_total || 0;

        if (!porCombustivel[codigo]) {
          porCombustivel[codigo] = {
            combustivel: l.bico.combustivel,
            bicoIds: new Set(),
            litros: 0,
            valor: 0,
            custoMedio: custoMedio,
            leituraInicial: l.leitura_inicial,
            leituraFinal: l.leitura_final,
          };
        }

        porCombustivel[codigo].bicoIds.add(l.bico.id);
        porCombustivel[codigo].litros += litrosVendidos;
        porCombustivel[codigo].valor += valorVenda;
        porCombustivel[codigo].leituraFinal = l.leitura_final; // Last reading
      });

      // Calculate totals
      let totalVolume = 0;
      let totalRevenue = 0;
      let totalProfit = 0;

      const products = Object.values(porCombustivel).map(item => {
        // "EXCEL LOGIC" legada — fórmula em ./calculos-analise-vendas, exercitada
        // pelo golden ao lado contra a canônica de @posto/utils (onda 2.2).
        const { precoPraticado, suggestedPrice, lucroTotal: totalLucroProduto, margin, cmv } =
          linhaLucroProduto({
            litros: item.litros,
            valor: item.valor,
            custoMedio: item.custoMedio,
            despesaPorLitro,
            precoVendaCadastro: item.combustivel.preco_venda || 0,
          });

        totalVolume += item.litros;
        totalRevenue += item.valor;
        totalProfit += totalLucroProduto;

        // Color classes based on fuel type
        const colorClasses: Record<string, string> = {
          'GC': 'bg-green-100 text-green-700',
          'GA': 'bg-blue-100 text-blue-700',
          'ET': 'bg-yellow-100 text-yellow-700',
          'S10': 'bg-red-100 text-red-700',
          'DIESEL': 'bg-amber-100 text-amber-700',
        };

        return {
          id: String(item.combustivel.id),
          name: item.combustivel.nome,
          code: item.combustivel.codigo,
          colorClass: colorClasses[item.combustivel.codigo] || 'bg-gray-100 text-gray-700',
          bicos: `Bicos: ${Array.from(item.bicoIds).sort((a, b) => a - b).map(n => String(n).padStart(2, '0')).join(', ')}`,
          readings: {
            start: item.leituraInicial,
            end: item.leituraFinal,
          },
          volume: item.litros,
          price: precoPraticado,
          cost: cmv, // Exibindo CMV
          total: item.valor,
          profit: totalLucroProduto,
          margin: margin,
          // Added extra fields for UI insights if needed
          suggestedPrice,
          expensePerLiter: despesaPorLitro,
          avgCost: item.custoMedio
        };
      });

      // Profitability data
      const profitColors: Record<string, string> = {
        'GC': '#22c55e',
        'GA': '#3b82f6',
        'ET': '#eab308',
        'S10': '#ef4444',
        'DIESEL': '#f59e0b',
      };

      const profitability = products.map(p => ({
        name: p.name,
        value: p.profit,
        percentage: totalProfit > 0 ? (p.profit / totalProfit) * 100 : 0,
        margin: p.margin,
        color: profitColors[p.code] || '#888888',
      })).sort((a, b) => b.value - a.value);

      // Get previous month for comparison
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
      const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
      const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${prevLastDay}`;

      const { data: prevLeituras } = await supabase
        .from('Leitura')
        .select('litros_vendidos, valor_total')
        .gte('data', prevStartDate)
        .lte('data', prevEndDate);

      type LeituraPrev = { litros_vendidos?: number; valor_total?: number };
      const prevLeiturasTyped = (prevLeituras || []) as LeituraPrev[];
      const previousPeriod = {
        volume: prevLeiturasTyped.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0),
        revenue: prevLeiturasTyped.reduce((acc, l) => acc + (l.valor_total || 0), 0),
        profit: 0, // Simplification
      };

      return createSuccessResponse({
        products,
        profitability,
        totals: {
          volume: totalVolume,
          revenue: totalRevenue,
          profit: totalProfit,
          avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
          avgProfitPerLiter: totalVolume > 0 ? totalProfit / totalVolume : 0,
        },
        previousPeriod,
      });
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};
