import { Bico, Bomba, Combustivel } from '../../services/database.types';

export type BicoWithDetails = Bico & { bomba: Bomba; combustivel: Combustivel };

export interface PaymentEntry {
   id: number;
   nome: string;
   tipo: string;
   valor: string;
   taxa: number;
}

export interface FrentistaSession {
   tempId: string;
   frentistaId: number | null;
   valor_cartao: string;
   valor_cartao_debito: string;
   valor_cartao_credito: string;
   valor_nota: string;
   valor_pix: string;
   valor_dinheiro: string;
   valor_baratao: string;
   valor_encerrante: string;
   valor_conferido: string;
   observacoes: string;
   valor_produtos: string;
   status?: 'pendente' | 'conferido';
   data_hora_envio?: string;
}
