import React, { useState } from 'react';
import { SessaoFrentista } from '../../../../types/fechamento';
import { paraReais, analisarValor } from '../../../../utils/formatters';
import { useDetalhamentoFrentista } from '../../hooks/useDetalhamentoFrentista';

/**
 * Props para a linha de Encerrante
 */
interface DetalhamentoEncerranteRowProps {
  sessoes: SessaoFrentista[];
  totalVendasPosto: number;
  onUpdateEncerrante?: (tempId: string, valor: number) => void;
}

/**
 * Linha de Venda Concentrador (Encerrante) com funcionalidade de edição
 * 
 * @remarks
 * Permite que o usuário edite o valor do encerrante clicando na célula.
 * Gerencia estado local de edição (qual célula está sendo editada e valor temporário).
 */
export const DetalhamentoEncerranteRow: React.FC<DetalhamentoEncerranteRowProps> = ({
  sessoes, totalVendasPosto, onUpdateEncerrante
}) => {
  // ID do frentista que está sendo editado no momento
  const [editingId, setEditingId] = useState<number | null>(null);
  // Valor temporário do input durante a edição
  const [tempValue, setTempValue] = useState<string>('');

  /**
   * Inicia o modo de edição ao clicar na célula
   */
  const handleClick = (sessao: SessaoFrentista) => {
    if (!onUpdateEncerrante) return;
    // Usa frentistaId para controle de edição UI, mas tempId para update
    setEditingId(sessao.frentistaId ?? -1); // Fallback para -1 se null (geralmente tem ID se está editando)
    setTempValue(analisarValor(sessao.valor_encerrante).toString().replace('.', ','));
  };

  /**
   * Finaliza a edição e salva o valor
   */
  const handleBlur = (sessao: SessaoFrentista) => {
    if (editingId === (sessao.frentistaId ?? -1) && onUpdateEncerrante) {
      const numeric = parseFloat(tempValue.replace(',', '.'));
      if (!isNaN(numeric)) onUpdateEncerrante(sessao.tempId, numeric);
      setEditingId(null);
    }
  };

  /**
   * Gerencia teclas Enter e Escape
   */
  const handleKeyDown = (e: React.KeyboardEvent, sessao: SessaoFrentista) => {
    if (e.key === 'Enter') handleBlur(sessao);
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <tr className="bg-slate-800/30">
      <td className="px-4 py-4 text-slate-300 sticky left-0 bg-slate-800/95 border border-slate-600">
        <div className="flex flex-col">
          <span className="font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Venda Concentrador
          </span>
        </div>
      </td>
      {sessoes.map(sessao => (
        <Cell
          key={sessao.tempId}
          sessao={sessao}
          totalVendasPosto={totalVendasPosto}
          isEditing={editingId === sessao.frentistaId}
          tempValue={tempValue}
          setTempValue={setTempValue}
          onClick={() => handleClick(sessao)}
          onBlur={() => handleBlur(sessao)}
          onKeyDown={(e) => handleKeyDown(e, sessao)}
        />
      ))}
    </tr>
  );
};

/**
 * Props da célula individual
 */
interface CellProps {
  sessao: SessaoFrentista;
  totalVendasPosto: number;
  isEditing: boolean;
  tempValue: string;
  setTempValue: (v: string) => void;
  onClick: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Célula individual que alterna entre modo de visualização e edição
 */
const Cell: React.FC<CellProps> = ({ sessao, totalVendasPosto, isEditing, tempValue, setTempValue, onClick, onBlur, onKeyDown }) => {
  const { vendaConcentrador } = useDetalhamentoFrentista(sessao, totalVendasPosto);

  return (
    <td className="px-4 py-4 text-center align-top border border-slate-600">
      <div className="flex flex-col items-center gap-1">
        <span className="font-bold text-slate-200 mb-1">{paraReais(vendaConcentrador)}</span>
        {isEditing ? (
          <input
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            autoFocus
            className="w-24 px-2 py-1 text-xs bg-slate-700 border border-blue-500 rounded text-center text-white focus:outline-none"
          />
        ) : (
          <button onClick={onClick} className="text-xs px-2 py-1 border border-slate-600 rounded text-slate-400 hover:text-blue-400 hover:border-blue-400 transition-colors">
            Encerrante (R$)
          </button>
        )}
      </div>
    </td>
  );
};
