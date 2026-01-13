import { Tanque } from '../../../services/api/tanque.service';

export type { Tanque };

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
