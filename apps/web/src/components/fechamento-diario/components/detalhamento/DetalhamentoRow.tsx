import React from 'react';
import { SessaoFrentista } from '../../../../types/fechamento';
import { paraReais } from '../../../../utils/formatters';
import { useDetalhamentoFrentista } from '../../hooks/useDetalhamentoFrentista';

/**
 * Props do componente DetalhamentoRow
 */
interface DetalhamentoRowProps {
  label: string; // Nome da linha (ex: "Pix")
  colorClass: string; // Classe de cor para o indicador visual
  sessoes: SessaoFrentista[]; // Lista de sessões para renderizar colunas
  totalVendasPosto: number; // Total geral para cálculos
  field: 'pix' | 'cartao' | 'nota' | 'dinheiro' | 'baratao' | 'totalVenda'; // Campo a ser exibido
  isTotal?: boolean; // Se true, aplica estilos de destaque para linha de total
}

/**
 * Componente de linha da tabela de detalhamento
 * 
 * @remarks
 * Renderiza uma linha completa da tabela, iterando sobre todas as sessões de frentistas
 * para exibir o valor correspondente ao campo solicitado.
 */
export const DetalhamentoRow: React.FC<DetalhamentoRowProps> = ({
  label, colorClass, sessoes, totalVendasPosto, field, isTotal
}) => {
  return (
    <tr className={isTotal ? "bg-blue-900/10 font-bold border-t border-blue-500/20" : "hover:bg-slate-700/10 transition-colors"}>
      <td className={`px-4 py-3 ${isTotal ? 'text-blue-200 py-4' : 'font-medium text-slate-300'} sticky left-0 bg-slate-800/95 border-r border-slate-700/50 flex items-center gap-2`}>
        {!isTotal && <span className={`w-2 h-2 rounded-full ${colorClass}`}></span>}
        {label}
      </td>
      {sessoes.map(sessao => (
        <Cell key={sessao.tempId} sessao={sessao} totalVendasPosto={totalVendasPosto} field={field} isTotal={isTotal} />
      ))}
    </tr>
  );
};

/**
 * Célula individual da tabela
 * Usa o hook useDetalhamentoFrentista para obter o valor correto
 */
const Cell: React.FC<{ sessao: SessaoFrentista; totalVendasPosto: number; field: string; isTotal?: boolean }> = ({ sessao, totalVendasPosto, field, isTotal }) => {
  const totais = useDetalhamentoFrentista(sessao, totalVendasPosto);
  // Acesso dinâmico ao campo calculado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valor = (totais as any)[field];
  
  return (
    <td className={`px-4 py-3 text-center ${isTotal ? 'text-blue-200 py-4' : 'text-slate-300'}`}>
      {paraReais(valor)}
    </td>
  );
};
