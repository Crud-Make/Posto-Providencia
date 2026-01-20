import React from 'react';
import { SessaoFrentista } from '../../../../types/fechamento';
import { paraReais } from '../../../../utils/formatters';
import { useDetalhamentoFrentista } from '../../hooks/useDetalhamentoFrentista';
import { Smartphone, CreditCard, FileText, Banknote, Tag, Calculator } from 'lucide-react';

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
  onUpdate?: (tempId: string, valor: number) => void; // Callback para atualização (opcional)
}

/**
 * Componente de linha da tabela de detalhamento
 * 
 * @remarks
 * Renderiza uma linha completa da tabela, iterando sobre todas as sessões de frentistas
 * para exibir o valor correspondente ao campo solicitado.
 */
export const DetalhamentoRow: React.FC<DetalhamentoRowProps> = ({
  label, colorClass, sessoes, totalVendasPosto, field, isTotal, onUpdate
}) => {
  // Estado local para controlar qual célula está sendo editada
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [tempValue, setTempValue] = React.useState<string>('');

  const handleStartEdit = (sessao: SessaoFrentista, currentVal: number) => {
    if (!onUpdate || isTotal) return;
    setEditingId(sessao.tempId);
    setTempValue(currentVal.toFixed(2).replace('.', ','));
  };

  const handleCancel = () => {
    setEditingId(null);
    setTempValue('');
  };

  const handleSave = (tempId: string) => {
    if (onUpdate && tempValue) {
      const numeric = parseFloat(tempValue.replace(',', '.'));
      if (!isNaN(numeric)) {
        onUpdate(tempId, numeric);
      }
    }
    setEditingId(null);
  };

  // Helper para ícones
  const getIcon = () => {
    switch (field) {
      case 'pix': return <Smartphone size={16} className={colorClass.replace('bg-', 'text-')} />;
      case 'cartao': return <CreditCard size={16} className={colorClass.replace('bg-', 'text-')} />;
      case 'nota': return <FileText size={16} className={colorClass.replace('bg-', 'text-')} />;
      case 'dinheiro': return <Banknote size={16} className={colorClass.replace('bg-', 'text-')} />;
      case 'baratao': return <Tag size={16} className={colorClass.replace('bg-', 'text-')} />;
      case 'totalVenda': return <Calculator size={16} className="text-slate-200" />;
      default: return null;
    }
  };

  return (
    <tr className={isTotal ? "bg-slate-800 font-bold" : "hover:bg-slate-800/50 transition-colors"}>
      <td className={`px-4 py-3 ${isTotal ? 'text-slate-100 py-4 bg-slate-800' : 'font-medium text-slate-300'} sticky left-0 bg-slate-900 border border-slate-700/50 flex items-center gap-2`}>
        {!isTotal && getIcon()}
        {label}
      </td>
      {sessoes.map(sessao => (
        <Cell
          key={sessao.tempId}
          sessao={sessao}
          totalVendasPosto={totalVendasPosto}
          field={field}
          isTotal={isTotal}
          isEditing={editingId === sessao.tempId}
          tempValue={tempValue}
          onStartEdit={handleStartEdit}
          onCancel={handleCancel}
          onSave={handleSave}
          onChangeTemp={setTempValue}
        />
      ))}
    </tr>
  );
};

interface CellProps {
  sessao: SessaoFrentista;
  totalVendasPosto: number;
  field: string;
  isTotal?: boolean;
  isEditing: boolean;
  tempValue: string;
  onStartEdit: (sessao: SessaoFrentista, val: number) => void;
  onCancel: () => void;
  onSave: (tempId: string) => void;
  onChangeTemp: (val: string) => void;
}

/**
 * Célula individual da tabela
 * Usa o hook useDetalhamentoFrentista para obter o valor correto
 */
const Cell: React.FC<CellProps> = ({
  sessao, totalVendasPosto, field, isTotal,
  isEditing, tempValue, onStartEdit, onCancel, onSave, onChangeTemp
}) => {
  const totais = useDetalhamentoFrentista(sessao, totalVendasPosto);
  // Acesso dinâmico ao campo calculado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const valor = (totais as any)[field];

  // Tratamento de eventos de teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onSave(sessao.tempId);
    if (e.key === 'Escape') onCancel();
  };

  if (isEditing) {
    return (
      <td className="px-1 py-1 text-center bg-slate-800 border border-slate-700/50">
        <input
          type="text"
          autoFocus
          value={tempValue}
          onChange={(e) => onChangeTemp(e.target.value)}
          onBlur={() => onSave(sessao.tempId)}
          onKeyDown={handleKeyDown}
          className="w-full h-full min-h-[30px] bg-slate-700/50 border border-blue-500/50 rounded text-center text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </td>
    );
  }

  return (
    <td
      className={`px-4 py-3 text-center transition-colors border border-slate-700/50 ${isTotal ? 'text-slate-100 font-bold bg-slate-800/50' : 'text-slate-400'} ${!isTotal ? 'cursor-pointer hover:bg-slate-800' : ''}`}
      onClick={() => onStartEdit(sessao, valor)}
      title={!isTotal ? "Clique para editar" : undefined}
    >
      {paraReais(valor)}
    </td>
  );
};
