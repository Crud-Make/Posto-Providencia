import { ResultAsync } from 'neverthrow';
import { corDoProduto, despesaOperacionalPorLitro, lucroCombustivel, deIsoLocal } from '@posto/utils';
import { supabase } from '../supabase';
import { corteDaTelaLigado, descreverErroDaApi, type ErroDaApi } from './base';
import { lerDashboardDaApi, paraInsumosDeAgregacao, type JanelaDoRateio, type VendaPorCombustivel } from './dashboard.api';
import { combustivelService } from './combustivel.service';
import { lerCodigosDeCombustivelDaApi } from './combustivel.api';
import { cadastroEFechamentoDaApi } from './dashboard-cadastro.api';
import { enviosPorFrentista } from './envios-do-periodo';
import { bicoService } from './bico.service';
import { formaPagamentoService } from './formaPagamento.service';
import { frentistaService } from './frentista.service';
import { leituraService } from './leitura.service';
import { fechamentoFrentistaService } from './fechamentoFrentista.service';
import { despesaService } from './despesa.service';
import { compraService } from './compra.service';
import { custoMedioPorCombustivel, type CompraParaCusto } from '../custo-do-mes';
import { mesCivil } from '../../utils/periodo';
import type { Combustivel } from '../../types/database/index';
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

/**
 * O lado venda/compra/rateio do dashboard, já no formato que o laço de lucro consome — sem
 * saber de que fonte veio. É a fronteira do strangler dentro de `fetchDashboardData` (#100,
 * fatia 2): tudo o que decide insumo de dinheiro entra por aqui e por mais nenhum lugar.
 */
interface InsumosDeAgregacao {
  readonly porCombustivel: readonly VendaPorCombustivel[];
  readonly totalLitros: number;
  readonly totalVendas: number;
  readonly compras: readonly CompraParaCusto[];
  readonly despesaOpLitro: number;
  /** Mês civil que a compra e o rateio cobrem — a tela avisa quando ele tem mais de um mês. */
  readonly janelaDoRateio: JanelaDoRateio;
}

/**
 * Por que a leitura dos insumos do dashboard falhou: a API Laravel (`ErroDaApi`), o cadastro de
 * combustíveis (Supabase, `ApiResponse` legado, só texto) ou a fonte antiga inteira — o caminho
 * Supabase sem `VITE_API_URL`, cujo `extractData` lança com o texto que a tela sempre mostrou.
 */
type ErroDosInsumos =
  | ErroDaApi
  | { readonly tipo: 'cadastro'; readonly detalhe: string }
  | { readonly tipo: 'fonte_antiga'; readonly detalhe: string };

/** Mensagem para o `ApiResponse` legado, cobrindo as três fontes de falha. */
function descreverErroDosInsumos(erro: ErroDosInsumos): string {
  switch (erro.tipo) {
    case 'fonte_antiga':
      // Sem prefixo, de propósito: é o texto que a produção (sem `VITE_API_URL`) mostrava antes.
      return erro.detalhe;
    case 'cadastro':
      return `Cadastro de combustíveis indisponível: ${erro.detalhe}`;
    default:
      return descreverErroDaApi(erro);
  }
}

/**
 * Insumos do Supabase como `Result`: o `throw` do `extractData` (e qualquer rejeição dos services)
 * vira `Err` tipado aqui, na borda — antes ia embrulhado em `fromSafePromise`, que supõe promise
 * que nunca rejeita, e a falha só era pega pelo `catch` de `fetchDashboardData`.
 */
function insumosDoSupabase(dataInicio: string, dataFim: string, postoId?: number): ResultAsync<InsumosDeAgregacao, ErroDosInsumos> {
  return ResultAsync.fromPromise(
    lerInsumosDoSupabase(dataInicio, dataFim, postoId),
    (erro): ErroDosInsumos => ({
      tipo: 'fonte_antiga',
      // Os mesmos textos do `catch` de antes: a mensagem do `Error`, ou o genérico do dashboard.
      detalhe: erro instanceof Error ? erro.message : 'Erro ao carregar dashboard',
    }),
  );
}

/**
 * Insumos lidos do Supabase — o caminho de sempre, só movido para cá (18/09/2026).
 *
 * @remarks
 * Compra e rateio vêm do mês civil de `dataInicio` SÓ (`mesCivil(dataInicio)`), mesmo quando o
 * período atravessa meses. É o comportamento de produção e fica preso em
 * `aggregator.dashboard.test.ts`; o caminho da API decide diferente (ver {@link insumosDaApi}).
 */
