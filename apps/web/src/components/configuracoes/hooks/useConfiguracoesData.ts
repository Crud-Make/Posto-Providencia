// [10/01 17:46] Criado durante refatoração Issue #16
import { useState, useEffect, useCallback } from 'react';
import { fetchSettingsData } from '../../../services/api';
import { usePosto } from '../../../contexts/PostoContext';
import { Produto, Bico, FormaPagamento } from '../types';

/**
 * Hook para carregar dados iniciais da tela de configurações.
 * Carrega produtos, bicos e formas de pagamento.
 * 
 * @returns {Object} Dados carregados e estado de loading
 */
export const useConfiguracoesData = () => {
    const { postoAtivoId } = usePosto();
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState<Produto[]>([]);
    const [nozzles, setNozzles] = useState<Bico[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<FormaPagamento[]>([]);

    const loadData = useCallback(async () => {
        if (!postoAtivoId) return;

        setLoading(true);
        try {
            const data = await fetchSettingsData(postoAtivoId);
            setProducts(data?.products || []);
            setNozzles(data?.nozzles || []);
            setPaymentMethods(data?.paymentMethods || []);
        } catch (error) {
            console.error("Failed to fetch settings", error);
        } finally {
            setLoading(false);
        }
    }, [postoAtivoId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
        products,
        nozzles,
        paymentMethods,
        setPaymentMethods, // Exportado para permitir atualizações locais pelo useFormaPagamento
        loading,
        refetch: loadData
    };
};
