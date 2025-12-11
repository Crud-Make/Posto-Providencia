
import { FuelData, PaymentMethod, AttendantClosing, AttendantPerformance, FuelSummary, NozzleData, InventoryItem, InventoryAlert, InventoryTransaction, ProfitabilityItem, ClosingAttendantInput, ReadingPump, SalesAnalysisProduct, SalesProfitability, SalesEvolutionData, ProductMixData, AttendantProfile, AttendantHistoryEntry, ProductConfig, NozzleConfig, ShiftConfig, MobileNotification } from './types';

export const FUEL_DATA: FuelData[] = [
  { name: 'Gasolina Comum', volume: 12500, maxCapacity: 20000, color: 'bg-red-500' },
  { name: 'Etanol', volume: 8200, maxCapacity: 15000, color: 'bg-green-500' },
  { name: 'Diesel S-10', volume: 15000, maxCapacity: 25000, color: 'bg-gray-700' },
  { name: 'Gasolina Aditivada', volume: 4500, maxCapacity: 10000, color: 'bg-red-700' },
];

export const PAYMENT_DATA: PaymentMethod[] = [
  { name: 'Crédito', percentage: 45, value: 45000, color: '#3b82f6' },
  { name: 'Débito', percentage: 30, value: 30000, color: '#10b981' },
  { name: 'Pix', percentage: 15, value: 15000, color: '#f59e0b' },
  { name: 'Dinheiro', percentage: 10, value: 10000, color: '#6366f1' },
];

export const CLOSINGS_DATA: AttendantClosing[] = [
  { id: '1', name: 'João Silva', avatar: 'https://ui-avatars.com/api/?name=Joao+Silva&background=c7d2fe&color=3730a3', shift: 'Manhã', totalSales: 4500.50, status: 'OK' },
  { id: '2', name: 'Maria Souza', avatar: 'https://ui-avatars.com/api/?name=Maria+Souza&background=fde68a&color=92400e', shift: 'Manhã', totalSales: 3800.00, status: 'Divergente' },
  { id: '3', name: 'Pedro Santos', avatar: 'https://ui-avatars.com/api/?name=Pedro+Santos&background=bbf7d0&color=166534', shift: 'Tarde', totalSales: 0, status: 'Aberto' },
];

export const PERFORMANCE_DATA: AttendantPerformance[] = [
  { id: '1', name: 'Ana Oliveira', avatar: 'https://ui-avatars.com/api/?name=Ana+Oliveira&background=fecaca&color=991b1b', metric: 'Ticket Médio', value: 'R$ 180,00', subValue: '+15% da meta', type: 'ticket' },
  { id: '2', name: 'Carlos Lima', avatar: 'https://ui-avatars.com/api/?name=Carlos+Lima&background=e9d5ff&color=6b21a8', metric: 'Volume Vendido', value: '2.500 L', subValue: 'Top 1 do dia', type: 'volume' },
  { id: '3', name: 'Roberto Dias', avatar: 'https://ui-avatars.com/api/?name=Roberto+Dias&background=fed7aa&color=9a3412', metric: 'Divergência de Caixa', value: '- R$ 45,00', subValue: 'Atenção necessária', type: 'divergence' },
];

export const DAILY_SUMMARY_DATA: FuelSummary[] = [
  { id: '1', name: 'Gasolina C.', iconType: 'pump', totalValue: 45200.00, volume: 8500, avgPrice: 5.31, color: 'text-red-500' },
  { id: '2', name: 'Etanol', iconType: 'leaf', totalValue: 28400.00, volume: 7200, avgPrice: 3.94, color: 'text-green-500' },
  { id: '3', name: 'Diesel S10', iconType: 'truck', totalValue: 62100.00, volume: 9800, avgPrice: 6.33, color: 'text-gray-600' },
];

export const NOZZLE_DATA: NozzleData[] = [
  { id: '1', bico: '01', product: 'Gasolina Comum', productColor: 'bg-red-100 text-red-700', startReading: 145000.00, endReading: 145250.00, volume: 250.00, totalValue: 1327.50, status: 'OK' },
  { id: '2', bico: '02', product: 'Etanol', productColor: 'bg-green-100 text-green-700', startReading: 89000.00, endReading: 89120.00, volume: 120.00, totalValue: 472.80, status: 'OK' },
  { id: '3', bico: '03', product: 'Diesel S10', productColor: 'bg-gray-100 text-gray-700', startReading: 210000.00, endReading: 210000.00, volume: 0, totalValue: 0, status: 'NoSales' },
  { id: '4', bico: '04', product: 'Gasolina Comum', productColor: 'bg-red-100 text-red-700', startReading: 320100.00, endReading: 320400.00, volume: 300.00, totalValue: 1593.00, status: 'Alert' },
];

