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
import { useDespesaDoMes } from './hooks/useDespesaDoMes';
import { fornecedorService } from '../../services/api';
import { Database } from '../../types/database/index';
import type { ApiResponse } from '../../types/ui/response-types';
import { isSuccess } from '../../types/ui/response-types';
import { Save, AlertCircle } from 'lucide-react';
import { intervaloDoMes, ehMesCorrente, hojeIso, mesAtualIso } from '../../utils/periodo';

type Fornecedor = Database['public']['Tables']['Fornecedor']['Row'];

/**
 * Fornecedor padrão da tela: o ÚLTIMO com que este posto finalizou uma compra
 * (lembrado no localStorage), não o primeiro da lista — o posto compra quase
 * sempre do mesmo, e "o primeiro" era só ordem alfabética. Cai para o primeiro
 * quando nunca houve compra ou quando o lembrado saiu do cadastro.
 */
const chaveFornecedorPadrao = (postoId: number) => `registro_compras_fornecedor_padrao_${postoId}`;

function fornecedorPadrao(fornecedores: Fornecedor[], postoId: number | null): number | null {
    if (fornecedores.length === 0) return null;
    try {
        const lembrado = postoId ? Number(localStorage.getItem(chaveFornecedorPadrao(postoId))) : 0;
        if (lembrado && fornecedores.some(f => f.id === lembrado)) return lembrado;
    } catch { /* storage indisponível: usa o primeiro */ }
    return fornecedores[0].id;
}

function lembrarFornecedor(postoId: number | null, fornecedorId: number | null): void {
    if (!postoId || !fornecedorId) return;
    try { localStorage.setItem(chaveFornecedorPadrao(postoId), String(fornecedorId)); } catch { /* sem storage, sem memória */ }
}

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
    const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
    const [fornecedorSelecionado, setFornecedorSelecionado] = useState<number | null>(null);
    const [dadosRestaurados, setDadosRestaurados] = useState(false);
    // A tela é MENSAL, como o bloco de resumo da planilha: a compra de hoje
    // entra no custo do mês inteiro, e as vendas são o mês consolidado.
    const [mes, setMes] = useState<string>(() => mesAtualIso());

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
        setCombustiveis,
        vendasBicos,
        ultimoDiaFechado
    } = useCombustiveisHibridos(mes);
    
    // Refs para persistência
    const combustiveisRef = useRef(combustiveis);
    const fornecedorRef = useRef(fornecedorSelecionado);

    // Atualizar refs quando estado mudar
    useEffect(() => {
        combustiveisRef.current = combustiveis;
    }, [combustiveis]);

    useEffect(() => {
        fornecedorRef.current = fornecedorSelecionado;
    }, [fornecedorSelecionado]);

    // Salvar estado antes de sair da página ou desmontar
    useEffect(() => {
        const handleBeforeUnload = () => {
            salvarEstado(combustiveisRef.current, fornecedorRef.current);
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                salvarEstado(combustiveisRef.current, fornecedorRef.current);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            // Salvar ao desmontar
            salvarEstado(combustiveisRef.current, fornecedorRef.current);
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

        if (dadosSalvos && Object.keys(dadosSalvos.digitados).length > 0) {
            // Só os campos digitados voltam; o que veio do banco fica fresco.
            setCombustiveis(prev => prev.map(c => ({ ...c, ...(dadosSalvos.digitados[c.id] ?? {}) })));

            // Restaurar fornecedor se ainda existir na lista
            if (dadosSalvos.fornecedorSelecionado && fornecedores.some(f => f.id === dadosSalvos.fornecedorSelecionado)) {
                setFornecedorSelecionado(dadosSalvos.fornecedorSelecionado);
            } else if (fornecedores.length > 0 && !fornecedorSelecionado) {
                setFornecedorSelecionado(fornecedorPadrao(fornecedores, postoAtivoId));
            }

            setDadosRestaurados(true);
            console.log('[Compras] Dados restaurados do sessionStorage');
        } else if (fornecedores.length > 0 && !fornecedorSelecionado) {
            // Sem dados salvos, apenas setar fornecedor padrão
            setFornecedorSelecionado(fornecedorPadrao(fornecedores, postoAtivoId));
            setDadosRestaurados(true);
        }
    }

    // A despesa do mês vem do banco (tabela `Despesa`), não de um campo digitado:
    // é a mesma fonte que a Planilha do Mês rateia, para as duas telas nunca
    // divergirem no "Valor p/ Venda".
    const despesaDoMes = useDespesaDoMes(postoAtivoId, mes);
    const calculos = useCalculosRegistro(combustiveis, despesaDoMes);

    const { saving, salvarDados } = usePersistenciaRegistro(postoAtivoId, async () => {
        // On Success
        lembrarFornecedor(postoAtivoId, fornecedorRef.current);
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
        // No mês corrente a compra é de hoje; em mês passado (replay), do último dia dele.
        const hoje = hojeIso();
        const dataCompra = ehMesCorrente(mes, hoje) ? hoje : intervaloDoMes(mes, hoje).fim;
        salvarDados(combustiveis, calculos.calcEstoqueHoje, fornecedorSelecionado, dataCompra);
    };

    // Há alterações não salvas?
    //
    // [2026-07-26] Antes era `useState` + `useEffect` sincronizando a cada
    // mudança de `combustiveis` (mesmo problema de
    // `set-state-in-effect` do bloco de restauração acima). Só existiam 3
    // gatilhos externos ao efeito automático: marcar `true` ao editar (redundante,
    // já é o que o efeito calculava sozinho a partir de `combustiveis`),
    // marcar `true` ao restaurar (idem, redundante) e marcar `false` logo após
    // salvar — este último é o único caso real: `salvarDados` só limpa
    // `compra_lt`/`compra_rs`, então `combustiveis` ainda contém `inicial`/
    // `fechamento` até o `loadData()` (disparado dentro do próprio `onSuccess`
    // acima) terminar de repor os valores em branco. Por isso o valor é
    // derivado direto de `combustiveis`, suprimido enquanto
    // `saving` for true — e `saving` só volta a `false` depois que `onSuccess`
    // (incluindo o `await loadData()`) termina, cobrindo exatamente essa janela.
    const temAlteracoes = !saving && (
        combustiveis.some(c => c.compra_lt || c.compra_rs || c.estoque_tanque)
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
                    mes={mes}
                    onMesChange={setMes}
                />

                <SecaoVendas
                    combustiveis={combustiveis}
                    vendasBicos={vendasBicos}
                    calculos={calculos}
                    totais={calculos.totais}
                    ultimoDiaFechado={ultimoDiaFechado}
                    diasNoMes={Number(intervaloDoMes(mes, `${mes}-31`).fim.slice(8, 10))}
                />

                <SecaoCompras
                    combustiveis={combustiveis}
                    updateCombustivel={updateCombustivel}
                    calculos={calculos}
                    totais={calculos.totais}
                    saving={saving}
                    onSave={handleSave}
                    fornecedores={fornecedores}
                    fornecedorSelecionado={fornecedorSelecionado}
                    setFornecedorSelecionado={setFornecedorSelecionado}
                    despesaDoMes={despesaDoMes}
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
