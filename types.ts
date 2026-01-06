
export interface FuelData {
  name: string;
  volume: number;
  maxCapacity: number;
  color: string;
}

export interface PaymentMethod {
  name: string;
  percentage: number;
  value: number;
  color: string;
}

export interface AttendantClosing {
  id: string;
  name: string;
  avatar: string;
  shift: string;
  totalSales: number;
  status: 'OK' | 'Divergente' | 'Aberto';
}

export interface AttendantPerformance {
  id: string;
  name: string;
  avatar: string;
  metric: string;
  value: string;
  subValue: string;
  type: 'ticket' | 'volume' | 'divergence';
  status?: 'pendente' | 'conferido'; // Campo adicionado
}

export interface FuelSummary {
  id: string;
  name: string;
  code: string; // GC, GA, ET, S10
  iconType: 'pump' | 'leaf' | 'truck';
  totalValue: number;
  volume: number;
  avgPrice: number;
  color: string;
  colorClass: string; // Tailwind class
}

export interface NozzleData {
  id: string;
  bico: number;
  productCode: string; // Links to FuelSummary.code
  productName: string;
  initialReading: number;
  finalReading: number;
  price: number;
  volume: number; // Calculated: Final - Initial
  total: number; // Calculated: Volume * Price
  status: 'OK' | 'Alert' | 'NoSales';
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  volume: number;
  capacity: number;
  percentage: number;
  status: 'OK' | 'BAIXO' | 'CRÍTICO';
  daysRemaining: number;
  color: string; // Tailwind class or hex
  iconType: 'pump' | 'leaf' | 'truck';
  // Propriedades opcionais para dados financeiros
  costPrice?: number;
  sellPrice?: number;
  previousStock?: number;
  purchases?: number;
  sales?: number;
}

export interface InventoryAlert {
  id: string;
  type: 'critical' | 'warning';
  title: string;
  message: string;
  actionPrimary: string;
  actionSecondary?: string;
}

export interface InventoryTransaction {
  id: string;
  date: string;
  type: 'Venda' | 'Compra';
  product: string;
  quantity: number;
  responsible: string;
  status: 'Concluído' | 'Recebido';
}

export interface ProfitabilityItem {
  id: string;
  product: string;
  color: string;
  salesVolume: number;
  netMargin: number;
  totalProfit: number;
  sharePercentage: number;
  warning?: boolean;
}

// --- NEW TYPES FOR CLOSING WIZARD (PRD v1.0) ---

export interface ClosingReceipts {
  credit: {
    sipag: number;
    azulzinha: number;
  };
  debit: {
    sipag: number;
    azulzinha: number;
  };
  pix: number;
  cash: number;
}

export interface ClosingAttendant {
  id: string;
  name: string;
  avatar: string;
  shift: string;
  expectedValue: number; // Valor conferido pelo sistema
  declared: {
    card: number;
    note: number;
    pix: number;
    cash: number;
  };
  observation?: string;
  hasHistory?: boolean; // Se tem histórico de divergência
}

// --- NEW TYPES FOR READINGS SCREEN ---

export interface ReadingNozzle {
  id: string;
  number: string;
  product: string;
  productColorClass: string;
  tank: string;
  initialReading: number;
  price: number;
}

export interface ReadingPump {
  id: string;
  name: string;
  nozzles: ReadingNozzle[];
}

// --- NEW TYPES FOR SALES ANALYSIS SCREEN ---

export interface SalesAnalysisProduct {
  id: string;
  name: string;
  code: string;
  colorClass: string; // e.g. bg-red-100 text-red-700
  bicos: string;
  readings: {
    start: number;
    end: number;
  };
  volume: number;
  price: number;
  total: number;
  profit: number;
}

export interface SalesProfitability {
  name: string;
  value: number;
  percentage: number;
  margin: number;
  color: string; // Hex for progress bar
}

// --- NEW TYPES FOR SALES DASHBOARD ---

export interface SalesEvolutionData {
  month: string;
  volume: number;
  isCurrent?: boolean;
}

export interface ProductMixData {
  name: string;
  volume: number;
  percentage: number;
  color: string;
}

// --- NEW TYPES FOR ATTENDANT MANAGEMENT ---

export interface AttendantProfile {
  id: string;
  name: string;
  initials: string;
  phone: string;
  shift: string; // Simplificado: 'Dia', 'Aberto', etc.
  status: 'Ativo' | 'Inativo';
  admissionDate: string;
  sinceDate: string; // e.g., "Jan 2022"
  cpf: string;
  divergenceRate: number;
  riskLevel: 'Baixo Risco' | 'Médio Risco' | 'Alto Risco';
  avatarColorClass: string;
  email: string;
  posto_id: number;
}

export interface AttendantHistoryEntry {
  id: string;
  date: string;
  shift: string;
  value: number;
  status: 'OK' | 'Divergente';
}

// --- NEW TYPES FOR SETTINGS SCREEN ---

export interface ProductConfig {
  id: string;
  name: string;
  type: 'Combustível' | 'Biocombustível' | 'Diesel';
  price: number;
}

export interface NozzleConfig {
  id: string;
  number: string;
  productName: string;
  tankSource: string;
}



export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outros';
  tax: number;
  active: boolean;
}

// --- NEW TYPES FOR MOBILE APP (REACT NATIVE) ---

export interface MobileAuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    role: 'admin' | 'manager' | 'attendant';
    avatar: string;
  };
}

export interface MobileNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'alert' | 'info' | 'success';
}

export interface MobileHomeData {
  totalSalesToday: number;
  pendingClosings: number;
  alertsCount: number;
  recentNotifications: MobileNotification[];
  quickStats: {
    label: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
  }[];
}

// --- NEW TYPES FOR LOAN MANAGEMENT ---

export interface Loan {
  id: string;
  credor: string;
  valorTotal: number;
  quantidadeParcelas: number;
  valorParcela: number;
  dataEmprestimo: string;
  dataPrimeiroVencimento: string;
  periodicidade: 'mensal' | 'quinzenal' | 'semanal' | 'diario';
  taxaJuros?: number;
  observacoes?: string;
  ativo: boolean;
  parcelas?: LoanInstallment[];
}

export interface LoanInstallment {
  id: string;
  emprestimoId: string;
  numeroParcela: number;
  dataVencimento: string;
  valor: number;
  dataPagamento?: string | null;
  status: 'pendente' | 'pago' | 'atrasado';
  jurosMulta?: number;
}

// --- NEW TYPES FOR FINANCE & SOLVENCY ---

export interface Divida {
  id: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  status: 'pendente' | 'pago';
  posto_id: number;
}

export interface Despesa {
  id: string;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  status: 'pendente' | 'pago';
  posto_id: number;
  data_pagamento?: string | null;
  observacoes?: string;
}

export interface SolvencyStatus {
  dividaId: string;
  descricao: string;
  valor: number;
  dataVencimento: string;
  status: 'verde' | 'amarelo' | 'vermelho';
  mensagem: string;
  deficitProjetado?: number;
  diasAteVencimento: number;
  coberturaPorcentagem: number;
}

export interface SolvencyProjection {
  saldoAtual: number;
  mediaDiaria: number;
  proximasParcelas: SolvencyStatus[];
  metaVendas?: {
    totalCompromissos: number;
    litrosNecessarios: number;
    margemPorLitro: number;
    litrosVendidosMes: number;
    lucroGeradoMes: number;
    progressoPorcentagem: number;
    valorRestante: number;
  };
}
