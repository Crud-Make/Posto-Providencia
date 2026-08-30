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

  // Sem venda apurada não há com o que comparar, e a diferença dá zero por
  // ausência de termo — não por acerto. Anunciar "bateu" aí é o pior tipo de
  // mentira do sistema: em 19/08/2026 os cinco frentistas do dia entraram sem
  // nenhum encerrante lançado e a tela deu o dia por conferido.
  const semEncerrante = totalVendasPosto < 0.005;

  // Meio centavo: dinheiro é inteiro em centavos, mas a diferença chega aqui como
  // float. Sem a tolerância, um -0,000001 de arredondamento apareceria como
  // "-R$ 0,00" — um dia que bateu exibido como sobra.
  const bateu = !semEncerrante && Math.abs(diferenca) < 0.005;

  // Zero era `text-slate-500` com "R$ 0,00": cinza, do tom dos campos vazios, e
  // indistinguível de "ainda não conferido". O caso mais comum do dia — o
  // frentista que fechou certo — era o menos legível da tela. Passa a dizer que
  // bateu, em verde. Falta é diferença POSITIVA (§6: concentrador − conferido),
  // e é ela que fica em vermelho.
  const colorClass = semEncerrante
    ? 'text-amber-400/70 font-normal italic'
    : bateu
      ? 'text-green-400 font-bold'
      : diferenca > 0
        ? 'text-red-400 font-bold'
        : 'text-green-400 font-bold';

  return (
    <td
      className={`px-4 py-3 text-center border border-slate-700/50 ${colorClass}`}
      title={semEncerrante ? 'A leitura das bombas ainda não foi lançada neste dia' : undefined}
    >
      {semEncerrante ? 'sem encerrante' : bateu ? '✓ Bateu' : paraReais(diferenca)}
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
