import { Tanque } from '../../../services/api/tanque.service';

export type { Tanque };

export interface TankHistory {
  [key: number]: any[];
}

export interface MedicaoFormData {
  valor: string;
  observacao: string;
}
