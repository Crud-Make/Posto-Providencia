/**
 * Tipos para o módulo de Leituras Diárias
 * 
 * @author Sistema de Gestão - Posto Providência
 * @version 1.0.0
 */

import type { Bomba } from '../../types/database';
import type { BicoComDetalhes } from '../../types/fechamento';

/**
 * Grupo de bombas para visualização
 */
export interface PumpGroup {
  bomba: Bomba;
  bicos: BicoComDetalhes[];
}

/**
 * Cores para combustíveis (Tailwind CSS classes)
 */
export const FUEL_COLORS: Record<string, string> = {
  'GC': 'bg-red-100 text-red-700',
  'GA': 'bg-blue-100 text-blue-700',
  'ET': 'bg-green-100 text-green-700',
  'S10': 'bg-yellow-100 text-yellow-700',
  'DIESEL': 'bg-amber-100 text-amber-700',
};

/**
 * Filtro de data para leituras
 */
export interface FiltroLeituras {
  data: string;
}