export const INVENTORY_ITEMS: InventoryItem[] = [
  { id: '1', code: 'GC', name: 'Gasolina Comum', volume: 12450, capacity: 30000, percentage: 41.5, status: 'OK', daysRemaining: 5, color: 'blue', iconType: 'pump' },
  { id: '2', code: 'ET', name: 'Etanol Hidratado', volume: 4200, capacity: 20000, percentage: 21.0, status: 'BAIXO', daysRemaining: 2, color: 'green', iconType: 'leaf' },
  { id: '3', code: 'S10', name: 'Diesel S-10', volume: 850, capacity: 25000, percentage: 3.4, status: 'CRÍTICO', daysRemaining: 0, color: 'gray', iconType: 'truck' },
  { id: '4', code: 'GA', name: 'Gasolina Aditivada', volume: 8900, capacity: 15000, percentage: 59.3, status: 'OK', daysRemaining: 12, color: 'yellow', iconType: 'pump' },
];

export const INVENTORY_ALERTS: InventoryAlert[] = [
  { id: '1', type: 'critical', title: 'Nível Crítico: Diesel S-10', message: 'O tanque 03 atingiu 3.4% da capacidade. O estoque pode acabar nas próximas 4 horas.', actionPrimary: 'Solicitar Compra Urgente', actionSecondary: 'Verificar Tanque' },
  { id: '2', type: 'warning', title: 'Reabastecimento Programado', message: 'Caminhão de Etanol (5.000 L) agendado para chegar hoje às 14:00h.', actionPrimary: 'Confirmar Recebimento' },
];

export const RECENT_TRANSACTIONS: InventoryTransaction[] = [
  { id: 't1', date: 'Hoje, 09:45', type: 'Venda', product: 'Diesel S-10', quantity: -450, responsible: 'Bomba 04', status: 'Concluído' },
  { id: 't2', date: 'Ontem, 22:30', type: 'Compra', product: 'Gasolina Comum', quantity: 5000, responsible: 'Petrobras', status: 'Recebido' },
  { id: 't3', date: 'Ontem, 18:15', type: 'Venda', product: 'Etanol', quantity: -120, responsible: 'Bomba 02', status: 'Concluído' },
];

export const PROFITABILITY_DATA: ProfitabilityItem[] = [
  { id: '1', product: 'Gasolina Comum', color: 'bg-red-500', salesVolume: 45200, netMargin: 0.59, totalProfit: 26668, sharePercentage: 65 },
  { id: '2', product: 'Diesel S-10', color: 'bg-gray-600', salesVolume: 28150, netMargin: 0.15, totalProfit: 4222, sharePercentage: 20, warning: true },
  { id: '3', product: 'Etanol', color: 'bg-green-500', salesVolume: 15400, netMargin: 0.35, totalProfit: 5390, sharePercentage: 15 },
];

export const INITIAL_ATTENDANTS_DATA: ClosingAttendantInput[] = [
  { id: 'a1', name: 'João Silva', avatar: 'https://ui-avatars.com/api/?name=Joao+Silva&background=c7d2fe&color=3730a3', expectedValue: 2450.00, declared: { card: 0, note: 0, pix: 0, cash: 0 } },
  { id: 'a2', name: 'Maria Souza', avatar: 'https://ui-avatars.com/api/?name=Maria+Souza&background=fde68a&color=92400e', expectedValue: 1890.50, declared: { card: 0, note: 0, pix: 0, cash: 0 } },
];

export const READING_PUMPS_DATA: ReadingPump[] = [
  {
    id: 'p1',
    name: 'Bomba 01 (Ilha Central)',
    nozzles: [
      { id: 'n1', number: '01', product: 'Gasolina Comum', productColorClass: 'bg-red-100 text-red-700', tank: 'TQ-01', initialReading: 145890.12, price: 5.89 },
      { id: 'n2', number: '02', product: 'Etanol', productColorClass: 'bg-green-100 text-green-700', tank: 'TQ-02', initialReading: 89450.00, price: 3.99 },
    ]
  },
  {
    id: 'p2',
    name: 'Bomba 02 (Ilha Lateral)',
    nozzles: [
      { id: 'n3', number: '03', product: 'Diesel S-10', productColorClass: 'bg-gray-100 text-gray-700', tank: 'TQ-03', initialReading: 210500.50, price: 6.59 },
      { id: 'n4', number: '04', product: 'Gasolina Adit.', productColorClass: 'bg-yellow-100 text-yellow-700', tank: 'TQ-04', initialReading: 56200.10, price: 6.09 },
    ]
  }
];

export const SALES_ANALYSIS_PRODUCTS: SalesAnalysisProduct[] = [
  { id: 'sap1', name: 'Gasolina Comum', code: 'GC', colorClass: 'bg-red-100 text-red-700', bicos: '01, 04, 05, 08', readings: { start: 145000, end: 149500 }, volume: 4500, price: 5.89, total: 26505.00, profit: 2655.00 },
  { id: 'sap2', name: 'Etanol', code: 'ET', colorClass: 'bg-green-100 text-green-700', bicos: '02, 06', readings: { start: 89000, end: 91200 }, volume: 2200, price: 3.99, total: 8778.00, profit: 770.00 },
  { id: 'sap3', name: 'Diesel S-10', code: 'S10', colorClass: 'bg-gray-100 text-gray-700', bicos: '03, 07', readings: { start: 210000, end: 213500 }, volume: 3500, price: 6.59, total: 23065.00, profit: 525.00 },
];

