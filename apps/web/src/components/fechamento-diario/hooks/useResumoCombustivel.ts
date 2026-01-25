import { useMemo } from 'react';
import type { Leitura } from './useLeituras';
import type { BicoComDetalhes, Frentista, SessaoFrentista } from '../../../types/fechamento';
import {
    calcularDadosCombustivel,
    calcularTotaisPagamentos,
    gerarTabelaDetalhamento
} from '../services/calculosResumo';
import type {
    DadosCombustivel,
    DadosPagamentoChart,
    LinhaDetalhamento
} from '../services/calculosResumo';
export type {
    DadosCombustivel,
    DadosPagamentoChart,
    LinhaDetalhamento
};

/**
 * Interface de propriedades para o hook de resumo de combustível.
 */
interface UseResumoCombustivelProps {
    /** Valor total bruto das sessões */
    totalSessoes: number;
    /** Valor total recebido no caixa */
    totalPagamentos: number;
    /** Mapa de leituras dos bicos */
    leituras: Record<number, Leitura>;
    /** Lista de bicos com preços */
    bicos: BicoComDetalhes[];
    /** Sessoes dos frentistas */
    sessoes: SessaoFrentista[];
    /** Lista de frentistas */
    frentistas: Frentista[];
}

/**
 * Hook de Orquestração para o Resumo de Combustível.
 *
 * Responsabilidade: Gerenciar a memoização dos cálculos de resumo usando
 * as funções puras do serviço `calculosResumo`.
 *
 * @param props UseResumoCombustivelProps
 * @returns Objetos e valores calculados prontos para exibição.
 */
export function useResumoCombustivel({
    totalSessoes,
    totalPagamentos,
    leituras,
    bicos,
    sessoes,
    frentistas,
}: UseResumoCombustivelProps) {

    // 1. Delega cálculo de Combustíveis para o Serviço
    const dadosCombustivel: DadosCombustivel[] = useMemo(
        () => calcularDadosCombustivel(bicos, leituras),
        [bicos, leituras]
    );

    // 2. Delega cálculo de Pagamentos para o Serviço
    const dadosPagamentos: DadosPagamentoChart[] = useMemo(
        () => calcularTotaisPagamentos(sessoes),
        [sessoes]
    );

    // 3. Delega geração da Tabela para o Serviço
    const tabelaDetalhamento: LinhaDetalhamento[] = useMemo(
        () => gerarTabelaDetalhamento(sessoes, frentistas),
        [sessoes, frentistas]
    );

    // 4. Lógica de UI simples para Diferença de Caixa
    const diferenca = totalSessoes - totalPagamentos;
    const temDiferenca = Math.abs(diferenca) > 0.01;
    const isSobra = diferenca > 0;

    const corDiferenca = temDiferenca
        ? isSobra
            ? 'text-orange-600'
            : 'text-red-600'
        : 'text-green-600';

    const textoDiferenca = temDiferenca
        ? isSobra
            ? 'Sobra de Caixa'
            : 'Falta no Caixa'
        : 'Caixa Fechado';

    return {
        dadosCombustivel,
        dadosPagamentos,
        tabelaDetalhamento,
        diferenca,
        temDiferenca,
        corDiferenca,
        textoDiferenca,
    };
}
