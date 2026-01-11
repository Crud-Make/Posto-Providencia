import { Combustivel } from '../../../types/database/index';

export interface SalesSummary {
  totalLitros: number;
  totalVendas: number;
  porCombustivel: {
    combustivel: Combustivel;
    litros: number;
    valor: number;
  }[];
}

export interface MonthlyData {
  month: string;
  volume: number;
  isCurrent?: boolean;
}

export interface ProductMixItem {
  name: string;
  codigo: string;
  volume: number;
  percentage: number;
  color: string;
}
