import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { frentistaService } from '../../../services/api';
import { usePosto } from '../../../contexts/PostoContext';
import { PerfilFrentista, DadosFormularioFrentista } from '../types';
import { fechamentoFrentistaService } from '../../../services/api/fechamentoFrentista.service';

export const useFrentistas = () => {
    const { postoAtivoId } = usePosto();
    const [frentistas, setFrentistas] = useState<PerfilFrentista[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const carregarFrentistas = useCallback(async () => {
        if (!postoAtivoId) {
            setFrentistas([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Busca todos os frentistas (ativos e inativos)
            const { data: dadosFrentistas, error: erroFrentistas } = await supabase
                .from('Frentista')
                .select('*')
                .eq('posto_id', postoAtivoId)
                .order('nome');

            if (erroFrentistas) throw erroFrentistas;

            // Mapeia para o tipo PerfilFrentista
            const listaMapeada: PerfilFrentista[] = (dadosFrentistas || []).map((f) => ({
                id: String(f.id),
                nome: f.nome,
                cpf: f.cpf,
                status: f.ativo ? 'Ativo' : 'Inativo',
                dataAdmissao: f.data_admissao,
                telefone: f.telefone,
                postoId: f.posto_id
            }));

            setFrentistas(listaMapeada);
        } catch (err: unknown) {
            console.error('Erro ao carregar frentistas:', err);
            setError(err instanceof Error ? err.message : 'Erro ao carregar lista de frentistas');
        } finally {
            setLoading(false);
        }
    }, [postoAtivoId]);

    useEffect(() => {
        carregarFrentistas();

        // Realtime subscription
        const subscription = supabase
            .channel('frentistas_changes_gestao')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'Frentista' },
                () => carregarFrentistas()
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [carregarFrentistas]);

    const salvarFrentista = async (dados: DadosFormularioFrentista, id?: string) => {
        if (!postoAtivoId) return;

        setSaving(true);
        try {
            const dadosParaSalvar = {
                ...dados,
                posto_id: postoAtivoId
            };

            if (id) {
                await frentistaService.update(Number(id), dadosParaSalvar);
            } else {
                await frentistaService.create(dadosParaSalvar);
            }
            await carregarFrentistas();
            return true;
        } catch (err: unknown) {
            console.error('Erro ao salvar frentista:', err);
            throw err;
        } finally {
            setSaving(false);
        }
    };

    const excluirFrentista = async (id: string) => {
        try {
            await frentistaService.delete(Number(id));
            await carregarFrentistas();
            return true;
        } catch (err: unknown) {
            console.error('Erro ao excluir frentista:', err);
            throw err;
        }
    };

    return {
        frentistas,
        loading,
        saving,
        error,
        carregarFrentistas,
        salvarFrentista,
        excluirFrentista
    };
};