async function lerInsumosDoSupabase(dataInicio: string, dataFim: string, postoId?: number): Promise<InsumosDeAgregacao> {
  // Mês de referência do rateio de despesa operacional: o MÊS DO PERÍODO FILTRADO.
  // [06/09/2026] Era `new Date()` (mês corrente) por herança da versão anterior: o
  // dashboard de agosto, aberto em setembro, rateava a despesa de SETEMBRO (zero até
  // lançarem) e mostrava R$ 50.948 de lucro onde a Análise de Custos, com a despesa de
  // agosto, mostra R$ 35.432. Mesmo mês que o custo da compra, logo abaixo.
  const mesDoRateio = deIsoLocal(dataInicio);

  // Custo do litro: a compra do MÊS de `dataInicio` (canônico da planilha), não mais o
  // carimbo `Estoque.custo_medio` — ver `services/custo-do-mes.ts` (03/09/2026).
  const mesDoCusto = mesCivil(dataInicio);
  const [leiturasDataRes, despesaOpLitro, comprasRes] = await Promise.all([
    leituraService.getByDateRange(dataInicio, dataFim, postoId),
    despesaOperacionalMensal(mesDoRateio, postoId),
    compraService.getByDateRange(mesDoCusto.inicio, mesDoCusto.fim, postoId),
  ]);

  const leiturasData = extractData(leiturasDataRes);

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

  return {
    porCombustivel: Object.values(porCombustivelVendas) as VendaCombustivel[],
    totalLitros: totalLitrosVendas,
    totalVendas: totalValorVendas,
    compras: extractData(comprasRes),
    despesaOpLitro,
    janelaDoRateio: mesDoCusto,
  };
}

/**
 * `Combustivel.id → codigo` do cadastro, para a cor do gráfico — pelo catálogo da API desde a
 * fatia 3 da #100 (antes vinha do Supabase). Falha do cadastro é `Err` tipado, não exceção.
 */
function codigosDoCadastro(postoId: number): ResultAsync<ReadonlyMap<number, string>, ErroDosInsumos> {
  return lerCodigosDeCombustivelDaApi(postoId).mapErr((erro): ErroDosInsumos => ({ tipo: 'cadastro', detalhe: descreverErroDaApi(erro) }));
}

/**
 * Insumos lidos da API Laravel (`GET /api/postos/{posto}/dashboard`) — fatia 2 da #100.
 *
 * @remarks
 * DECISÃO DO DONO (18/09/2026, Design Doc `agregacao.md` §5 "Divergência decidida"): a API toma
 * compra e rateio do mês civil que CONTÉM o período — do dia 1 do mês de `inicio` ao último dia
 * do mês de `fim` (`Periodo::mesCivil()` no PHP). Dentro de um mesmo mês é idêntico ao Supabase;
 * em período que atravessa meses o número da tela MUDA em relação ao caminho Supabase, de
 * propósito, e `janelaDoRateio` é o que permite a tela avisar. Nenhuma conta de dinheiro acontece
 * aqui além do próprio `despesaOperacionalPorLitro` canônico — o mesmo que o caminho Supabase usa.
 *
 * A cor do combustível precisa do `codigo`, que a API de agregação não devolve
 * (`ProdutoAgregadoResource`): ele vem do catálogo (`GET /api/postos/{posto}/combustiveis`).
 * Combustível fora do cadastro cai em `corDoProduto(undefined)`.
 */
