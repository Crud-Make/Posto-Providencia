/**
 * Tipos e interfaces para o módulo de Fechamento Diário
 *
 * @remarks
 * Centraliza todas as definições de tipos relacionadas ao fechamento
 * para facilitar manutenção e reutilização
 *
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

import type { Bico, Bomba, Combustivel, Frentista } from './database/index';

export type { Frentista };

/**
 * Bico com dados relacionados (bomba + combustível)
 *
 * @remarks
 * Tipo composto que inclui informações completas da bomba e combustível
 * para facilitar renderização e cálculos
 */
export type BicoComDetalhes = Bico & {
  bomba: Bomba;
  combustivel: Combustivel;
};

/**
 * Entrada de pagamento vinculada à configuração do banco de dados
 *
 * @remarks
 * Representa uma forma de pagamento configurada no sistema
 * com seu valor atual e taxa aplicável
 */
export interface EntradaPagamento {
  readonly id: number; // ID do banco de dados
  nome: string; // Nome da forma de pagamento (PIX, Dinheiro, etc)
  tipo: string; // Tipo da forma de pagamento
  valor: string; // Valor em formato brasileiro (1.234,56)
  taxa: number; // Taxa percentual aplicada
}

/**
 * Sessão local de fechamento por frentista
 *
 * @remarks
 * Armazena todos os valores recebidos por um frentista durante o turno
 * Permite adicionar múltiplos frentistas dinamicamente
 */
export interface SessaoFrentista {
  readonly tempId: string; // ID temporário único para controle local
  frentistaId: number | null; // ID do frentista selecionado
  valor_cartao: string; // Valor total em cartão (legado)
  valor_cartao_debito: string; // Valor em cartão de débito
  valor_cartao_credito: string; // Valor em cartão de crédito
  valor_nota: string; // Valor em nota/vale
  valor_pix: string; // Valor em PIX
  valor_dinheiro: string; // Valor em dinheiro
  valor_baratao: string; // Valor do baratão
  valor_encerrante: string; // Valor total dos encerrantes
  valor_conferido: string; // Valor total conferido
  observacoes: string; // Observações sobre o fechamento
  valor_produtos: string; // Valor de produtos vendidos
  status?: 'pendente' | 'conferido'; // Status do fechamento
  data_hora_envio?: string; // Data e hora do envio pelo app
}

/**
 * Cores para visualização de combustíveis
 *
 * @remarks
 * Mapeia tipos de combustível para cores do Tailwind CSS
 * GC=Vermelho, GA=Azul, ET=Verde, S10=Amarelo, DIESEL=Âmbar
 */
export const CORES_COMBUSTIVEL: Record<string, { bg: string; text: string; border: string }> = {
  'GC': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  'GA': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  'ET': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  'S10': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  'DIESEL': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
};

/**
 * Cores para gráficos de combustível
 *
 * @remarks
 * Cores em hexadecimal para uso em gráficos (Recharts)
 * Sincronizadas com as cores de visualização
 */
export const CORES_GRAFICO_COMBUSTIVEL: Record<string, string> = {
  'GC': '#EF4444', // vermelho-500
  'GA': '#3B82F6', // azul-500
  'ET': '#22C55E', // verde-500
  'S10': '#EAB308', // amarelo-500
  'DIESEL': '#F59E0B', // âmbar-500
};

/**
 * Cores para gráficos de formas de pagamento
 *
 * @remarks
 * Array de cores variadas para diferenciar formas de pagamento
 * em gráficos de pizza e barras
 */
export const CORES_GRAFICO_PAGAMENTO = [
  '#3B82F6', // azul-500
  '#8B5CF6', // violeta-500
  '#EC4899', // rosa-500
  '#F97316', // laranja-500
  '#10B981', // esmeralda-500
  '#6366F1', // índigo-500
  '#14B8A6', // turquesa-500
];

/**
 * Turnos padrão do sistema
 *
 * @remarks
 * Definição padrão dos turnos quando não há configuração personalizada
 * Usado como fallback se o banco não retornar turnos
 */
// [20/01 10:00] Correção de tipagem em TURNOS_PADRAO
// Motivo: Adicionado posto_id: 0 para satisfazer a interface Turno
export const TURNOS_PADRAO = [
  { id: 1, nome: 'Manhã', horario_inicio: '06:00', horario_fim: '14:00', ativo: true, posto_id: 0 },
  { id: 2, nome: 'Tarde', horario_inicio: '14:00', horario_fim: '22:00', ativo: true, posto_id: 0 },
  { id: 3, nome: 'Noite', horario_inicio: '22:00', horario_fim: '06:00', ativo: true, posto_id: 0 },
];
