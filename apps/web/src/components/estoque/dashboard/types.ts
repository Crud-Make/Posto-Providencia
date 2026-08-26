import type { Tanque as TanqueDoBanco } from '../../../services/api/tanque.service';

/**
 * Tanque como a tela o vê: `estoque_atual` DERIVADO (régua + compras − vendas),
 * nunca a coluna carimbada de `Tanque`. Ver `model/estoque-derivado.ts`.
 */
export type Tanque = Omit<TanqueDoBanco, 'estoque_atual'> & {
  estoque_atual: number;
  /** `false` quando o tanque nunca teve régua — o `estoque_atual` é 0 só para a UI não quebrar. */
  medido: boolean;
};

export interface TankHistoryEntry {
  id: number;
  data: string;
  volume_livro?: number;
  volume_fisico?: number;
}

export interface TankHistory {
  [key: number]: TankHistoryEntry[];
}

export interface MedicaoFormData {
  valor: string;
  observacao: string;
}
