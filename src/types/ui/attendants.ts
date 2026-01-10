/**
 * Tipos relacionados a Frentistas.
 */

/**
 * Perfil completo de um frentista para gestão.
 */
export interface AttendantProfile {
    id: string;
    name: string;
    initials: string;
    phone: string;
    shift: string;
    status: 'Ativo' | 'Inativo';
    admissionDate: string;
    sinceDate: string;
    cpf: string;
    divergenceRate: number;
    riskLevel: 'Baixo Risco' | 'Médio Risco' | 'Alto Risco';
    avatarColorClass: string;
    email: string;
    posto_id: number;
}

/**
 * Entrada do histórico de fechamento de um frentista.
 */
export interface AttendantHistoryEntry {
    id: string;
    date: string;
    shift: string;
    value: number;
    status: 'OK' | 'Divergente';
}
