/**
 * Cabeçalho da tabela de detalhamento
 * @author Sistema de Gestão - Posto Providência
 */
// [20/01 11:45] Componente extraído para modularização
import React from 'react';
import { Users, Calculator } from 'lucide-react';

interface DetalhamentoHeaderProps {
  count: number;
  data?: string;
}

export const DetalhamentoHeader: React.FC<DetalhamentoHeaderProps> = ({ count, data }) => {
  const dataFormatada = data ? new Date(data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : new Date().toLocaleDateString('pt-BR');

  return (
    <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/40">
      <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
        <Users className="text-blue-400" size={20} />
        Fechamento Diário {dataFormatada}
        <span className="text-xs font-normal text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
          {count} Ativos
        </span>
      </h3>
      <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors">
        <Calculator size={18} />
      </button>
    </div>
  );
};
