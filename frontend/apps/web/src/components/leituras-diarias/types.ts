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
 * Filtro de data para leituras
 */
export interface FiltroLeituras {
  data: string;
}
