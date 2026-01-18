/**
 * useUpdateChecker - Hook para gerenciar atualizações OTA do EAS Update.
 * 
 * FUNCIONALIDADES:
 * 1. Verifica automaticamente por atualizações ao abrir o app.
 * 2. Baixa atualizações em background.
 * 3. Aplica atualizações críticas instantaneamente (Instant Reload).
 * 4. Suporta Cross-native Runtime Deployments.
 * 
 * @module useUpdateChecker
 * @version 1.4.0
 * @author Posto Providência
 */

import { useEffect, useState, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { Alert, AppState, AppStateStatus } from 'react-native';

/**
 * Tipos de atualização disponíveis.
 */
export type UpdateStatus =
    | 'checking'      // Verificando atualizações
    | 'available'     // Atualização disponível
    | 'downloading'   // Baixando atualização
    | 'ready'         // Pronta para aplicar
    | 'up-to-date'    // Já está na versão mais recente
    | 'error';        // Erro ao verificar/baixar

/**
 * Interface com as informações detalhadas sobre o estado da atualização.
 */
export interface UpdateInfo {
    /** Status atual do processo de atualização */
    status: UpdateStatus;
    /** Se há uma atualização disponível */
    isUpdateAvailable: boolean;
    /** Se está baixando a atualização */
    isDownloading: boolean;
    /** Progresso do download (0-100) - Simulado ou real se API suportar */
    downloadProgress: number;
    /** Mensagem de erro, se houver */
    error: string | null;
    /** Versão atual do runtime */
    currentVersion: string;
    /** Se true, aplica a atualização automaticamente sem perguntar */
    autoReload: boolean;
}

/**
 * Hook principal para gerenciamento de atualizações OTA.
 * 
 * @param {object} [options] - Configurações do hook.
 * @param {boolean} [options.checkOnMount=true] - Se deve verificar atualizações ao montar.
 * @param {boolean} [options.checkOnForeground=true] - Se deve verificar quando o app volta ao foreground.
 * @param {boolean} [options.autoDownload=true] - Se deve baixar automaticamente quando disponível.
 * @param {boolean} [options.criticalUpdate=false] - Se true, aplica instantaneamente sem perguntar.
 * @returns {UpdateInfo & { checkForUpdate: () => Promise<boolean>, downloadUpdate: () => Promise<boolean>, applyUpdate: () => Promise<void> }} O estado e funções de controle.
 */
export function useUpdateChecker(options?: {
    checkOnMount?: boolean;
    checkOnForeground?: boolean;
    autoDownload?: boolean;
    criticalUpdate?: boolean;
}) {
    const {
        checkOnMount = true,
        checkOnForeground = true,
        autoDownload = true,
        criticalUpdate = false
    } = options || {};

    const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({
        status: 'up-to-date',
        isUpdateAvailable: false,
        isDownloading: false,
        downloadProgress: 0,
        error: null,
        currentVersion: Updates.runtimeVersion || 'unknown',
        autoReload: criticalUpdate
    });

    /**
     * Verifica se há atualizações disponíveis.
     * Atualiza o estado com o resultado da verificação.
     * 
     * @returns {Promise<boolean>} True se encontrou uma atualização.
     */
    const checkForUpdate = useCallback(async (): Promise<boolean> => {
        // Em desenvolvimento, não verifica atualizações
        if (__DEV__) {
            console.log('[OTA] Modo desenvolvimento - verificação de atualizações desabilitada');
            return false;
        }

        try {
            setUpdateInfo(prev => ({ ...prev, status: 'checking', error: null }));

            const update = await Updates.checkForUpdateAsync();

            if (update.isAvailable) {
                console.log('[OTA] Nova atualização disponível!');
                setUpdateInfo(prev => ({
                    ...prev,
                    status: 'available',
                    isUpdateAvailable: true
                }));

                // Se autoDownload está habilitado, inicia o download automaticamente
                if (autoDownload) {
                    await downloadUpdate();
                }

                return true;
            } else {
                console.log('[OTA] App já está na versão mais recente');
                setUpdateInfo(prev => ({
                    ...prev,
                    status: 'up-to-date',
                    isUpdateAvailable: false
                }));
                return false;
            }
		} catch (error) {
			console.error('[OTA] Erro ao verificar atualizações:', error);
			const message = error instanceof Error ? error.message : 'Erro desconhecido';
			setUpdateInfo(prev => ({
				...prev,
				status: 'error',
				error: message
			}));
            return false;
        }
    }, [autoDownload]);

    /**
     * Baixa a atualização disponível.
     * 
     * @returns {Promise<boolean>} True se baixou com sucesso.
     */
    const downloadUpdate = useCallback(async (): Promise<boolean> => {
        if (__DEV__) return false;

        try {
            setUpdateInfo(prev => ({
                ...prev,
                status: 'downloading',
                isDownloading: true,
                downloadProgress: 0
            }));

            const result = await Updates.fetchUpdateAsync();

            if (result.isNew) {
                console.log('[OTA] Atualização baixada com sucesso!');
                setUpdateInfo(prev => ({
                    ...prev,
                    status: 'ready',
                    isDownloading: false,
                    downloadProgress: 100
                }));

                // Se é uma atualização crítica, aplica instantaneamente
                if (criticalUpdate) {
                    console.log('[OTA] Atualização crítica - aplicando instantaneamente...');
                    await applyUpdate();
                }

                return true;
            }

            return false;
		} catch (error) {
			console.error('[OTA] Erro ao baixar atualização:', error);
			const message = error instanceof Error ? error.message : 'Erro ao baixar';
			setUpdateInfo(prev => ({
				...prev,
				status: 'error',
				isDownloading: false,
				error: message
			}));
            return false;
        }
    }, [criticalUpdate]);

    /**
     * Aplica a atualização e reinicia o app (Instant Reload).
     */
    const applyUpdate = useCallback(async () => {
        if (__DEV__) {
            console.log('[OTA] Modo desenvolvimento - recarregamento desabilitado');
            return;
        }

        try {
            console.log('[OTA] Aplicando atualização e reiniciando...');
            await Updates.reloadAsync();
		} catch (error) {
			console.error('[OTA] Erro ao aplicar atualização:', error);
			const message = error instanceof Error ? error.message : 'Erro ao aplicar';
			setUpdateInfo(prev => ({
				...prev,
				status: 'error',
				error: message
			}));
        }
    }, []);

    /**
     * Mostra um alerta amigável perguntando se o usuário quer atualizar.
     */
    const promptForUpdate = useCallback(() => {
        Alert.alert(
            '🆕 Atualização Disponível',
            'Uma nova versão do app está pronta. Deseja atualizar agora?\n\nO app será reiniciado automaticamente.',
            [
                { text: 'Agora não', style: 'cancel' },
                { text: 'Atualizar', onPress: () => applyUpdate() }
            ]
        );
    }, [applyUpdate]);

    // Setup inicial
    useEffect(() => {
        if (checkOnMount) {
            checkForUpdate();
        }
    }, [checkOnMount, checkForUpdate]);

    // Listener para quando o app volta ao foreground
    useEffect(() => {
        if (!checkOnForeground) return;

        // [18/01 18:10] Tipagem de nextAppState para usar AppStateStatus
        const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                checkForUpdate();
            }
        });

        return () => {
            subscription.remove();
        };
    }, [checkOnForeground, checkForUpdate]);

    return {
        ...updateInfo,
        // [18/01 18:10] Reexposto checkingUpdate para compatibilidade com PerfilScreen
        checkingUpdate: updateInfo.status === 'checking',
        checkForUpdate,
        downloadUpdate,
        applyUpdate,
        promptForUpdate
    };
}

/**
 * Componente wrapper que mostra feedback visual de atualização
 * Pode ser usado no _layout.tsx para feedback global
 */
export function UpdateBanner() {
    const { status, isUpdateAvailable, promptForUpdate, applyUpdate } = useUpdateChecker({
        checkOnMount: true,
        checkOnForeground: true,
        autoDownload: true,
        criticalUpdate: true // Sempre aplica automaticamente após baixar
    });

    // Em produção, quando uma atualização estiver pronta, mostra o prompt
    useEffect(() => {
        if (status === 'ready' && isUpdateAvailable) {
            promptForUpdate();
        }
    }, [status, isUpdateAvailable, promptForUpdate]);

    // O banner não renderiza nada visualmente, apenas gerencia a lógica
    return null;
}
