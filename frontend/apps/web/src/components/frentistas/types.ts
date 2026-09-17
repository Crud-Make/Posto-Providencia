/**
 * Tipos para o módulo de Gestão de Frentistas
 * 
 * @author Sistema de Gestão - Posto Providência
 */

export interface PerfilFrentista {
    id: string;
    nome: string;
    status: 'Ativo' | 'Inativo';
    dataAdmissao: string;
    email?: string;
    telefone?: string;
    postoId?: number;
    /**
     * Avatar em data URL JPEG, vindo da coluna `Frentista.foto`.
     *
     * @remarks Quem põe é o próprio frentista, no PWA dele. Não há sincronização
     *          nenhuma entre os dois: é a mesma linha do banco, e o painel só
     *          precisa pedir a coluna. Nulo = mostra as iniciais.
     */
    foto?: string | null;
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
    data_admissao: string;
    ativo: boolean;
}
