import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { frentistaService } from '../../../services/api';
import { usePosto } from '../../../contexts/usePosto';
import { PerfilFrentista, DadosFormularioFrentista } from '../types';

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
                status: f.ativo ? 'Ativo' : 'Inativo',
                dataAdmissao: f.data_admissao,
                // `PerfilFrentista.telefone` é opcional (`string | undefined`);
                // a coluna é `string | null`. Ambos significam "sem telefone" —
                // normaliza para `undefined`, que é o vocabulário do tipo.
                telefone: f.telefone ?? undefined,
                // Já vinha no `select('*')`; só se perdia aqui, no mapeamento.
                foto: f.foto ?? null,
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

    const salvarFrentista = async (dados: DadosFormularioFrentista, id?: string): Promise<boolean> => {
        // Sem posto ativo nada foi gravado: devolve `false` para o formulário
        // continuar aberto. Antes devolvia `undefined`, falsy do mesmo jeito —
        // o comportamento em tela não muda, só o contrato fica honesto.
        if (!postoAtivoId) return false;

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
