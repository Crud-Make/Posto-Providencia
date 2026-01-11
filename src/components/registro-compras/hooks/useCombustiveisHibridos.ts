import { useState, useEffect } from 'react';
import { combustivelService, estoqueService, tanqueService } from '../../../services/api';
import { Combustivel, Tanque } from '../../../types/database/index';
import { usePosto } from '../../../contexts/PostoContext';
import { formatarParaBR } from '../../../utils/formatters';

/**
 * Tipo que representa um combustível com estado híbrido (string para inputs e numeric para cálculos).
 */
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

/**
 * Hook para gerenciar o estado dos combustíveis na tela de registro de compras.
 * Carrega dados iniciais do banco e provê funções de atualização de estado.
 * 
 * @returns Objeto contendo estado dos combustíveis, funções de carregamento e atualização.
 */
export const useCombustiveisHibridos = () => {
    const { postoAtivoId } = usePosto();
    const [loading, setLoading] = useState(true);
    const [combustiveis, setCombustiveis] = useState<CombustivelHibrido[]>([]);

    /** Carrega todos os dados necessários (combustíveis, estoques e tanques) */
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

    /** Atualiza um campo específico de um combustível no estado local */
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

