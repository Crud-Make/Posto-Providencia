// [10/01 17:46] Criado durante refatoração Issue #16
import { useState, useEffect } from 'react';
import { configuracaoService } from '../../../services/api';
import { Configuracao } from '../../../types';

/**
 * Hook para gerenciamento de parâmetros de configuração.
 * Controla tolerância e dias de estoque crítico/baixo.
 * 
 * @param {number} postoAtivoId - ID do posto ativo
 * @returns {Object} Estados e funções de controle
 */
export const useParametros = (postoAtivoId: number) => {
    const [tolerance, setTolerance] = useState("50.00");
    const [diasEstoqueCritico, setDiasEstoqueCritico] = useState("3");
    const [diasEstoqueBaixo, setDiasEstoqueBaixo] = useState("7");
    const [saving, setSaving] = useState(false);
    const [configsModified, setConfigsModified] = useState(false);

    useEffect(() => {
        const loadConfigs = async () => {
            if (!postoAtivoId) return;
            try {
                const response = await configuracaoService.getAll(postoAtivoId);
                const configs = response.success ? (response.data || []) : [];

                const tol = configs.find((c: Configuracao) => c.chave === "tolerancia_divergencia");
                const diasCrit = configs.find((c: Configuracao) => c.chave === "dias_estoque_critico");
                const diasBaixo = configs.find((c: Configuracao) => c.chave === "dias_estoque_baixo");

                if (tol) setTolerance(tol.valor);
                if (diasCrit) setDiasEstoqueCritico(diasCrit.valor);
                if (diasBaixo) setDiasEstoqueBaixo(diasBaixo.valor);
            } catch (error) {
                console.error("Failed to fetch configs", error);
            }
        };
        loadConfigs();
    }, [postoAtivoId]);

    const handleSaveConfigs = async () => {
        setSaving(true);
        try {
            const results = await Promise.all([
                configuracaoService.update("tolerancia_divergencia", tolerance, postoAtivoId),
                configuracaoService.update("dias_estoque_critico", diasEstoqueCritico, postoAtivoId),
                configuracaoService.update("dias_estoque_baixo", diasEstoqueBaixo, postoAtivoId),
            ]);

            const hasError = results.some(r => !r.success);
            if (hasError) {
                alert("Erro ao salvar algumas configurações.");
                setSaving(false);
                return;
            }

            setConfigsModified(false);
            alert("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar configurações", error);
            alert("Erro ao salvar configurações. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    const updateTolerance = (val: string) => {
        setTolerance(val);
        setConfigsModified(true);
    };

    const updateDiasCritico = (val: string) => {
        setDiasEstoqueCritico(val);
        setConfigsModified(true);
    };

    const updateDiasBaixo = (val: string) => {
        setDiasEstoqueBaixo(val);
        setConfigsModified(true);
    };

    return {
        tolerance,
        diasEstoqueCritico,
        diasEstoqueBaixo,
        saving,
        configsModified,
        updateTolerance,
        updateDiasCritico,
        updateDiasBaixo,
        handleSaveConfigs
    };
};
