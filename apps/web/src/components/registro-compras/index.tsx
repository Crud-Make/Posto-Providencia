/**
 * Tela de Registro de Compras.
 *
 * @remarks
 * Consolida vendas, compras e estoque; permite selecionar fornecedor para persistência do registro.
 * [01/02 15:00] Adicionada persistência de estado no sessionStorage para evitar perda de dados ao navegar.
 */
import React, { useState, useEffect, useRef } from 'react';
import { usePosto } from '../../contexts/usePosto';
import { useCombustiveisHibridos } from './hooks/useCombustiveisHibridos';
import { useCalculosRegistro } from './hooks/useCalculosRegistro';
import { usePersistenciaRegistro } from './hooks/usePersistenciaRegistro';
import { usePersistenciaFormulario } from './hooks/usePersistenciaFormulario';
import { HeaderRegistroCompras } from './HeaderRegistroCompras';
import { SecaoVendas } from './SecaoVendas';
import { SecaoCompras } from './SecaoCompras';
import { SecaoEstoque } from './SecaoEstoque';
import { fornecedorService } from '../../services/api';
import { Database } from '../../types/database/index';
import type { ApiResponse } from '../../types/ui/response-types';
import { isSuccess } from '../../types/ui/response-types';
import { Save, AlertCircle } from 'lucide-react';

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
    const [dadosRestaurados, setDadosRestaurados] = useState(false);

    // Hook de persistência
    const { salvarEstado, restaurarEstado, limparEstado } = usePersistenciaFormulario(postoAtivoId);

    // Carregar Fornecedores
    useEffect(() => {
        if (postoAtivoId) {
            fornecedorService.getAll(postoAtivoId).then((res) => {
                const data = extractApiData(res as ApiResponse<Fornecedor[]>);
                setFornecedores(data);
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
    
    // Refs para persistência
    const combustiveisRef = useRef(combustiveis);
    const despesasRef = useRef(despesasMes);
    const fornecedorRef = useRef(fornecedorSelecionado);

    // Atualizar refs quando estado mudar
    useEffect(() => {
        combustiveisRef.current = combustiveis;
    }, [combustiveis]);

    useEffect(() => {
        despesasRef.current = despesasMes;
    }, [despesasMes]);

    useEffect(() => {
        fornecedorRef.current = fornecedorSelecionado;
    }, [fornecedorSelecionado]);

    // Salvar estado antes de sair da página ou desmontar
    useEffect(() => {
        const handleBeforeUnload = () => {
            salvarEstado(combustiveisRef.current, despesasRef.current, fornecedorRef.current);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                salvarEstado(combustiveisRef.current, despesasRef.current, fornecedorRef.current);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            // Salvar ao desmontar
            salvarEstado(combustiveisRef.current, despesasRef.current, fornecedorRef.current);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [salvarEstado]);

    // Restaurar dados persistidos.
    //
    // [2026-07-26] Antes era um `useEffect`, mas chamar setState síncrono ali
    // dispara `react-hooks/set-state-in-effect` ("cascading renders"). Como a
    // decisão de restaurar depende de dois carregamentos assíncronos externos
    // (fetch de fornecedores + fetch/skip de combustíveis em
    // `useCombustiveisHibridos`), não dá pra calcular isso com `useMemo` — não
    // existe um valor derivado, é uma ação que só pode rodar quando ambos
    // terminarem. A saída é o padrão oficial do React para "ajustar estado
    // durante a renderização" (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes):
    // roda direto no corpo do componente, guardado por `dadosRestaurados` para
    // executar só uma vez. `restaurarEstado`/`setCombustiveis` são estáveis
    // (useCallback / setState), então não formam um array de deps a manter.
    if (!loading && !dadosRestaurados) {
        const dadosSalvos = restaurarEstado();

        if (dadosSalvos && dadosSalvos.combustiveis.length > 0) {
            // [01/02 15:35] Usar dados do sessionStorage diretamente
            setCombustiveis(dadosSalvos.combustiveis);
            setDespesasMes(dadosSalvos.despesasMes || '');

            // Restaurar fornecedor se ainda existir na lista
            if (dadosSalvos.fornecedorSelecionado && fornecedores.some(f => f.id === dadosSalvos.fornecedorSelecionado)) {
                setFornecedorSelecionado(dadosSalvos.fornecedorSelecionado);
            } else if (fornecedores.length > 0 && !fornecedorSelecionado) {
                setFornecedorSelecionado(fornecedores[0].id);
            }

            setDadosRestaurados(true);
            console.log('[Compras] Dados restaurados do sessionStorage');
        } else if (fornecedores.length > 0 && !fornecedorSelecionado) {
            // Sem dados salvos, apenas setar fornecedor padrão
            setFornecedorSelecionado(fornecedores[0].id);
            setDadosRestaurados(true);
        }
    }

    const calculos = useCalculosRegistro(combustiveis, despesasMes);

    const { saving, salvarDados } = usePersistenciaRegistro(postoAtivoId, async () => {
        // On Success
        setCombustiveis(prev => prev.map(c => ({
            ...c,
            compra_lt: '',
            compra_rs: ''
        })));
        limparEstado();
        setDadosRestaurados(false);
        await loadData();
    });

    const handleSave = () => {
        salvarDados(combustiveis, calculos.calcEstoqueHoje, fornecedorSelecionado);
    };

    // Há alterações não salvas?
    //
    // [2026-07-26] Antes era `useState` + `useEffect` sincronizando a cada
    // mudança de `combustiveis`/`despesasMes` (mesmo problema de
    // `set-state-in-effect` do bloco de restauração acima). Só existiam 3
    // gatilhos externos ao efeito automático: marcar `true` ao editar (redundante,
    // já é o que o efeito calculava sozinho a partir de `combustiveis`/`despesasMes`),
    // marcar `true` ao restaurar (idem, redundante) e marcar `false` logo após
    // salvar — este último é o único caso real: `salvarDados` só limpa
    // `compra_lt`/`compra_rs`, então `combustiveis` ainda contém `inicial`/
    // `fechamento` até o `loadData()` (disparado dentro do próprio `onSuccess`
    // acima) terminar de repor os valores em branco. Por isso o valor é
    // derivado direto de `combustiveis`/`despesasMes`, suprimido enquanto
    // `saving` for true — e `saving` só volta a `false` depois que `onSuccess`
    // (incluindo o `await loadData()`) termina, cobrindo exatamente essa janela.
    const temAlteracoes = !saving && (
        combustiveis.some(c =>
            c.inicial || c.fechamento || c.compra_lt || c.compra_rs || c.estoque_tanque
        ) || !!despesasMes
    );

    return (
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 h-screen overflow-y-auto custom-scrollbar">
            <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Alerta de alterações não salvas */}
                {temAlteracoes && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            <div>
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                    Alterações não salvas
                                </p>
                                <p className="text-xs text-amber-600 dark:text-amber-300">
                                    Os dados serão mantidos ao navegar para outras telas
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Save className="w-4 h-4" />
                            {saving ? 'Salvando...' : 'Salvar agora'}
                        </button>
                    </div>
                )}

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
