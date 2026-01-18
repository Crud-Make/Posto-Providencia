/**
 * Tipos para o módulo de Gestão de Frentistas
 * 
 * @author Sistema de Gestão - Posto Providência
 */

export interface PerfilFrentista {
    id: string;
    nome: string;
    cpf: string;
    status: 'Ativo' | 'Inativo';
    dataAdmissao: string;
    email?: string;
    telefone?: string;
    postoId?: number;
}

export interface HistoricoFrentista {
    id: string;
    data: string;
    turno: string;
    valor: number;
    status: 'OK' | 'Divergente';
}

export interface FiltroFrentistas {
    termo: string;
    status: 'Todos' | 'Ativo' | 'Inativo';
}

export interface DadosFormularioFrentista {
    nome: string;
    cpf: string;
    data_admissao: string;
    ativo: boolean;
}
