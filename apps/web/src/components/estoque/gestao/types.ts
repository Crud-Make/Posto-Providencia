import { Produto } from '../../../types/database/index';

export type { Produto };

export type MovementType = 'entrada' | 'saida' | 'ajuste';

export interface ProductFormData {
  nome: string;
  codigo_barras: string;
  categoria: string;
  preco_custo: number;
  preco_venda: number;
  estoque_minimo: number;
  unidade_medida: string;
  descricao: string;
  estoque_inicial?: number;
}

export interface MovementFormData {
  tipo: MovementType;
  quantidade: number;
  valor_unitario?: number;
  observacao: string;
}
