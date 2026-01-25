/**
 * Cabeçalho da tabela de detalhamento
 * @author Sistema de Gestão - Posto Providência
 */
// [20/01 11:45] Componente extraído para modularização
import React from 'react';
import { Users, RefreshCcw } from 'lucide-react';

interface DetalhamentoHeaderProps {
  count: number;
  data?: string;
}

export const DetalhamentoHeader: React.FC<DetalhamentoHeaderProps> = ({ count, data }) => {
  return (
    <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/40">
      <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
        <Users className="text-blue-400" size={20} />
        Detalhamento por Frentista
        <span className="text-xs font-bold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded-full">
          {count} Ativos
        </span>
      </h3>
      <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors" title="Atualizar">
        <RefreshCcw size={18} />
      </button>
    </div>
  );
};