export const SALES_PROFITABILITY: SalesProfitability[] = [
  { name: 'Gasolina Comum', value: 2655, percentage: 67, margin: 10, color: '#ef4444' },
  { name: 'Etanol', value: 770, percentage: 20, margin: 8.7, color: '#22c55e' },
  { name: 'Diesel S-10', value: 525, percentage: 13, margin: 2.3, color: '#4b5563' },
];

export const SALES_EVOLUTION_DATA: SalesEvolutionData[] = [
  { month: 'Dez', volume: 245000, isCurrent: false },
  { month: 'Jan', volume: 210000, isCurrent: false },
  { month: 'Fev', volume: 225000, isCurrent: false },
  { month: 'Mar', volume: 260000, isCurrent: false },
  { month: 'Abr', volume: 255000, isCurrent: false },
  { month: 'Mai', volume: 280000, isCurrent: true },
];

export const PRODUCT_MIX_DATA: ProductMixData[] = [
  { name: 'Gasolina', volume: 155000, percentage: 55, color: 'bg-red-500' },
  { name: 'Etanol', volume: 65000, percentage: 23, color: 'bg-green-500' },
  { name: 'Diesel', volume: 60000, percentage: 22, color: 'bg-gray-600' },
];

export const ATTENDANTS_LIST_DATA: AttendantProfile[] = [
  { id: 'att1', name: 'João Silva', initials: 'JS', phone: '(11) 99999-1111', shift: 'Manhã', status: 'Ativo', admissionDate: '10/01/2021', sinceDate: 'Jan 2021', cpf: '123.456.789-00', divergenceRate: 2.5, riskLevel: 'Baixo Risco', avatarColorClass: 'bg-blue-100 text-blue-700' },
  { id: 'att2', name: 'Maria Souza', initials: 'MS', phone: '(11) 98888-2222', shift: 'Tarde', status: 'Ativo', admissionDate: '15/03/2022', sinceDate: 'Mar 2022', cpf: '234.567.890-11', divergenceRate: 8.2, riskLevel: 'Médio Risco', avatarColorClass: 'bg-pink-100 text-pink-700' },
  { id: 'att3', name: 'Pedro Santos', initials: 'PS', phone: '(11) 97777-3333', shift: 'Noite', status: 'Inativo', admissionDate: '01/06/2023', sinceDate: 'Jun 2023', cpf: '345.678.901-22', divergenceRate: 15.5, riskLevel: 'Alto Risco', avatarColorClass: 'bg-purple-100 text-purple-700' },
];

export const ATTENDANT_HISTORY_DATA: AttendantHistoryEntry[] = [
  { id: 'h1', date: 'Hoje', shift: 'Manhã', value: 0, status: 'OK' },
  { id: 'h2', date: 'Ontem', shift: 'Manhã', value: -15.50, status: 'Divergente' },
  { id: 'h3', date: '22/10', shift: 'Manhã', value: 0, status: 'OK' },
];

export const PRODUCTS_CONFIG_DATA: ProductConfig[] = [
    { id: 'p1', name: 'Gasolina Comum', type: 'Combustível', price: 5.89 },
    { id: 'p2', name: 'Etanol Comum', type: 'Biocombustível', price: 3.99 },
    { id: 'p3', name: 'Diesel S-10', type: 'Diesel', price: 6.59 },
];

export const NOZZLES_CONFIG_DATA: NozzleConfig[] = [
    { id: 'n1', number: '01', productName: 'Gasolina Comum', tankSource: 'Tanque 01' },
    { id: 'n2', number: '02', productName: 'Etanol Comum', tankSource: 'Tanque 02' },
    { id: 'n3', number: '03', productName: 'Diesel S-10', tankSource: 'Tanque 03' },
];

export const SHIFTS_CONFIG_DATA: ShiftConfig[] = [
    { id: 's1', name: 'Turno Manhã', start: '06:00', end: '14:00', iconType: 'sun' },
    { id: 's2', name: 'Turno Tarde', start: '14:00', end: '22:00', iconType: 'sunset' },
    { id: 's3', name: 'Turno Noite', start: '22:00', end: '06:00', iconType: 'moon' },
];

export const MOBILE_NOTIFICATIONS_DATA: MobileNotification[] = [
  { id: 'not1', title: 'Sangria Necessária', description: 'Caixa da Manhã atingiu R$ 5.000 em dinheiro.', timestamp: '10 min atrás', read: false, type: 'alert' },
  { id: 'not2', title: 'Fechamento Divergente', description: 'João Silva fechou com falta de R$ 25,00.', timestamp: '1 hora atrás', read: false, type: 'alert' },
  { id: 'not3', title: 'Caminhão Chegou', description: 'Entrada de 5.000L de Gasolina confirmada.', timestamp: '2 horas atrás', read: true, type: 'success' },
  { id: 'not4', title: 'Meta Batida!', description: 'Equipe da manhã superou a meta de V-Power.', timestamp: 'Ontem', read: true, type: 'info' },
];
