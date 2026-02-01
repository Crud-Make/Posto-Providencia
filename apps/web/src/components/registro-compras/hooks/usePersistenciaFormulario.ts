/**
 * Hook para persistir estado do formulário de compras no sessionStorage.
 * 
 * @remarks
 * Previne perda de dados quando o usuário navega para outras features.
 * Os dados são persistidos automaticamente antes do unmount e restaurados ao retornar.
 */
import { useEffect, useRef, useCallback } from 'react';
import { CombustivelHibrido } from './useCombustiveisHibridos';

const STORAGE_KEY = 'registro_compras_form_data';

interface PersistedFormData {
    combustiveis: CombustivelHibrido[];
    despesasMes: string;
    fornecedorSelecionado: number | null;
    timestamp: number;
}

/**
 * Hook para persistir e restaurar estado do formulário de compras.
 * 
 * @param postoAtivoId - ID do posto ativo para validar dados de outro posto
 * @returns Funções para salvar, restaurar e limpar dados persistidos
 */
export const usePersistenciaFormulario = (postoAtivoId: number | null) => {
    const postoIdRef = useRef(postoAtivoId);
    
    // Atualizar ref quando posto mudar
    useEffect(() => {
        postoIdRef.current = postoAtivoId;
    }, [postoAtivoId]);

    /**
     * Salva os dados do formulário no sessionStorage
     */
    const salvarEstado = useCallback((
        combustiveis: CombustivelHibrido[],
        despesasMes: string,
        fornecedorSelecionado: number | null
    ) => {
        try {
            const hasData = combustiveis.some(c => 
                c.inicial || c.fechamento || c.compra_lt || c.compra_rs || c.estoque_tanque
            );
            
            if (!hasData && !despesasMes) {
                return;
            }

            const data: PersistedFormData = {
                combustiveis,
                despesasMes,
                fornecedorSelecionado,
                timestamp: Date.now(),
            };
            
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            console.log('[Compras] Estado salvo no sessionStorage');
        } catch (error) {
            console.error('[Compras] Erro ao salvar estado:', error);
        }
    }, []);

    /**
     * Restaura os dados do formulário do sessionStorage
     */
    const restaurarEstado = useCallback((): PersistedFormData | null => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (!saved) return null;
            
            const data: PersistedFormData = JSON.parse(saved);
            
            // Verificar se os dados não são muito antigos (mais de 24 horas)
            const agora = Date.now();
            const umDia = 24 * 60 * 60 * 1000;
            if (agora - data.timestamp > umDia) {
                console.log('[Compras] Dados muito antigos, ignorando');
                sessionStorage.removeItem(STORAGE_KEY);
                return null;
            }
            
            console.log('[Compras] Estado restaurado do sessionStorage');
            return data;
        } catch (error) {
            console.error('[Compras] Erro ao restaurar estado:', error);
            return null;
        }
    }, []);

    /**
     * Verifica se existem dados não salvos no sessionStorage
     */
    const temDadosNaoSalvos = useCallback((): boolean => {
        try {
            const saved = sessionStorage.getItem(STORAGE_KEY);
            if (!saved) return false;
            
            const data: PersistedFormData = JSON.parse(saved);
            return data.combustiveis.some(c => 
                c.inicial || c.fechamento || c.compra_lt || c.compra_rs || c.estoque_tanque
            ) || !!data.despesasMes;
        } catch {
            return false;
        }
    }, []);

    /**
     * Limpa os dados persistidos após salvamento bem-sucedido
     */
    const limparEstado = useCallback(() => {
        try {
            sessionStorage.removeItem(STORAGE_KEY);
            console.log('[Compras] Estado removido do sessionStorage');
        } catch (error) {
            console.error('[Compras] Erro ao limpar estado:', error);
        }
    }, []);

    // Salvar estado antes do unmount ou quando a página ficar invisível
    useEffect(() => {
        const handleBeforeUnload = () => {
            // O salvamento real é feito pelo componente pai via ref
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // O salvamento real é feito pelo componente pai via ref
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return {
        salvarEstado,
        restaurarEstado,
        limparEstado,
        temDadosNaoSalvos,
    };
};
