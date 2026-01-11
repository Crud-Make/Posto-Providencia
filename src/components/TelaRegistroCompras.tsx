import React, { useState, useEffect } from 'react';
import { usePosto } from '../contexts/PostoContext';
import { useCombustiveisHibridos } from '../hooks/registro-compras/useCombustiveisHibridos';
import { useCalculosRegistro } from '../hooks/registro-compras/useCalculosRegistro';
import { usePersistenciaRegistro } from '../hooks/registro-compras/usePersistenciaRegistro';
import { HeaderRegistroCompras } from './registro-compras/HeaderRegistroCompras';
import { SecaoVendas } from './registro-compras/SecaoVendas';
import { SecaoCompras } from './registro-compras/SecaoCompras';
import { SecaoEstoque } from './registro-compras/SecaoEstoque';
import { fornecedorService } from '../services/api';
import { Database } from '../types/database/index';

type Fornecedor = Database['public']['Tables']['Fornecedor']['Row'];

const TelaRegistroCompras: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [despesasMes, setDespesasMes] = useState<string>('');
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [fornecedorSelecionado, setFornecedorSelecionado] = useState<number | null>(null);

    // Carregar Fornecedores
    useEffect(() => {
        if (postoAtivoId) {
            fornecedorService.getAll(postoAtivoId).then(data => {
                setFornecedores(data);
                // Selecionar o primeiro por padrão se houver, ou manter null
                if (data.length > 0 && !fornecedorSelecionado) {
                    setFornecedorSelecionado(data[0].id);
                }
            }).catch(console.error);
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
            <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

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
