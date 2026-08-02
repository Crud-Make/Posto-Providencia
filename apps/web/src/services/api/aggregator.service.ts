import { conferido, meiosFromFechamentoRow, despesaOperacionalPorLitro, lucroCombustivel } from '@posto/utils';
import { supabase } from '../supabase';
import { combustivelService } from './combustivel.service';
import { bicoService } from './bico.service';
import { formaPagamentoService } from './formaPagamento.service';
import { estoqueService } from './estoque.service';
import { frentistaService } from './frentista.service';
import { leituraService } from './leitura.service';
import { fechamentoFrentistaService } from './fechamentoFrentista.service';
import { compraService } from './compra.service';
import { despesaService } from './despesa.service';
import { configuracaoService } from './configuracao.service';
import type { Combustivel, FechamentoFrentista, Leitura, Fechamento } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';
import type { FuelData, PaymentMethod, AttendantClosing, AttendantPerformance, FuelSummary, NozzleData, InventoryAlert, InventoryTransaction } from '../../types/ui/dashboard';
import type { ClosingAttendant } from '../../types/ui/closing';
import type { AttendantProfile, AttendantHistoryEntry } from '../../types/ui/attendants';
import { hojeIso, paraIsoLocal } from '@posto/utils';

/**
 * Helper para extrair dados de ApiResponse com tratamento de erro
 */
function extractData<T>(response: ApiResponse<T>): T {
  if (response.success === true) {
    return response.data;
  }
  // Após o check acima, o TS sabe que é um ErrorResponse
  throw new Error(response.error || 'Erro ao buscar dados do serviço');
}

/**
 * Despesa operacional real por litro do mês de referência (planilha Posto Jorro:
 * despesas_totais_do_mês ÷ litros_vendidos_do_mês). A taxa de cartão entra aqui
 * como mais um item da lista de despesas — não como dedução por transação.
 * Fallback para a configuração `despesa_operacional_litro` quando não há despesas.
 */
async function despesaOperacionalMensal(refDate: Date, postoId?: number): Promise<number> {
  const year = refDate.getFullYear();
  const month = refDate.getMonth() + 1;
  const inicioMesStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const fimMesStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  let queryLeitura = supabase.from('Leitura').select('litros_vendidos').gte('data', inicioMesStr).lte('data', fimMesStr);
  if (postoId) queryLeitura = queryLeitura.eq('posto_id', postoId);

  // A configuração de fallback é buscada na mesma onda (e só consumida se a taxa
  // calculada der 0) — condicionar o fetch ao resultado criava um round-trip
  // sequencial extra na cauda do carregamento do dashboard.
  const [despesasRes, leiturasRes, configFallbackRes] = await Promise.all([
    despesaService.getByMonth(year, month, postoId),
    queryLeitura,
    configuracaoService.getValorNumerico('despesa_operacional_litro', 0.45),
  ]);

  const totalDespesas = extractData(despesasRes).reduce((acc: number, d: { valor: number }) => acc + Number(d.valor), 0);
  const totalLitros = (leiturasRes.data || []).reduce((acc: number, l: { litros_vendidos: number | null }) => acc + (l.litros_vendidos || 0), 0);

  let rate = despesaOperacionalPorLitro(totalDespesas, totalLitros);
  if (rate === 0) {
    rate = extractData(configFallbackRes);
  }
  return rate;
}

interface FechamentoFrentistaWithRelations extends FechamentoFrentista {
  fechamento?: Fechamento & {
    turno?: {
      nome: string;
    };
  };
}

interface LeituraWithRelations extends Leitura {
  bico?: {
    combustivel_id: number;
  };
  combustivel?: {
    Combustivel?: {
      nome: string;
    };
  };
}

interface CaixaAberto {
  frentista_id: number;
  fechamento: {
    status: string;
    data: string;
  };
}

/**
 * Service Aggregator (Padrão Facade)
 * 
 * @remarks
 * Camada de agregação que combina dados de múltiplos services especializados
 * para fornecer interfaces simplificadas para a UI.
 * 
 * ## Propósito
 * Este é um padrão arquitetural PERMANENTE que:
 * - Reduz acoplamento entre UI e services de domínio
 * - Centraliza lógica de transformação e cálculo de dados
 * - Simplifica consumo de dados complexos nos componentes
 * - Melhora testabilidade e manutenibilidade
 * 
 * ## Padrão de Design
 * Implementa o padrão **Facade** (Gang of Four) adaptado para services.
 * 
 * @pattern Facade Pattern
 * @see https://refactoring.guru/design-patterns/facade
 * @see Clean Architecture - Robert C. Martin
 * 
 * ## Arquitetura em Camadas
 * ```
 * UI Layer (Componentes)
 *     ↓
 * Aggregator Layer (Este arquivo) ← Você está aqui
 *     ↓
 * Domain Services Layer (combustivelService, frentistaService, etc)
 *     ↓
 * Data Layer (Supabase)
 * ```
 * 
 * @example
 * ```typescript
 * // Componente usa aggregator em vez de múltiplos services
 * const data = await aggregatorService.fetchDashboardData('2026-07-01', '2026-07-29', null, postoId);
 * ```
 */
