import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { clienteService } from '../../../services/api';
import { ClienteComSaldo, ClientesResumoData } from '../types';
import type { ApiResponse } from '../../../types/ui/response-types';
import { isSuccess } from '../../../types/ui/response-types';
import type { ClienteComNotas } from '../../../services/api/cliente.service';

const INITIAL_RESUMO: ClientesResumoData = {
    totalClientes: 0,
    totalDevedores: 0,
    valorTotalPendente: 0
};

function extractApiData<T>(response: ApiResponse<T>): T {
    if (isSuccess(response)) return response.data;
    throw new Error(response.error || 'Erro ao buscar dados do serviço');
}

/**
 * Hook para gerenciar dados de clientes.
 * Carrega clientes com saldo, calcula resumo e gerencia estado de loading.
 */
export function useClientesData(postoId: number | undefined) {
    const [clientes, setClientes] = useState<ClienteComSaldo[]>([]);
    const [loading, setLoading] = useState(true);
    const [resumo, setResumo] = useState<ClientesResumoData>(INITIAL_RESUMO);

    const loadClientes = useCallback(async () => {
        if (!postoId) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        try {
            const response = (await clienteService.getAllWithSaldo(postoId)) as ApiResponse<ClienteComNotas[]>;
            const data = extractApiData(response);

            const sorted = (data as ClienteComSaldo[]).sort((a, b) => a.nome.localeCompare(b.nome));
            setClientes(sorted);

            // Calcular resumo
            const devedores = sorted.filter((c) => c.saldo_devedor > 0);
            const totalPendente = devedores.reduce((acc, curr) => acc + curr.saldo_devedor, 0);

            setResumo({
                totalClientes: sorted.length,
                totalDevedores: devedores.length,
                valorTotalPendente: totalPendente
            });
        } catch (error) {
            console.error('Erro ao carregar clientes:', error);
            toast.error('Erro ao carregar lista de clientes');
        } finally {
            setLoading(false);
        }
    }, [postoId]);

    useEffect(() => {
        loadClientes();
    }, [loadClientes]);

    return {
        clientes,
        loading,
        resumo,
        refreshClientes: loadClientes
    };
}
