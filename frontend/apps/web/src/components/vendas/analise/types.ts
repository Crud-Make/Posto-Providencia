export interface ProductData {
  id: string;
  name: string;
  code: string;
  colorClass: string;
  bicos: string;
  readings: { start: number; end: number };
  volume: number;
  price: number;
  /** CMV (litros × custo do mês). `null` = produto sem compra no mês. */
  cost: number | null;
  total: number;
  profit: number | null;
  margin: number | null;
  suggestedPrice?: number | null;
  expensePerLiter?: number;
  avgCost?: number | null;
}

export interface ProfitabilityData {
  name: string;
  value: number;
  percentage: number;
  margin: number;
  color: string;
}

export interface Totals {
  volume: number;
  revenue: number;
  /** `null` = algum produto vendido sem compra no mês. */
  profit: number | null;
  avgMargin: number | null;
  avgProfitPerLiter: number | null;
}

export interface PeriodData {
  volume: number;
  revenue: number;
  profit: number;
}

export interface Insight {
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
}
