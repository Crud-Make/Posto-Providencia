import React from 'react';
import { SessaoFrentista } from '../../../../types/fechamento';
import { paraReais, formatarPorcentagem } from '../../../../utils/formatters';
import { useDetalhamentoFrentista } from '../../hooks/useDetalhamentoFrentista';
import { AlertCircle, PieChart } from 'lucide-react';

/**
 * Props comuns para as linhas de rodapé
 */
interface BaseRowProps {
  sessoes: SessaoFrentista[];
  totalVendasPosto: number;
}

/**
 * Linha que exibe a diferença entre o total calculado e o valor do encerrante
 * 
 * @remarks
 * Diferenças positivas são exibidas em vermelho (falta), negativas em verde (sobra).
 * Zero é exibido em cinza neutro.
 */
export const DetalhamentoDiferencaRow: React.FC<BaseRowProps> = ({ sessoes, totalVendasPosto }) => {
  return (
    <tr className="hover:bg-slate-800/50 transition-colors">
      <td className="px-4 py-3 font-medium text-slate-300 sticky left-0 bg-slate-900 border border-slate-700/50 flex items-center gap-2">
        <AlertCircle size={16} className="text-orange-500" />
        Diferença (Quebra)
      </td>
      {sessoes.map(sessao => (
        <CellDiferenca key={sessao.tempId} sessao={sessao} totalVendasPosto={totalVendasPosto} />
      ))}
    </tr>
  );
};

/**
 * Linha que exibe a participação percentual de cada frentista no total de vendas
 */
export const DetalhamentoParticipacaoRow: React.FC<BaseRowProps> = ({ sessoes, totalVendasPosto }) => {
  return (
    <tr className="hover:bg-slate-800/50 transition-colors">
      <td className="px-4 py-3 font-medium text-slate-300 sticky left-0 bg-slate-900 border border-slate-700/50 flex items-center gap-2">
        <PieChart size={16} className="text-purple-500" />
        Participação (%)
      </td>
      {sessoes.map(sessao => (
        <CellParticipacao key={sessao.tempId} sessao={sessao} totalVendasPosto={totalVendasPosto} />
      ))}
    </tr>
  );
};

/**
 * Célula para exibição da diferença com formatação condicional de cor
 */
const CellDiferenca: React.FC<{ sessao: SessaoFrentista; totalVendasPosto: number }> = ({ sessao, totalVendasPosto }) => {
  const { diferenca } = useDetalhamentoFrentista(sessao, totalVendasPosto);
  const colorClass = diferenca > 0 ? 'text-red-400 font-bold' : diferenca < 0 ? 'text-emerald-400 font-bold' : 'text-slate-500';

  return (
    <td className={`px-4 py-3 text-center border border-slate-700/50 ${colorClass}`}>
      {paraReais(diferenca)}
    </td>
  );
};

/**
 * Célula para exibição da participação percentual
 */
const CellParticipacao: React.FC<{ sessao: SessaoFrentista; totalVendasPosto: number }> = ({ sessao, totalVendasPosto }) => {
  const { participacao } = useDetalhamentoFrentista(sessao, totalVendasPosto);

  return (
    <td className="px-4 py-3 text-center text-slate-400 border border-slate-700/50">
      {formatarPorcentagem(participacao)}
    </td>
  );
};
