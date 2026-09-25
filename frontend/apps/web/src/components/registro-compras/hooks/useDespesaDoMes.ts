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
 *
 * #103 P9 passo 5a: com a API Laravel configurada (`urlDaApi()`), a despesa vem de
 * `rateio.despesas_total` do `GET /api/postos/{posto}/dashboard` do MÊS CIVIL — um único `Number`
 * do decimal da API, quantizado por `emCentavos`, sem somar de novo. Em erro, o hook segura o
 * último valor bom e expõe o erro (console e {@link useDespesaDoMesComErro}), nunca troca por 0
 * calado (decisão do dono, 22/09/2026). Sem API, o caminho Supabase segue como estava.
 *
 * #103 (Registro de Compras 100% pela API): a fonte segue a flag DA TELA
 * (`registroDeComprasPelaApi`, `VITE_API_FORNECEDOR`), não mais só o `VITE_API_URL` — com a tela
 * no Supabase (`=0`), a despesa também fica lá, e a tela nunca mistura os dois motores.
 */
import { useEffect, useState } from 'react';
import { emCentavos } from '@posto/utils';
import type { ResultAsync } from 'neverthrow';
import { supabase } from '../../../services/supabase';
import type { ErroDaApi } from '../../../services/api/base';
import { registroDeComprasPelaApi } from '../../../services/api/compras.api';
import { lerDashboardDaApi } from '../../../services/api/dashboard.api';
import { mesCivil } from '../../../utils/periodo';

/** Despesa do mês civil pela API: `rateio.despesas_total`, um `Number` só, em centavos. */
export function lerDespesaDoMes(postoId: number, mesIso: string): ResultAsync<number, ErroDaApi> {
    const janela = mesCivil(mesIso);
    return lerDashboardDaApi(postoId, janela.inicio, janela.fim).map(dash =>
        emCentavos(Number(dash.rateio.despesas_total))
    );
}

/** Falha da última leitura: da API (`ErroDaApi`) ou a mensagem do Supabase. */
export type ErroDaDespesa = ErroDaApi | { readonly tipo: 'supabase'; readonly mensagem: string };

export interface DespesaDoMes {
    /** Último valor bom lido; `0` antes da primeira leitura. */
    readonly despesa: number;
    /** Por que a última leitura falhou, ou `null`. Com erro, `despesa` é o último valor bom. */
    readonly erro: ErroDaDespesa | null;
}

/** Igual a {@link useDespesaDoMes}, com o erro da última leitura exposto. */
export const useDespesaDoMesComErro = (postoId: number | null, mesIso: string): DespesaDoMes => {
    const [despesa, setDespesa] = useState(0);
    const [erro, setErro] = useState<ErroDaDespesa | null>(null);

    useEffect(() => {
        if (postoId === null || postoId === 0) return;
        let ativo = true;

        if (registroDeComprasPelaApi()) {
            void lerDespesaDoMes(postoId, mesIso).match(
                valor => {
                    if (!ativo) return;
                    setDespesa(valor);
                    setErro(null);
                },
                falha => {
                    if (!ativo) return;
                    console.error('[Compras] Falha ao ler a despesa do mês pela API:', falha);
                    setErro(falha);
                }
            );
            return () => {
                ativo = false;
            };
        }

        // #103 P9 passo 5b (D1/D2, decisão do dono 22/09/2026): o mês civil inteiro, também no mês
        // corrente — igual à API. A soma em float segue (fatia própria, com golden).
        const periodo = mesCivil(mesIso);

        void supabase
            .from('Despesa')
            .select('valor')
            .eq('posto_id', postoId)
            .gte('data', periodo.inicio)
            .lte('data', periodo.fim)
            .then(({ data, error }) => {
                if (!ativo) return;
                if (error) {
                    console.error('[Compras] Falha ao ler a despesa do mês:', error.message);
                    setErro({ tipo: 'supabase', mensagem: error.message });
                    return;
                }
                setDespesa((data ?? []).reduce((acc, d) => acc + Number(d.valor), 0));
                setErro(null);
            });

        return () => {
            ativo = false;
        };
    }, [postoId, mesIso]);

    return { despesa, erro };
};

export const useDespesaDoMes = (postoId: number | null, mesIso: string): number =>
    useDespesaDoMesComErro(postoId, mesIso).despesa;
