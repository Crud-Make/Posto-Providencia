import { Posto } from '../../types/database/index';

/**
 * Resumo financeiro consolidado para um período específico.
 */
export interface ResumoFinanceiro {
  vendas: number;
  lucroEstimado: number;
  dividas: number;
  despesas: number;
  emprestimos: number;
  frentistasAtivos: number;
  margemMedia: number;
}

/**
 * Estrutura completa de dados do dashboard.
 */
export interface DadosDashboard {
  hoje: ResumoFinanceiro;
  mes: ResumoFinanceiro;
  posto: Posto;
  postosSummary: PostoSummary[];
  alertas: AlertaDashboard[];
  ultimaAtualizacao: string;
}

/**
 * Resumo individual por posto (legado, mantido para compatibilidade).
 */
export interface PostoSummary {
  posto: Posto;
  vendasHoje: number;
  vendasMes: number;
  lucroEstimadoHoje: number;
  lucroEstimadoMes: number;
  margemMedia: number;
  frentistasAtivos: number;
  dividasTotal: number;
  despesasPendentes: number;
  ultimoFechamento: string | null;
}

/**
 * Alerta gerado pelo sistema.
 */
export interface AlertaDashboard {
  type: 'warning' | 'danger' | 'info' | 'success';
  posto: string;
  message: string;
}

export type PeriodoFiltro = 'hoje' | 'semana' | 'mes';