function insumosDaApi(postoId: number, dataInicio: string, dataFim: string): ResultAsync<InsumosDeAgregacao, ErroDosInsumos> {
  return ResultAsync.combine([
    lerDashboardDaApi(postoId, dataInicio, dataFim),
    codigosDoCadastro(postoId),
  ]).map(([dashboard, codigoPorCombustivelId]) => {
    const brutos = paraInsumosDeAgregacao(dashboard, codigoPorCombustivelId);
    return {
      porCombustivel: brutos.porCombustivel,
      totalLitros: brutos.totalLitros,
      totalVendas: brutos.totalVendas,
      compras: brutos.compras,
      despesaOpLitro: despesaOperacionalPorLitro(brutos.rateio.despesasTotal, brutos.rateio.litros),
      janelaDoRateio: brutos.janelaDoRateio,
    };
  });
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
    /** Mês civil de onde saíram a compra e a despesa rateada — mais de um mês só pela API. */
    janelaDoRateio: JanelaDoRateio;
  };
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
   * Agrega vendas, frentistas e formas de pagamento.
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
      // Strangler (#100, fatia 2): venda, compra e rateio vêm da API Laravel quando o corte da
      // tela está ligado e há posto (a rota é por posto); sem isso, o caminho de sempre. O corte
      // segue `VITE_API_URL`, salvo `VITE_API_DASHBOARD=0` — o ensaio de 27/09 acende só o
      // Fechamento de Caixa e deixa o Dashboard no Supabase.
      const pelaApi = corteDaTelaLigado(import.meta.env.VITE_API_DASHBOARD) && postoId !== undefined;
      const fonte: ResultAsync<InsumosDeAgregacao, ErroDosInsumos> = pelaApi
        ? insumosDaApi(postoId, dataInicio, dataFim)
        : insumosDoSupabase(dataInicio, dataFim, postoId);

      // Onda única: as consultas de cadastro e fechamento são disparadas ANTES de esperar a fonte,
      // então começam junto com ela — nenhuma depende do resultado de outra. Antes da fatia 2 eram
      // 7 consultas numa `Promise.all` só, e o caminho sem `VITE_API_URL` tem de continuar assim
      // (preso em `aggregator.dashboard.test.ts`, "uma leva só de consultas"). Com o corte ligado,
      // cadastro e fechamentos também vêm da API (fatia 3): sem isso a tela dependia da sessão do
      // Supabase, que o login pela API não cria.
      const cadastroEFechamento = pelaApi ? cadastroEFechamentoDaApi(postoId, dataInicio, dataFim) : Promise.all([
        frentistaService.getAll(postoId),
        formaPagamentoService.getAll(postoId),
        fechamentoFrentistaService.getByDate(dataInicio, postoId),
      ]);
      const lidos = await fonte;
      const [frentistasRes, formasPagamentoRes, fechamentosFrentistaHojeRes] = await cadastroEFechamento;
      if (lidos.isErr()) return createErrorResponse(descreverErroDosInsumos(lidos.error), 'FETCH_ERROR');
      const insumos = lidos.value;

      const custoDoMes = custoMedioPorCombustivel(insumos.compras);
      const frentistas = extractData(frentistasRes);
      const formasPagamento = extractData(formasPagamentoRes);
      const fechamentosFrentistaHoje = extractData(fechamentosFrentistaHojeRes);

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
      const fuelData = insumos.porCombustivel.map(v => ({
        name: v.combustivel?.nome || 'N/A',
        volume: v.litros,
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

      // ClosingsData — status de cada frentista no período: os envios somam entre dias, e dentro
      // do mesmo dia vale o último (ver `envios-do-periodo.ts`).
      const enviosDoPeriodo = enviosPorFrentista(fechamentosFrentistaHoje);

      // Filtra frentistas se houver filtro específico
      const frentistasToShow = frentistaId
        ? frentistas.filter((f) => f.id === frentistaId)
        : frentistas;

      const closingsData = frentistasToShow.map((f) => {
        const envios = enviosDoPeriodo.get(f.id);
        let status: 'OK' | 'Divergente' | 'Aberto' = 'Aberto';
        let totalSales = 0;

        if (envios) {
          // Total conferido canônico (7 buckets, cartão aditivo, moedas + baratão), somado no período
          totalSales = envios.totalConferido;

          // Status baseado na diferença (falta de caixa)
          const diferenca = Math.abs(envios.diferenca);
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
          sessionStatus: (envios?.conferido === true ? 'conferido' : 'pendente') as 'conferido' | 'pendente',
        };
      });

      // Lucro estimado — despesa operacional REAL do mês (despesas/litros), não mais 0,45 fixo.
      // Produto vendido sem compra no mês não tem custo: o total vira `null`, nunca um
      // lucro inflado com custo zero.
      const produtosSemCompra: string[] = [];
      let somaLucro = 0;
      for (const item of insumos.porCombustivel) {
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
          despesaOperacionalLitro: insumos.despesaOpLitro,
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
          totalSales: insumos.totalVendas || 0,
          avgTicket: insumos.totalLitros > 0 ? insumos.totalVendas / insumos.totalLitros * 30 : 0,
          totalDivergence: 0,
          totalVolume: insumos.totalLitros || 0,
          totalProfit: totalLucroEstimado,
          produtosSemCompra,
          janelaDoRateio: insumos.janelaDoRateio,
        },
      });
    } catch (error) {
      return createErrorResponse(error instanceof Error ? error.message : 'Erro ao carregar dashboard');
    }
  }
};
