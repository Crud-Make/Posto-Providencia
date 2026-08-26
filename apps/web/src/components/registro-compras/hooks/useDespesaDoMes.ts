/**
 * Despesa operacional do mês, em reais, lida da tabela `Despesa`.
 *
 * @remarks
 * Substitui o campo "Despesas do Mês" que a tela de compras pedia digitado.
 * Na planilha é `I16 = D286` — a soma da grade de despesa do mês —, e a
 * `Despesa` do banco é a autoridade do rateio: é o que a Planilha do Mês e o
 * `useCustoMensal` já leem. Um número digitado aqui era uma segunda versão
 * do mesmo valor, pronta para divergir.
 *
 * Devolve `0` enquanto carrega ou quando o mês não tem despesa lançada; nesse
 * caso o "Valor p/ Venda" sai igual ao custo de compra, que é o que a planilha
 * mostra com a célula de despesa vazia.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { intervaloDoMes, hojeIso } from '../../../utils/periodo';

export const useDespesaDoMes = (postoId: number | null, mesIso: string): number => {
    const [despesa, setDespesa] = useState(0);

    useEffect(() => {
        if (!postoId) return;
        let ativo = true;

        const periodo = intervaloDoMes(mesIso, hojeIso());

        supabase
            .from('Despesa')
            .select('valor')
            .eq('posto_id', postoId)
            .gte('data', periodo.inicio)
            .lte('data', periodo.fim)
            .then(({ data, error }) => {
                if (!ativo) return;
                if (error) {
                    console.error('[Compras] Falha ao ler a despesa do mês:', error.message);
                    return;
                }
                setDespesa((data ?? []).reduce((acc, d) => acc + Number(d.valor), 0));
            });

        return () => {
            ativo = false;
        };
    }, [postoId, mesIso]);

    return despesa;
};
