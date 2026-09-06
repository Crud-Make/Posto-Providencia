import { conferido, corDoProduto, meiosFromFechamentoRow, despesaOperacionalPorLitro, lucroCombustivel, deIsoLocal } from '@posto/utils';
import { supabase } from '../supabase';
import { combustivelService } from './combustivel.service';
import { bicoService } from './bico.service';
import { formaPagamentoService } from './formaPagamento.service';
import { estoqueService } from './estoque.service';
import { frentistaService } from './frentista.service';
import { leituraService } from './leitura.service';
import { fechamentoFrentistaService } from './fechamentoFrentista.service';
import { despesaService } from './despesa.service';
import { compraService } from './compra.service';
import { custoMedioPorCombustivel } from '../custo-do-mes';
import { mesCivil } from '../../utils/periodo';
import type { Combustivel, FechamentoFrentista, Leitura } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';
import type { FuelData, PaymentMethod, AttendantClosing, AttendantPerformance } from '../../types/ui/dashboard';

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
 *
 * @remarks Mês sem despesa lançada devolve 0 — a soma real dos lançamentos.
 *          O fallback antigo (config `despesa_operacional_litro`, semeada com
 *          0,45) substituía o dado real por número inventado e violava o §6:
 *          custo operacional é SEMPRE despesas reais ÷ litros, nunca fixo.
 */
async function despesaOperacionalMensal(refDate: Date, postoId?: number): Promise<number> {
  const year = refDate.getFullYear();
  const month = refDate.getMonth() + 1;
  const inicioMesStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const fimMesStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  let queryLeitura = supabase.from('Leitura').select('litros_vendidos').gte('data', inicioMesStr).lte('data', fimMesStr);
  if (postoId) queryLeitura = queryLeitura.eq('posto_id', postoId);

  const [despesasRes, leiturasRes] = await Promise.all([
    despesaService.getByMonth(year, month, postoId),
    queryLeitura,
  ]);

  const totalDespesas = extractData(despesasRes).reduce((acc: number, d: { valor: number }) => acc + Number(d.valor), 0);
  const totalLitros = (leiturasRes.data || []).reduce((acc: number, l: { litros_vendidos: number | null }) => acc + (l.litros_vendidos || 0), 0);

  return despesaOperacionalPorLitro(totalDespesas, totalLitros);
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
    /** `null` quando algum produto vendido não tem compra no mês — ver `produtosSemCompra`. */
    totalProfit: number | null;
    /** Produtos vendidos no período sem compra no mês para custear. */
    produtosSemCompra: readonly string[];
  };
}

/** Item de retorno de {@link aggregatorService.fetchProfitabilityData}. */
export interface ProfitabilityItem {
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

/** Retorno de {@link aggregatorService.fetchProfitabilityData}. */
export interface ProfitabilityResult {
  /** Produtos com custo apurável no mês (compra lançada). */
  itens: ProfitabilityItem[];
  /** Produtos vendidos no mês sem compra para custear — ficam fora de `itens`. */
  produtosSemCompra: string[];
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
      // Mês de referência do rateio de despesa operacional: o MÊS DO PERÍODO FILTRADO.
      // [06/09/2026] Era `new Date()` (mês corrente) por herança da versão anterior: o
      // dashboard de agosto, aberto em setembro, rateava a despesa de SETEMBRO (zero até
      // lançarem) e mostrava R$ 50.948 de lucro onde a Análise de Custos, com a despesa de
      // agosto, mostra R$ 35.432. Mesmo mês que o custo da compra, logo abaixo.
      const mesDoRateio = deIsoLocal(dataInicio);

      // Onda única de queries: nenhuma depende do resultado de outra
      // Custo do litro: a compra do MÊS de `dataInicio` (canônico da planilha), não mais o
      // carimbo `Estoque.custo_medio` — ver `services/custo-do-mes.ts` (03/09/2026).
      const mesDoCusto = mesCivil(dataInicio);
      const [estoqueRes, frentistasRes, formasPagamentoRes, leiturasDataRes, fechamentosFrentistaHojeRes, despesaOpLitro, comprasRes] = await Promise.all([
        estoqueService.getAll(postoId),
        frentistaService.getAll(postoId),
        formaPagamentoService.getAll(postoId),
        leituraService.getByDateRange(dataInicio, dataFim, postoId),
        fechamentoFrentistaService.getByDate(dataInicio, postoId),
        despesaOperacionalMensal(mesDoRateio, postoId),
        compraService.getByDateRange(mesDoCusto.inicio, mesDoCusto.fim, postoId),
      ]);

