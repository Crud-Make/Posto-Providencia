/**
 * Tela de Registro de Compras.
 *
 * @remarks
 * Consolida vendas, compras e estoque; permite selecionar fornecedor para persistência do registro.
 */
import React, { useState, useEffect } from 'react';
import { usePosto } from '../../contexts/PostoContext';
import { useCombustiveisHibridos } from './hooks/useCombustiveisHibridos';
import { useCalculosRegistro } from './hooks/useCalculosRegistro';
import { usePersistenciaRegistro } from './hooks/usePersistenciaRegistro';
import { HeaderRegistroCompras } from './HeaderRegistroCompras';
import { SecaoVendas } from './SecaoVendas';
import { SecaoCompras } from './SecaoCompras';
import { SecaoEstoque } from './SecaoEstoque';
import { fornecedorService } from '../../services/api';
import { Database } from '../../types/database/index';
import type { ApiResponse } from '../../types/ui/response-types';
import { isSuccess } from '../../types/ui/response-types';

type Fornecedor = Database['public']['Tables']['Fornecedor']['Row'];

/**
 * Extrai o `data` de uma `ApiResponse` com mensagem de erro consistente.
 *
 * @param response - Resposta retornada pelos services
 */
function extractApiData<T>(response: ApiResponse<T>): T {
    if (isSuccess(response)) return response.data;
    throw new Error(response.error || 'Erro ao buscar dados do serviço');
}

const TelaRegistroCompras: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [despesasMes, setDespesasMes] = useState<string>('');
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [fornecedorSelecionado, setFornecedorSelecionado] = useState<number | null>(null);

    // Carregar Fornecedores
    useEffect(() => {
        if (postoAtivoId) {
            // [18/01 10:45] Ajustado para extrair payload de `ApiResponse` e evitar `map is not a function`.
            fornecedorService.getAll(postoAtivoId).then((res) => {
                const data = extractApiData(res as ApiResponse<Fornecedor[]>);
                setFornecedores(data);
                // Selecionar o primeiro por padrão se houver, ou manter null
                if (data.length > 0 && !fornecedorSelecionado) {
                    setFornecedorSelecionado(data[0].id);
                }
            }).catch((error) => {
                setFornecedores([]);
                console.error(error);
            });
        }
    }, [postoAtivoId]);

    // Hooks
    const {
        combustiveis,
        loading,
        loadData,
        updateCombustivel,
        setCombustiveis
    } = useCombustiveisHibridos();

    const calculos = useCalculosRegistro(combustiveis, despesasMes);

    const { saving, salvarDados } = usePersistenciaRegistro(postoAtivoId, async () => {
        // On Success
        setCombustiveis(prev => prev.map(c => ({
            ...c,
            compra_lt: '',
            compra_rs: ''
        })));
        await loadData();
    });

    const handleSave = () => {
        salvarDados(combustiveis, calculos.calcEstoqueHoje, fornecedorSelecionado);
    };

    return (
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 h-screen overflow-y-auto custom-scrollbar">
            <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                <HeaderRegistroCompras
                    onRefresh={loadData}
                    loading={loading}
                />

                <SecaoVendas
                    combustiveis={combustiveis}
                    updateCombustivel={updateCombustivel}
                    calculos={calculos}
                    totais={calculos.totais}
                />

                <SecaoCompras
                    combustiveis={combustiveis}
                    updateCombustivel={updateCombustivel}
                    calculos={calculos}
                    totais={calculos.totais}
                    despesasMes={despesasMes}
                    setDespesasMes={setDespesasMes}
                    saving={saving}
                    onSave={handleSave}
                    fornecedores={fornecedores}
                    fornecedorSelecionado={fornecedorSelecionado}
                    setFornecedorSelecionado={setFornecedorSelecionado}
                />

                <SecaoEstoque
                    combustiveis={combustiveis}
                    updateCombustivel={updateCombustivel}
                    calculos={calculos}
                    totais={calculos.totais}
                />

            </main>
        </div>
    );
};

export default TelaRegistroCompras;
