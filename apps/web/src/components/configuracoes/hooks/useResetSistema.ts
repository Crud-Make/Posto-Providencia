// [10/01 17:46] Criado durante refatoração Issue #16
import { useState } from 'react';
import { resetService } from '../../../services/api';

/**
 * Hook para gerenciamento do reset do sistema.
 * 
 * @param {number} postoAtivoId - ID do posto ativo
 * @returns {Object} Estados e funções de controle
 */
export const useResetSistema = (postoAtivoId: number) => {
    const [isResetting, setIsResetting] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    /**
     * Executa o reset do sistema após validação.
     * @param {string} confirmText - Texto de confirmação digitado pelo usuário
     */
    const handleResetSystem = async (confirmText: string) => {
        // Validação de segurança
        if (confirmText !== "RESETAR") {
            alert('Por favor, digite "RESETAR" para confirmar.');
            return;
        }

        setIsResetting(true);
        try {
            const result = await resetService.resetAllData(postoAtivoId);

            if (result.success && result.data) {
                // Mostra resumo do que foi deletado
                const summary = Object.entries(result.data.deletedCounts)
                    .map(([table, count]) => `• ${table}: ${count} registros`)
                    .join('\n');

                alert(
                    `✅ ${result.data.message}\n\n` +
                    `Resumo:\n${summary}`
                );

                setShowResetConfirm(false);

                // Recarrega a página para atualizar os dados
                window.location.reload();
            } else {
                alert(`❌ ${"error" in result ? result.error : "Erro desconhecido"}`);
            }
        } catch (error) {
            console.error("Erro ao resetar sistema:", error);
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            alert(`Erro ao resetar sistema: ${errorMessage}`);
        } finally {
            setIsResetting(false);
        }
    };

    return {
        isResetModalOpen: showResetConfirm,
        isResetting,
        openResetModal: () => setShowResetConfirm(true),
        closeResetModal: () => setShowResetConfirm(false),
        handleReset: handleResetSystem
    };
};
