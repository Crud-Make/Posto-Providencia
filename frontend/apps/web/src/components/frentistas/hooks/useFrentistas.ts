import { useState, useCallback, useEffect } from 'react';
import { usePosto } from '../../../contexts/usePosto';
import { PerfilFrentista, DadosFormularioFrentista } from '../types';
import { okAsync, type ResultAsync } from 'neverthrow';
import { assinarMudancasDaEquipe, carregarEquipe, desativarFrentista, gravarFrentista } from './fonteDaEquipe';

/** Sem posto ativo a lista é vazia, sem ir a fonte nenhuma (como antes). */
const lerEquipe = (postoId: number): ResultAsync<PerfilFrentista[], string> => (postoId > 0 ? carregarEquipe(postoId) : okAsync([]));

/**
 * Estado da tela Frentistas. A fonte (Supabase ou API Laravel) é escolhida em `fonteDaEquipe`, pela
 * flag `VITE_API_FRENTISTAS`; aqui só se guarda o que a tela mostra.
 */
export const useFrentistas = () => {
    const { postoAtivoId } = usePosto();
    const [frentistas, setFrentistas] = useState<PerfilFrentista[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // O que a fonte devolveu vai para a tela nestes dois — nunca no corpo do efeito, só depois da leitura.
    const mostrar = useCallback((lista: PerfilFrentista[]) => {
        setFrentistas(lista);
        setLoading(false);
    }, []);
    const falhar = useCallback((motivo: string) => {
        console.error('Erro ao carregar frentistas:', motivo);
        setError(motivo);
        setLoading(false);
    }, []);

    const carregarFrentistas = useCallback(async () => {
        setLoading(true);
        setError(null);
        await lerEquipe(postoAtivoId).match(mostrar, falhar);
    }, [postoAtivoId, mostrar, falhar]);

    useEffect(() => {
        void lerEquipe(postoAtivoId).match(mostrar, falhar);
        return assinarMudancasDaEquipe(() => void carregarFrentistas());
    }, [postoAtivoId, mostrar, falhar, carregarFrentistas]);

    /** `false` mantém o formulário aberto: sem posto ativo, ou a gravação foi recusada. */
    const salvarFrentista = async (dados: DadosFormularioFrentista, id?: string): Promise<boolean> => {
        if (!(postoAtivoId > 0)) return false;

        setSaving(true);
        const gravada = await gravarFrentista(postoAtivoId, dados, id);
        if (gravada.isOk()) await carregarFrentistas();
        setSaving(false);

        return gravada.match(() => true, (motivo) => {
            console.error('Erro ao salvar frentista:', motivo);
            setError(motivo);
            window.alert(`Erro ao salvar frentista: ${motivo}`);
            return false;
        });
    };

    /** O "Excluir" da tela (desativa). Lança na falha: quem chama mostra o alerta. */
    const excluirFrentista = async (id: string) => {
        if (!(postoAtivoId > 0)) return false;

        const desativado = await desativarFrentista(postoAtivoId, id);
        if (desativado.isErr()) {
            console.error('Erro ao excluir frentista:', desativado.error);
            throw new Error(desativado.error);
        }
        await carregarFrentistas();
        return true;
    };

    return { frentistas, loading, saving, error, carregarFrentistas, salvarFrentista, excluirFrentista };
};
