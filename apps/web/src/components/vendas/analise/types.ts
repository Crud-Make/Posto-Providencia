export interface ProductData {
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
  profit: number;
  avgMargin: number;
  avgProfitPerLiter: number;
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