interface VendaCombustivel {
  combustivel: Combustivel;
  litros: number;
  valor: number;
}

/** Retorno de {@link aggregatorService.fetchSettingsData}. */
interface SettingsData {
  products: {
    id: string;
    name: string;
    type: 'Combustível' | 'Biocombustível' | 'Diesel';
    price: number;
  }[];
  nozzles: { id: string; number: string; productName: string; tankSource: string }[];
  shifts: unknown[]; // Turnos removidos do sistema
  paymentMethods: {
    id: string;
    name: string;
    type: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outros';
    tax: number;
    active: boolean;
  }[];
}

/** Retorno de {@link aggregatorService.fetchDashboardData}. */
interface DashboardAggregatedData {
  fuelData: FuelData[];
  paymentData: PaymentMethod[];
  closingsData: AttendantClosing[];
  performanceData: AttendantPerformance[];
  kpis: {
    totalSales: number;
    avgTicket: number;
    totalDivergence: number;
    totalVolume: number;
    totalProfit: number;
  };
}

/** Retorno de {@link aggregatorService.fetchClosingData}. */
interface ClosingData {
  summaryData: FuelSummary[];
  nozzleData: NozzleData[];
  attendantsData: ClosingAttendant[];
}

/** Retorno de {@link aggregatorService.fetchAttendantsData}. */
interface AttendantsData {
  list: AttendantProfile[];
  history: AttendantHistoryEntry[];
}

/**
 * Retorno de {@link aggregatorService.fetchInventoryData}.
 *
 * @remarks
 * `items` usa forma própria (não `InventoryItem` de `types/ui/dashboard.ts`): os nomes de campo
 * de compras/vendas divergem (`totalPurchases`/`totalSales`/`lossOrGain` vs `purchases`/`sales`) —
 * divergência pré-existente entre o service e aquele tipo de UI, fora do escopo desta limpeza.
 */
interface InventoryData {
  items: {
    id: string;
    code: string;
    name: string;
    volume: number;
    capacity: number;
    percentage: number;
    status: 'OK' | 'BAIXO' | 'CRÍTICO';
    daysRemaining: number;
    color: string;
    iconType: 'pump' | 'leaf' | 'truck';
    costPrice: number;
    sellPrice: number;
    previousStock: number;
    totalPurchases: number;
    totalSales: number;
    lossOrGain: number;
  }[];
  alerts: InventoryAlert[];
  transactions: InventoryTransaction[];
  chartData: { day: string; sales: number; entry: number; salesPerc: number; entryPerc: number }[];
  summary: { totalCost: number; totalSell: number; projectedProfit: number };
}

/** Item de retorno de {@link aggregatorService.fetchProfitabilityData}. */
interface ProfitabilityItem {
  id: number;
  combustivelId: number;
  nome: string;
  codigo: string;
  custoMedio: number;
  despOperacional: number;
  custoTotalL: number;
  precoVenda: number;
  volumeVendido: number;
  receitaBruta: number;
  lucroTotal: number;
  margemLiquidaL: number;
  margemBrutaL: number;
  cor: string;
}

