import { FuelData, PaymentMethod, AttendantClosing, AttendantPerformance, FuelSummary, NozzleData, InventoryItem, InventoryAlert, InventoryTransaction, ProfitabilityItem } from './types/ui/dashboard';
import { ClosingAttendant } from './types/ui/closing';
import { ReadingPump } from './types/ui/readings';
import { SalesAnalysisProduct, SalesProfitability, SalesEvolutionData, ProductMixData } from './types/ui/sales';
import { AttendantProfile, AttendantHistoryEntry } from './types/ui/attendants';
import { ProductConfig, NozzleConfig } from './types/ui/config';
import { MobileNotification } from './types/ui/mobile';

/**
 * Dados de combustível para gráficos e visualizações.
 */
export const DADOS_COMBUSTIVEL: FuelData[] = [];

/**
 * Dados de formas de pagamento.
 */
export const DADOS_PAGAMENTO: PaymentMethod[] = [];

/**
 * Dados de fechamentos de frentistas.
 */
export const DADOS_FECHAMENTO: AttendantClosing[] = [];

/**
 * Dados de performance dos frentistas.
 */
export const DADOS_PERFORMANCE: AttendantPerformance[] = [];

/**
 * Resumo diário de vendas por combustível.
 */
export const RESUMO_DIARIO: FuelSummary[] = [];

/**
 * Dados detalhados dos bicos de abastecimento.
 */
export const DADOS_BICOS_DETALHADO: NozzleData[] = [];

/**
 * Dados resumidos dos bicos de abastecimento.
 */
export const DADOS_BICOS: NozzleData[] = [];

/**
 * Itens do inventário de estoque.
 */
export const ITENS_ESTOQUE: InventoryItem[] = [];

/**
 * Alertas de nível de estoque.
 */
export const ALERTAS_ESTOQUE: InventoryAlert[] = [];

/**
 * Transações recentes de estoque (entradas/saídas).
 */
export const TRANSACOES_RECENTES: InventoryTransaction[] = [];

/**
 * Dados de lucratividade por produto.
 */
export const DADOS_LUCRATIVIDADE: ProfitabilityItem[] = [];

/**
 * Dados iniciais para fechamento de caixa dos frentistas.
 */
export const FECHAMENTO_FRENTISTAS_INICIAL: ClosingAttendant[] = [];

/**
 * @deprecated Use FECHAMENTO_FRENTISTAS_INICIAL
 * Alias para compatibilidade com código legado.
 */
export const DADOS_FRENTISTAS_INICIAL = FECHAMENTO_FRENTISTAS_INICIAL;

/**
 * Dados de leitura das bombas de combustível.
 */
export const DADOS_LEITURA_BOMBAS: ReadingPump[] = [];

/**
 * Análise de vendas por produto.
 */
export const ANALISE_VENDAS_PRODUTOS: SalesAnalysisProduct[] = [];

/**
 * Lucratividade das vendas.
 */
export const LUCRATIVIDADE_VENDAS: SalesProfitability[] = [];

/**
 * Dados de evolução das vendas ao longo do tempo.
 */
export const EVOLUCAO_VENDAS: SalesEvolutionData[] = [];

/**
 * Mix de produtos vendidos.
 */
export const MIX_PRODUTOS: ProductMixData[] = [];

/**
 * Lista completa de frentistas.
 */
export const LISTA_FRENTISTAS: AttendantProfile[] = [];

/**
 * Histórico de atividades dos frentistas.
 */
export const HISTORICO_FRENTISTAS: AttendantHistoryEntry[] = [];

/**
 * Configurações de produtos.
 */
export const CONFIG_PRODUTOS: ProductConfig[] = [];

/**
 * Configurações de bicos.
 */
export const CONFIG_BICOS: NozzleConfig[] = [];

/**
 * Notificações para o aplicativo móvel.
 */
export const NOTIFICACOES_MOBILE: MobileNotification[] = [];
