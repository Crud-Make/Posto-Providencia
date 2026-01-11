import { Despesa as DBDespesa } from '../../types/index';

export type Despesa = DBDespesa;

export interface DespesaFormData {
    descricao: string;
    categoria: string;
    valor: number;
    data: string;
    status: 'pendente' | 'pago';
    data_pagamento: string | null;
    observacoes: string;
    posto_id: number;
}

export const CATEGORIAS_DESPESA = [
    'Aluguel',
    'Energia Elétrica',
    'Água e Saneamento',
    'Internet/Telefone',
    'Folha de Pagamento',
    'Encargos Sociais',
    'Manutenção',
    'Limpeza',
    'Impostos',
    'Marketing',
    'Seguros',
    'Contabilidade',
    'Outros'
];
