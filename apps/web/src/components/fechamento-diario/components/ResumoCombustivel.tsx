import React from 'react';
import { useResumoCombustivel } from '../hooks/useResumoCombustivel';
import type { Leitura } from '../hooks/useLeituras';
import type { BicoComDetalhes, Frentista, SessaoFrentista } from '../../../types/fechamento';
import type { DadosCombustivel } from '../services/calculosResumo';
import { ResumoCards } from './resumo/ResumoCards';
import { ResumoGraficos } from './resumo/ResumoGraficos';
import { ResumoTabela } from './resumo/ResumoTabela';

interface SecaoResumoProps {
  totalLitros: number;
  totalSessoes: number;
  totalPagamentos: number;
  leituras: Record<number, Leitura>;
  bicos: BicoComDetalhes[];
  sessoes: SessaoFrentista[];
  frentistas: Frentista[];
  isLoading?: boolean;
  onRefresh?: () => void;
  /**
   * Volume por combustível já agregado, para quem não tem como calculá-lo do
   * encerrante do dia.
   *
   * @remarks
   * A conta padrão é `fechamento − inicial` por bico, que só existe **num dia**: num
   * mês há uma leitura por bico por dia e a subtração não generaliza. A visão mensal
   * soma `litros_vendidos`/`valor_total` das linhas de `Leitura` e entrega pronto
   * aqui, em vez de duplicar o resto do resumo só por causa deste gráfico.
   */
  dadosCombustivelPronto?: DadosCombustivel[];
}

export const SecaoResumo: React.FC<SecaoResumoProps> = ({
  totalLitros,
  totalSessoes,
  totalPagamentos,
  leituras,
  bicos,
  sessoes,
  frentistas,
  isLoading = false,
  onRefresh,
  dadosCombustivelPronto
}) => {
  const {
    dadosCombustivel: dadosCombustivelDoDia,
    dadosPagamentos,
    tabelaDetalhamento,
    diferenca,
    temDiferenca,
    corDiferenca,
    textoDiferenca
  } = useResumoCombustivel({
    totalSessoes,
    totalPagamentos,
    leituras,
    bicos,
    sessoes,
    frentistas
  });

  const dadosCombustivel = dadosCombustivelPronto ?? dadosCombustivelDoDia;

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando visualizações...</div>;
  }

  return (
    <div className="space-y-6">
      <ResumoCards
        totalLitros={totalLitros}
        totalSessoes={totalSessoes}
        totalPagamentos={totalPagamentos}
        diferenca={diferenca}
        temDiferenca={temDiferenca}
        corDiferenca={corDiferenca}
        textoDiferenca={textoDiferenca}
      />

      <ResumoGraficos
        dadosCombustivel={dadosCombustivel}
        dadosPagamentos={dadosPagamentos}
      />

      <ResumoTabela
        sessoes={sessoes}
        frentistas={frentistas}
        tabelaDetalhamento={tabelaDetalhamento}
        totalSessoes={totalSessoes}
        isLoading={isLoading}
        onRefresh={onRefresh}
      />
    </div>
  );
};