      const estoque = extractData(estoqueRes);
      const custoDoMes = custoMedioPorCombustivel(extractData(comprasRes));
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
        // Cor da planilha pelo código — não a do cadastro nem mapa local (o de
        // antes trocava GC com S10). Um padrão só no sistema inteiro.
        color: corDoProduto(v.combustivel?.codigo).fundo,
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
          // A foto que o próprio frentista pôs no PWA. Vazio = a UI desenha as
          // iniciais localmente. Antes daqui saía uma URL do `ui-avatars.com`,
          // que mandava o nome dos funcionários para fora a cada carregamento.
          avatar: f.foto ?? '',
          shift: 'Dia', // Sistema simplificado sem turnos
          totalSales: totalSales,
          status: status,
          sessionStatus: (fechamento?.observacoes?.includes('[CONFERIDO]') ? 'conferido' : 'pendente') as 'conferido' | 'pendente',
        };
      });

      // Lucro estimado — despesa operacional REAL do mês (despesas/litros), não mais 0,45 fixo.
      // Produto vendido sem compra no mês não tem custo: o total vira `null`, nunca um
      // lucro inflado com custo zero.
      const produtosSemCompra: string[] = [];
      let somaLucro = 0;
      for (const item of vendas.porCombustivel) {
        if (item.litros <= 0) continue;
        const custoMedio = custoDoMes(item.combustivel.id);
        if (custoMedio === null) {
          produtosSemCompra.push(item.combustivel.nome);
          continue;
        }
        somaLucro += lucroCombustivel({
          litros: item.litros,
          precoVenda: item.valor / item.litros,
          custoMedio,
          despesaOperacionalLitro: despesaOpLitro,
        });
      }
      const totalLucroEstimado = produtosSemCompra.length > 0 ? null : somaLucro;

      // PerformanceData — ranking pelas VENDAS conferidas, que são dado real por
      // frentista. Antes mostrava "Lucro Est." = vendas × margem média global do
      // posto: o total fechava, mas cada linha era ficção (quem vendeu diesel e
      // quem vendeu gasolina recebiam a mesma margem). Lucro por frentista exige
      // venda por produto por frentista, que o modelo de dados não tem — número
      // que não dá para calcular não aparece (§6).
      const performanceData = closingsData
        .map((c) => ({
          id: c.id,
          name: c.name,
          avatar: c.avatar,
          metric: 'Vendas do dia',
          value: `R$ ${c.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          subValue: '',
          type: (c.totalSales > 0 ? 'ticket' : 'volume') as 'ticket' | 'volume' | 'divergence',
          rawSales: c.totalSales,
          status: c.sessionStatus,
        }))
        .sort((a, b) => b.rawSales - a.rawSales)
        .slice(0, 5)
        .map(({ rawSales: _rawSales, ...item }) => item);

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
          produtosSemCompra,
        },
      });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Erro ao carregar dashboard');
    }
  },

  /**
   * Calcula a rentabilidade do posto.
   *
   * @param year - Ano de referência
   * @param month - Mês de referência
   * @param postoId - ID do posto (opcional)
   * @returns Métricas de rentabilidade (LUCRO LÍQUIDO, MARGEM, CUSTOS) por produto, mais a
   *          lista dos produtos que ficaram sem custo (vendidos sem compra no mês).
   * @remarks [03/09/2026] O custo é a compra do MÊS por produto (`custoMedioCompra`,
   *          canônico da planilha) — ver `services/custo-do-mes.ts`; antes era o carimbo
   *          `Estoque.custo_medio`. Produto vendido sem compra não entra em `itens`: com
   *          custo 0 ele apareceria como o mais lucrativo da tela.
   */
  async fetchProfitabilityData(year: number = new Date().getFullYear(), month: number = new Date().getMonth() + 1, postoId?: number): Promise<ApiResponse<ProfitabilityResult>> {
    try {
      const inicioMesStr = `${year}-${String(month).padStart(2, '0')}-01`;
      const fimMesStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

      let queryLeitura = supabase
        .from('Leitura')
        .select('*, bico:Bico(combustivel_id)')
        .gte('data', inicioMesStr)
        .lte('data', fimMesStr);

      if (postoId) queryLeitura = queryLeitura.eq('posto_id', postoId);

      const [estoqueRes, leiturasMes, despesasRes, comprasRes] = await Promise.all([
        estoqueService.getAll(postoId),
        queryLeitura,
        despesaService.getByMonth(year, month, postoId),
        compraService.getByDateRange(inicioMesStr, fimMesStr, postoId),
      ]);

      if (leiturasMes.error) return createErrorResponse(leiturasMes.error.message);

      const leituras = (leiturasMes.data || []) as LeituraWithRelations[];
      const estoque = extractData(estoqueRes);
      const despesas = extractData(despesasRes);
      const custoDoMes = custoMedioPorCombustivel(extractData(comprasRes));

      const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0);
      const totalVolumeVendido = leituras.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);

      // Despesa operacional real por litro (fórmula da planilha Posto Jorro: H22 = H19/F11).
      // Mês sem despesa lançada fica em 0 — nunca o fallback fixo de 0,45 (§6).
      const despOperacional = despesaOperacionalPorLitro(totalDespesas, totalVolumeVendido);

      const itens: ProfitabilityItem[] = [];
      const produtosSemCompra: string[] = [];
      for (const e of estoque) {
        const vendasComb = leituras.filter(l => l.bico?.combustivel_id === e.combustivel_id);
        const volumeVendido = vendasComb.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
        const receitaBruta = vendasComb.reduce((acc, l) => acc + (l.valor_total || 0), 0);

        const custoMedio = custoDoMes(e.combustivel_id);
        if (custoMedio === null) {
          if (volumeVendido > 0) produtosSemCompra.push(e.combustivel?.nome || 'N/A');
          continue;
        }
        const custoTotalL = custoMedio + despOperacional;

        // [onda 3, grupo A] Era `receitaBruta − volume × custoTotalL` inline —
        // a MESMA conta canônica, à mão, no arquivo que já importa a função.
        // Agora delega (e quantiza em centavos na saída, como o resto do lucro).
        const lucroTotal = lucroCombustivel({
          litros: volumeVendido,
          precoVenda: volumeVendido > 0 ? receitaBruta / volumeVendido : 0,
          custoMedio,
          despesaOperacionalLitro: despOperacional,
        });
        const margemLiquidaL = volumeVendido > 0 ? lucroTotal / volumeVendido : 0;
        const margemBrutaL = (e.combustivel?.preco_venda || 0) - custoMedio;

        itens.push({
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
          cor: corDoProduto(e.combustivel?.codigo).fundo
        });
      }

      return createSuccessResponse({ itens, produtosSemCompra });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Erro ao calcular rentabilidade');
    }
  }
};
