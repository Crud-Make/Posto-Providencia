import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { clienteService } from '../../../services/api';
import { ClienteComSaldo, ClientesResumoData } from '../types';

const INITIAL_RESUMO: ClientesResumoData = {
    totalClientes: 0,
    totalDevedores: 0,
    valorTotalPendente: 0
};

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
            const data = await clienteService.getAllWithSaldo(postoId);
            // Ordenar por nome
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
