import { useState, useEffect } from 'react';
import { combustivelService, estoqueService } from '../../services/api';
import { tanqueService } from '../../services/tanqueService';
import { usePosto } from '../../contexts/PostoContext';
import { formatarParaBR } from '../../utils/formatters';

export type CombustivelHibrido = {
    id: number;
    nome: string;
    codigo: string;
    // Campos de VENDA
    inicial: string;            // Leitura inicial
    fechamento: string;         // Leitura final
    preco_venda_atual: string;  // Preço de venda PRATICADO (G5 na planilha)
    // Campos de COMPRA
    compra_lt: string;          // Litros comprados
    compra_rs: string;          // Valor total da compra
    estoque_anterior: string;   // Estoque ano passado (J na planilha)
    estoque_tanque: string;     // Medição física do tanque (N na planilha)
    tanque_id?: number;
    preco_custo_cadastro: number; // Preço de custo atual no cadastro
};

export const useCombustiveisHibridos = () => {
    const { postoAtivoId } = usePosto();
    const [loading, setLoading] = useState(true);
    const [combustiveis, setCombustiveis] = useState<CombustivelHibrido[]>([]);

    const loadData = async () => {
        if (!postoAtivoId) return;

        try {
            setLoading(true);
            const [data, estoques, tanques] = await Promise.all([
                combustivelService.getAll(postoAtivoId),
                estoqueService.getAll(postoAtivoId),
                tanqueService.getAll(postoAtivoId)
            ]);

            const mapped: CombustivelHibrido[] = data.map(c => {
                const est = estoques.find(e => e.combustivel_id === c.id);
                const tanque = tanques.find(t => t.combustivel_id === c.id);

                return {
                    id: c.id,
                    nome: c.nome,
                    codigo: c.codigo,
                    inicial: '',
                    fechamento: '',
                    preco_venda_atual: formatarParaBR(c.preco_venda || 0),
                    compra_lt: '',
                    compra_rs: '',
                    estoque_anterior: tanque ? formatarParaBR(tanque.estoque_atual) : (est ? formatarParaBR(est.quantidade_atual) : '0,000'),
                    estoque_tanque: '',
                    tanque_id: tanque?.id,
                    preco_custo_cadastro: c.preco_custo || 0
                };
            });
            setCombustiveis(mapped);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [postoAtivoId]);

    const updateCombustivel = (id: number, field: keyof CombustivelHibrido, value: string) => {
        setCombustiveis(prev => prev.map(c => {
            if (c.id === id) {
                return { ...c, [field]: value };
            }
            return c;
        }));
    };

    return {
        combustiveis,
        setCombustiveis,
        loading,
        loadData,
        updateCombustivel
    };
};