export const aggregatorService = {
  /**
   * Busca dados para a tela de configurações.
   * Agrega combustíveis, bicos e formas de pagamento em um formato consumível pela UI.
   *
   * @param postoId - ID do posto (opcional)
   * @returns Objeto com listas formatadas de produtos, bicos, turnos e formas de pagamento
   */
  async fetchSettingsData(postoId?: number): Promise<ApiResponse<SettingsData>> {
    try {
      const [combustiveisRes, bicosRes, formasPagamentoRes] = await Promise.all([
        combustivelService.getAll(postoId),
        bicoService.getWithDetails(postoId),
        formaPagamentoService.getAll(postoId),
      ]);

      const combustiveis = extractData(combustiveisRes);
      const bicos = extractData(bicosRes);
      const formasPagamento = extractData(formasPagamentoRes);

      return createSuccessResponse({
        products: combustiveis.map(c => ({
          id: String(c.id),
          name: c.nome,
          type: (c.codigo === 'ET' ? 'Biocombustível' : c.codigo === 'S10' ? 'Diesel' : 'Combustível') as 'Combustível' | 'Biocombustível' | 'Diesel',
          price: c.preco_venda,
        })),
        nozzles: bicos.map(b => ({
          id: String(b.id),
          number: String(b.numero),
          productName: b.combustivel?.nome || 'N/A',
          tankSource: b.bomba?.nome || 'N/A',
        })),
        shifts: [], // Turnos removidos do sistema
        paymentMethods: formasPagamento.map(fp => ({
          id: String(fp.id),
          name: fp.nome,
          type: fp.tipo as 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outros',
          tax: fp.taxa || 0,
          active: fp.ativo
        })),
      });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Erro ao carregar configurações');
    }
  },

  /**
   * Busca dados para o dashboard principal.
   * Agrega vendas, estoque, frentistas e formas de pagamento.
   * O intervalo chega pronto da tela (calendário), em ISO local `aaaa-mm-dd`.
   *
   * @param dataInicio - Primeiro dia do período, ISO local `aaaa-mm-dd`
   * @param dataFim - Último dia do período, ISO local `aaaa-mm-dd`
   * @param frentistaId - Filtro por frentista (opcional)
   * @param postoId - ID do posto (opcional)
   * @returns Objeto com métricas consolidadas
   */
  async fetchDashboardData(
    dataInicio: string,
    dataFim: string,
    frentistaId: number | null = null,
    postoId?: number
  ): Promise<ApiResponse<DashboardAggregatedData>> {
    try {
      // Mês de referência do rateio de despesa operacional. Continua sendo o mês corrente,
      // não o do período filtrado — comportamento preservado da versão anterior de propósito:
      // mudá-lo altera o custo por litro (dinheiro) e exige golden master. Ver Issue #27.
      const hoje = new Date();

      // Onda única de queries: nenhuma depende do resultado de outra
      const [estoqueRes, frentistasRes, formasPagamentoRes, leiturasDataRes, fechamentosFrentistaHojeRes, despesaOpLitro] = await Promise.all([
        estoqueService.getAll(postoId),
        frentistaService.getAll(postoId),
        formaPagamentoService.getAll(postoId),
        leituraService.getByDateRange(dataInicio, dataFim, postoId),
        fechamentoFrentistaService.getByDate(dataInicio, postoId),
        despesaOperacionalMensal(hoje, postoId),
      ]);

      const estoque = extractData(estoqueRes);
      const frentistas = extractData(frentistasRes);
      const formasPagamento = extractData(formasPagamentoRes);
      const leiturasData = extractData(leiturasDataRes);
      const fechamentosFrentistaHoje = extractData(fechamentosFrentistaHojeRes);

      // Agrega as leituras para o formato SalesSummary esperado pelo dashboard antigo (compatibilidade)
      const totalLitrosVendas = leiturasData.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
      const totalValorVendas = leiturasData.reduce((acc, l) => acc + (l.valor_total || 0), 0);

      const porCombustivelVendas = leiturasData.reduce((acc, l) => {
        const codigo = l.bico.combustivel.codigo;
        if (!acc[codigo]) {
          acc[codigo] = {
            combustivel: l.bico.combustivel,
            litros: 0,
            valor: 0,
          };
        }
        acc[codigo].litros += l.litros_vendidos || 0;
        acc[codigo].valor += l.valor_total || 0;
        return acc;
      }, {} as Record<string, VendaCombustivel>);

      const vendas = {
        data: dataInicio,
        totalLitros: totalLitrosVendas,
        totalVendas: totalValorVendas,
        porCombustivel: Object.values(porCombustivelVendas) as VendaCombustivel[],
        leituras: leiturasData
      };

      // Cores padrão para combustíveis
      const coresCombs: Record<string, string> = {
        'GC': '#22c55e',
        'GA': '#3b82f6',
        'ET': '#eab308',
        'S10': '#ef4444',
      };

      // Cores padrão para formas de pagamento
      const coresFormas: Record<string, string> = {
        'cartao': '#3b82f6',
        'digital': '#22c55e',
        'fisico': '#eab308',
      };

      // FuelData para o gráfico "Volume Vendido": litros VENDIDOS no período, vindos
      // das leituras. Antes vinha de `estoque.quantidade_atual` — o que sobrou no
      // tanque, número de outra grandeza e ordem de magnitude, com o gráfico rotulado
      // "Total de litros por combustível". Coberto por aggregator.dashboard.test.ts.
      const fuelData = Object.values(porCombustivelVendas).map(v => ({
        name: v.combustivel?.nome || 'N/A',
        volume: v.litros,
        maxCapacity: estoque.find(e => e.combustivel_id === v.combustivel?.id)?.capacidade_tanque ?? 0,
        color: v.combustivel?.cor || coresCombs[v.combustivel?.codigo || ''] || '#888',
      }));

      // PaymentData real (agregado dos fechamentos ou pagamentos do dia)
      // Como simplificação, se não houver registros de recebimento, retornamos vazio/zeros em vez de simulação
      const paymentData = formasPagamento.map((fp, idx) => ({
        name: fp.nome,
        percentage: 0,
        value: 0,
        color: coresFormas[fp.tipo] || ['#3b82f6', '#22c55e', '#eab308', '#f97316'][idx % 4],
      }));

      // ClosingsData - Lista consolidada de status dos frentistas
      // Mapeia os fechamentos por frentista (sem filtro de turno - sistema simplificado)
      const fechamentosMap = new Map<number, FechamentoFrentista>();
      fechamentosFrentistaHoje.forEach((ff) => {
        fechamentosMap.set(ff.frentista_id, ff);
      });

      // Filtra frentistas se houver filtro específico
      const frentistasToShow = frentistaId
        ? frentistas.filter((f) => f.id === frentistaId)
        : frentistas;

      const closingsData = frentistasToShow.map((f) => {
        const fechamento = fechamentosMap.get(f.id);
        let status: 'OK' | 'Divergente' | 'Aberto' = 'Aberto';
        let totalSales = 0;

        if (fechamento) {
          // Total conferido canônico (7 buckets, cartão aditivo, moedas + baratão)
          totalSales = conferido(meiosFromFechamentoRow(fechamento));

          // Status baseado na diferença (falta de caixa)
          const diferenca = Math.abs(fechamento.diferenca_calculada || 0);
          status = diferenca === 0 ? 'OK' : diferenca > 50 ? 'Divergente' : 'OK';
        }

        return {
          id: String(f.id),
          name: f.nome,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(f.nome)}&background=random&size=128`,
          shift: 'Dia', // Sistema simplificado sem turnos
          totalSales: totalSales,
          status: status,
          sessionStatus: (fechamento?.observacoes?.includes('[CONFERIDO]') ? 'conferido' : 'pendente') as 'conferido' | 'pendente',
        };
      });

      // Lucro estimado — despesa operacional REAL do mês (despesas/litros), não mais 0,45 fixo
      let totalLucroEstimado = 0;
      if (vendas.porCombustivel) {
        totalLucroEstimado = vendas.porCombustivel.reduce((acc, item) => {
          const est = estoque.find(e => e.combustivel_id === item.combustivel.id);
          const custoMedio = est?.custo_medio || 0;
          const lucroItem = lucroCombustivel({
            litros: item.litros,
            precoVenda: item.litros > 0 ? item.valor / item.litros : 0,
            custoMedio,
            despesaOperacionalLitro: despesaOpLitro,
          });
          return acc + lucroItem;
        }, 0);
      }

      // PerformanceData - Calculado com base no lucro estimado proporcional às vendas
      const totalVendasPeriodo = vendas.totalVendas || 0;
      const margemMedia = totalVendasPeriodo > 0 ? totalLucroEstimado / totalVendasPeriodo : 0;

      const performanceData = closingsData
        .map((c) => {
          const profit = c.totalSales * margemMedia;
          return {
            id: c.id,
            name: c.name,
            avatar: c.avatar,
            metric: 'Lucro Est.',
            value: `R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            subValue: `Vendas: R$ ${c.totalSales.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
            type: (c.totalSales > 0 ? 'ticket' : 'volume') as 'ticket' | 'volume' | 'divergence',
            rawProfit: profit,
            rawSales: c.totalSales,
            sessionStatus: c.sessionStatus,
            status: c.sessionStatus // Ensure status is passed for the UI checkmark
          };
        })
        .sort((a, b) => {
          const profitDiff = b.rawProfit - a.rawProfit;
          if (Math.abs(profitDiff) > 0.01) return profitDiff;
          return b.rawSales - a.rawSales;
        })
        .slice(0, 5)
        .map(item => ({
          id: item.id,
          name: item.name,
          avatar: item.avatar,
          metric: item.metric,
          value: item.value,
          subValue: item.subValue,
          type: item.type,
          status: item.sessionStatus
        }));

      return createSuccessResponse({
        fuelData,
        paymentData,
        closingsData,
        performanceData,
        kpis: {
          totalSales: vendas.totalVendas || 0,
          avgTicket: vendas.totalLitros > 0 ? vendas.totalVendas / vendas.totalLitros * 30 : 0,
          totalDivergence: 0,
          totalVolume: vendas.totalLitros || 0,
          totalProfit: totalLucroEstimado,
        },
      });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Erro ao carregar dashboard');
    }
  },

  /**
   * Busca dados para a tela de fechamento.
   * Agrega frentistas, combustíveis, bicos e vendas do dia.
   *
   * @param postoId - ID do posto (opcional)
   * @returns Dados consolidados para a tela de fechamento (resumo, bicos, frentistas)
   */
  async fetchClosingData(postoId?: number): Promise<ApiResponse<ClosingData>> {
    try {
      const [frentistasRes, combustiveisRes, bicosRes] = await Promise.all([
        frentistaService.getAll(postoId),
        combustivelService.getAll(postoId),
        bicoService.getWithDetails(postoId),
      ]);

      const frentistas = extractData(frentistasRes);
      const combustiveis = extractData(combustiveisRes);
      const bicos = extractData(bicosRes);

      const hoje = hojeIso();
      const vendasRes = await leituraService.getSalesSummaryByDate(hoje, postoId);
      const vendas = extractData(vendasRes);

      // Mapeamento de cores
      const colorClasses: Record<string, string> = {
        'GC': 'bg-green-100 text-green-700',
        'GA': 'bg-blue-100 text-blue-700',
        'ET': 'bg-yellow-100 text-yellow-700',
        'S10': 'bg-red-100 text-red-700',
      };

      const iconTypes: Record<string, 'pump' | 'leaf' | 'truck'> = {
        'GC': 'pump',
        'GA': 'pump',
        'ET': 'leaf',
        'S10': 'truck',
      };

      // summaryData - FuelSummary[]
      const summaryData = vendas.porCombustivel.map(pc => ({
        id: String(pc.combustivel.id),
        name: pc.combustivel.nome,
        code: pc.combustivel.codigo,
        iconType: iconTypes[pc.combustivel.codigo] || 'pump',
        totalValue: pc.valor,
        volume: pc.litros,
        avgPrice: pc.litros > 0 ? pc.valor / pc.litros : pc.combustivel.preco_venda || 0,
        color: pc.combustivel.cor || '#888',
        colorClass: colorClasses[pc.combustivel.codigo] || 'bg-gray-100 text-gray-700',
      }));

      // Se não houver leituras, criar dados zerados
      if (summaryData.length === 0) {
        combustiveis.forEach(c => {
          summaryData.push({
            id: String(c.id),
            name: c.nome,
            code: c.codigo,
            iconType: iconTypes[c.codigo] || 'pump',
            totalValue: 0,
            volume: 0,
            avgPrice: c.preco_venda || 0,
            color: c.cor || '#888',
            colorClass: colorClasses[c.codigo] || 'bg-gray-100 text-gray-700',
          });
        });
      }

      // nozzleData - NozzleData[]
      const nozzleData = bicos.map(b => {
        const leitura = vendas.leituras?.find(l => l.bico_id === b.id);
        const volume = leitura?.litros_vendidos || 0;
        const total = leitura?.valor_total || 0;
        const hasNoSales = !leitura || volume === 0;

        return {
          id: String(b.id),
          bico: b.numero,
          productCode: b.combustivel?.codigo || 'N/A',
          productName: b.combustivel?.nome || 'N/A',
          initialReading: leitura?.leitura_inicial || 0,
          finalReading: leitura?.leitura_final || 0,
          price: leitura?.preco_litro || b.combustivel?.preco_venda || 0,
          volume: volume,
          total: total,
          status: (hasNoSales ? 'NoSales' : 'OK') as 'OK' | 'Alert' | 'NoSales',
        };
      });

      // attendantsData - ClosingAttendant[]
      const totalVendasDia = summaryData.reduce((acc, s) => acc + s.totalValue, 0);
      const valorPorFrentista = frentistas.length > 0 ? totalVendasDia / frentistas.length : 0;

      const attendantsData = frentistas.map((f, idx) => ({
        id: String(f.id),
        name: f.nome,
        avatar: `/avatars/${f.id}.jpg`,
        shift: (['Manhã', 'Tarde', 'Noite'])[idx % 3],
        expectedValue: valorPorFrentista,
        declared: {
          card: 0,
          note: 0,
          pix: 0,
          cash: 0,
        },
        observation: '',
        hasHistory: false,
      }));

      return createSuccessResponse({ summaryData, nozzleData, attendantsData });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Erro ao carregar dados de fechamento');
    }
  },

  async fetchAttendantsData(postoId?: number): Promise<ApiResponse<AttendantsData>> {
    try {
      // Query frentistas directly from the table (including inactive for management screen)
      let query = supabase
        .from('Frentista')
        .select('*')
        .order('nome');

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data: frentistasData, error: frentistasError } = await query;

      if (frentistasError) return createErrorResponse(frentistasError.message);

      const frentistas = (frentistasData || []).map((f) => ({ ...f, email: null }));

      // Buscar histórico de fechamentos por frentista
      const fechamentosRes = await Promise.all(
        frentistas.map(f => fechamentoFrentistaService.getHistoricoDiferencas(f.id, 30))
      );
      const fechamentos = fechamentosRes.map(extractData);

      // Cores para avatares
      const avatarColors = [
        'bg-blue-100 text-blue-700',
        'bg-green-100 text-green-700',
        'bg-purple-100 text-purple-700',
        'bg-orange-100 text-orange-700',
        'bg-red-100 text-red-700',
      ];

      // Buscar caixas abertos hoje
      const hojeStr = hojeIso();
      const { data: caixasAbertos } = await supabase
        .from('FechamentoFrentista')
        .select('frentista_id, fechamento:Fechamento!inner(status, data)')
        .eq('fechamento.status', 'ABERTO')
        .gte('fechamento.data', `${hojeStr}T00:00:00`)
        .lte('fechamento.data', `${hojeStr}T23:59:59`);

      const mapCaixaAberto = new Set<number>();
      if (caixasAbertos) {
        (caixasAbertos as CaixaAberto[]).forEach((c) => {
          mapCaixaAberto.add(c.frentista_id);
        });
      }

      // Lista de frentistas no formato AttendantProfile
      //
      // `divergenceRate` e o histórico abaixo usam `diferenca_calculada` (encerrante − conferido,
      // positivo = FALTA), a mesma fonte de `fetchClosingData`. Antes somavam os meios de pagamento
      // à mão esquecendo moedas e baratão, e comparavam com `valor_conferido` — toda sessão com
      // moedas aparecia como "Divergente" sem divergência real.
      const list = frentistas.map((f, idx) => {
        const hist = fechamentos[idx] || [];
        const divergenceRate = hist.length > 0 ? Math.round((hist.filter(h => {
          return (h.diferenca_calculada || 0) !== 0;
        }).length / hist.length) * 100) : 0;

        // Pega iniciais do nome
        // Identifica o status do caixa (Sistema simplificado sem turnos múltiplos)
        const isAberto = mapCaixaAberto.has(f.id);
        const displayShift = isAberto ? 'Aberto' : 'Dia';

        // Pega iniciais do nome
        const nameParts = f.nome.trim().split(/\s+/);
        const initials = nameParts.length >= 2 && nameParts[0] && nameParts[nameParts.length - 1]
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
          : f.nome.trim().substring(0, 2);

        // Data de admissão formatada
        const admDate = f.data_admissao ? new Date(f.data_admissao) : new Date();
        const sinceDate = admDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

        return {
          id: String(f.id),
          name: f.nome,
          initials: initials.toUpperCase(),
          phone: f.telefone || '(00) 00000-0000',
          shift: displayShift,
          status: (f.ativo ? 'Ativo' : 'Inativo') as 'Ativo' | 'Inativo',
          admissionDate: f.data_admissao || 'N/A',
          sinceDate: sinceDate,
          divergenceRate: divergenceRate,
          riskLevel: (divergenceRate <= 10 ? 'Baixo Risco' : divergenceRate <= 30 ? 'Médio Risco' : 'Alto Risco') as 'Baixo Risco' | 'Médio Risco' | 'Alto Risco',
          avatarColorClass: avatarColors[idx % avatarColors.length],
          email: f.email || 'Não cadastrado',
          posto_id: f.posto_id,
        };
      });

      // Histórico geral formatado usando turno real se disponível
      const allHistories = fechamentos.flat();
      const history = allHistories.slice(0, 10).map((h) => {
        const diferencaCaixa = h.diferenca_calculada || 0;

        return {
          id: String(h.id),
          // getHistoricoDiferencas só seleciona `fechamento:Fechamento(data)` (sem turno) — o cast abaixo
          // reflete uma leitura pré-existente de `.turno` que a query não traz; mantido como estava.
          date: (h as unknown as FechamentoFrentistaWithRelations).fechamento?.data || 'N/A',
          shift: (h as unknown as FechamentoFrentistaWithRelations).fechamento?.turno?.nome || 'N/A',
          value: diferencaCaixa,
          status: (diferencaCaixa === 0 ? 'OK' : 'Divergente') as 'OK' | 'Divergente',
        };
      });

      return createSuccessResponse({ list, history });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Erro ao carregar dados dos frentistas');
    }
  },

  async fetchInventoryData(postoId?: number): Promise<ApiResponse<InventoryData>> {
    try {
      const dataInicioAnalise = new Date();
      dataInicioAnalise.setDate(dataInicioAnalise.getDate() - 7);

      // Build leituras query with proper posto_id filter
      let leiturasQuery = supabase
        .from('Leitura')
        .select('*, bico:Bico(combustivel_id), combustivel:Bico(Combustivel(nome))')
        .gte('data', paraIsoLocal(dataInicioAnalise))
        .order('data', { ascending: false })
        .limit(100);

      if (postoId) {
        leiturasQuery = leiturasQuery.eq('posto_id', postoId);
      }

      const [estoqueRes, comprasRes, leiturasRecentes] = await Promise.all([
        estoqueService.getAll(postoId),
        compraService.getAll(postoId, paraIsoLocal(dataInicioAnalise)),
        leiturasQuery
      ]);

      if (leiturasRecentes.error) return createErrorResponse(leiturasRecentes.error.message);

      const leituras = (leiturasRecentes.data || []) as LeituraWithRelations[];

      const estoque = extractData(estoqueRes);
      const compras = extractData(comprasRes);

      // Map código para icon e color
      const iconMap: Record<string, 'pump' | 'leaf' | 'truck'> = {
        'GC': 'pump',
        'GA': 'pump',
        'ET': 'leaf',
        'S10': 'truck',
      };

      const colorMap: Record<string, string> = {
        'GC': 'green',
        'GA': 'blue',
        'ET': 'yellow',
        'S10': 'gray',
      };

      // Prepara dados para o gráfico de 7 dias
      const last7Days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = paraIsoLocal(d);
        const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' });

        const salesDay = leituras.filter(l => l.data === dayStr).reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
        const entryDay = compras.filter(c => c.data === dayStr).reduce((acc, c) => acc + c.quantidade_litros, 0);

        return { day: dayLabel, sales: salesDay, entry: entryDay };
      }).reverse();

      // Escala para porcentagem do gráfico (opcional ou usa valores reais e o front escala)
      const maxVal = Math.max(...last7Days.map(d => Math.max(d.sales, d.entry)), 100);
      const chartData = last7Days.map(d => ({
        ...d,
        salesPerc: (d.sales / maxVal) * 100,
        entryPerc: (d.entry / maxVal) * 100
      }));

      // Items - InventoryItem[]
      const items = estoque.map(e => {
        const percentage = Math.round((e.quantidade_atual / e.capacidade_tanque) * 100);
        const status = percentage < 10 ? 'CRÍTICO' : percentage < 20 ? 'BAIXO' : 'OK';
        const code = e.combustivel?.codigo || 'N/A';

        // Filtra dados do período para este combustível
        const vendasComb = leituras.filter(l => l.bico?.combustivel_id === e.combustivel_id);
        const comprasComb = compras.filter(c => c.combustivel_id === e.combustivel_id);

        const volumeVendido = vendasComb.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
        const volumeComprado = comprasComb.filter(c => c.data >= paraIsoLocal(dataInicioAnalise)).reduce((acc, c) => acc + c.quantidade_litros, 0);

        const mediaDiaria = volumeVendido / 7;
        const custoMedio = e.custo_medio || comprasComb[0]?.custo_por_litro || 0;
        const precoVenda = e.combustivel?.preco_venda || 0;

        return {
          id: String(e.id),
          code: code,
          name: e.combustivel?.nome || 'N/A',
          volume: e.quantidade_atual,
          capacity: e.capacidade_tanque,
          percentage: percentage,
          status: status as 'OK' | 'BAIXO' | 'CRÍTICO',
          daysRemaining: mediaDiaria > 0 ? Math.floor(e.quantidade_atual / mediaDiaria) : 99,
          color: colorMap[code] || 'gray',
          iconType: iconMap[code] || 'pump',
          costPrice: custoMedio,
          sellPrice: precoVenda,
          // Reconciliação
          previousStock: e.quantidade_atual - volumeComprado + volumeVendido,
          totalPurchases: volumeComprado,
          totalSales: volumeVendido,
          lossOrGain: 0, // Por enquanto zero, precisaria de leitura de tanque real
        };
      });

      // Financeiro Global do Estoque
      const totalCost = items.reduce((acc, i) => acc + (i.volume * i.costPrice), 0);
      const totalSell = items.reduce((acc, i) => acc + (i.volume * i.sellPrice), 0);
      const projectedProfit = totalSell - totalCost;

      // Alerts - InventoryAlert[]
      const alerts = estoque
        .filter(e => (e.quantidade_atual / e.capacidade_tanque) < 0.2)
        .map(e => {
          const percentage = (e.quantidade_atual / e.capacidade_tanque) * 100;
          const isCritical = percentage < 10;

          return {
            id: String(e.id),
            type: (isCritical ? 'critical' : 'warning') as 'critical' | 'warning',
            title: isCritical ? 'Nível Crítico!' : 'Estoque Baixo',
            message: `${e.combustivel?.nome || 'Combustível'} está com apenas ${Math.round(percentage)}% da capacidade.`,
            actionPrimary: 'Registrar Compra',
            actionSecondary: isCritical ? 'Ver Fornecedores' : undefined,
          };
        });

      // Transactions - InventoryTransaction[]
      const purchaseTransactions = compras.slice(0, 10).map((c) => ({
        id: `compra-${c.id}`,
        date: new Date(c.data).toLocaleDateString('pt-BR') + ' 08:00',
        type: 'Compra' as const,
        product: c.combustivel?.nome || 'N/A',
        quantity: c.quantidade_litros,
        responsible: c.fornecedor?.nome || 'Distribuidora',
        status: 'Recebido' as const,
      }));

      const salesTransactions = leituras.slice(0, 10).map((l) => ({
        id: `venda-${l.id}`,
        date: new Date(l.data).toLocaleDateString('pt-BR') + ' 22:00',
        type: 'Venda' as const,
        product: l.combustivel?.Combustivel?.nome || 'N/A',
        quantity: -(l.litros_vendidos || 0),
        responsible: 'Sistema',
        status: 'Concluído' as const,
      }));

      const transactions = [...purchaseTransactions, ...salesTransactions]
        .sort((a, b) => {
          const dateA = a.date.split('/').reverse().join('-');
          const dateB = b.date.split('/').reverse().join('-');
          return dateB.localeCompare(dateA);
        })
        .slice(0, 15);

      return createSuccessResponse({ items, alerts, transactions, chartData, summary: { totalCost, totalSell, projectedProfit } });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Erro ao carregar dados do estoque');
    }
  },

  /**
   * Calcula a rentabilidade do posto.
   *
   * @param year - Ano de referência
   * @param month - Mês de referência
   * @param postoId - ID do posto (opcional)
   * @returns Métricas de rentabilidade (LUCRO LÍQUIDO, MARGEM, CUSTOS)
   */
  async fetchProfitabilityData(year: number = new Date().getFullYear(), month: number = new Date().getMonth() + 1, postoId?: number): Promise<ApiResponse<ProfitabilityItem[]>> {
    try {
      const inicioMesStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const fimMesStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

      let queryLeitura = supabase
        .from('Leitura')
        .select('*, bico:Bico(combustivel_id)')
        .gte('data', inicioMesStr)
        .lte('data', fimMesStr);

      if (postoId) queryLeitura = queryLeitura.eq('posto_id', postoId);

      const [estoqueRes, leiturasMes, despesasRes] = await Promise.all([
        estoqueService.getAll(postoId),
        queryLeitura,
        despesaService.getByMonth(year, month, postoId)
      ]);

      if (leiturasMes.error) return createErrorResponse(leiturasMes.error.message);

      const leituras = (leiturasMes.data || []) as LeituraWithRelations[];
      const estoque = extractData(estoqueRes);
      const despesas = extractData(despesasRes);

      const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0);
      const totalVolumeVendido = leituras.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);

      // Cálculo de Despesa Operacional Real por Litro (Fórmula Planilha Posto Jorro: H22 = H19/F11)
      let despOperacional = despesaOperacionalPorLitro(totalDespesas, totalVolumeVendido);

      // Fallback para configuração se não houver despesas registradas no mês
      if (despOperacional === 0) {
        const despOperacionalRes = await configuracaoService.getValorNumerico('despesa_operacional_litro', 0.45);
        despOperacional = extractData(despOperacionalRes);
      }

      return createSuccessResponse(estoque.map(e => {
        const vendasComb = leituras.filter(l => l.bico?.combustivel_id === e.combustivel_id);
        const volumeVendido = vendasComb.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
        const receitaBruta = vendasComb.reduce((acc, l) => acc + (l.valor_total || 0), 0);

        const custoMedio = e.custo_medio || 0;
        const custoTotalL = custoMedio + despOperacional;

        const lucroTotal = receitaBruta - (volumeVendido * custoTotalL);
        const margemLiquidaL = volumeVendido > 0 ? lucroTotal / volumeVendido : 0;
        const margemBrutaL = (e.combustivel?.preco_venda || 0) - custoMedio;

        return {
          id: e.id,
          combustivelId: e.combustivel_id,
          nome: e.combustivel?.nome || 'N/A',
          codigo: e.combustivel?.codigo || 'N/A',
          custoMedio,
          despOperacional,
          custoTotalL,
          precoVenda: e.combustivel?.preco_venda || 0,
          volumeVendido,
          receitaBruta,
          lucroTotal,
          margemLiquidaL,
          margemBrutaL,
          cor: e.combustivel?.cor || 'gray'
        };
      }));
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Erro ao calcular rentabilidade');
    }
  }
};
