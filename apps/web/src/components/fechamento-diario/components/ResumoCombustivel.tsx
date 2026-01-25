import React from 'react';
import { useResumoCombustivel } from '../hooks/useResumoCombustivel';
import type { Leitura } from '../hooks/useLeituras';
import type { BicoComDetalhes, Frentista, SessaoFrentista } from '../../../types/fechamento';
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
  onRefresh
}) => {
  const {
    dadosCombustivel,
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
