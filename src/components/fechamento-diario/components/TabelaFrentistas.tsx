import React from 'react';
import {
  Trash2,
  Plus,
  User,
  Smartphone,
  CreditCard,
  FileText,
  Banknote,
  Tag,
  AlertCircle
} from 'lucide-react';
import { SessaoFrentista } from '../../../types/fechamento';
import { Frentista } from '../../../types/database/index';
import { paraReais, parseValue } from '../../../utils/formatters';

interface SecaoSessoesFrentistasProps {
  sessoes: SessaoFrentista[];
  frentistas: Frentista[];
  onSessaoChange: (tempId: string, campo: keyof SessaoFrentista, valor: string) => void;
  onSessaoBlur: (tempId: string, campo: keyof SessaoFrentista, valor: string) => void;
  onRemoverSessao: (tempId: string) => void;
  onAdicionarSessao: () => void;
  isLoading?: boolean;
}

export const SecaoSessoesFrentistas: React.FC<SecaoSessoesFrentistasProps> = ({
  sessoes,
  frentistas,
  onSessaoChange,
  onSessaoBlur,
  onRemoverSessao,
  onAdicionarSessao,
  isLoading
}) => {

  // Definição das linhas da matriz (Tipos de Pagamento)
  const linhasPagamento = [
    { key: 'valor_pix', label: 'Pix', icon: <Smartphone size={16} className="text-teal-400" /> },
    { key: 'valor_cartao_debito', label: 'Cartão Débito', icon: <CreditCard size={16} className="text-blue-400" /> },
    { key: 'valor_cartao_credito', label: 'Cartão Crédito', icon: <CreditCard size={16} className="text-indigo-400" /> },
    { key: 'valor_nota', label: 'Nota a Prazo', icon: <FileText size={16} className="text-purple-400" /> },
    { key: 'valor_dinheiro', label: 'Dinheiro', icon: <Banknote size={16} className="text-emerald-400" /> },
    { key: 'valor_baratao', label: 'Baratão/Outros', icon: <Tag size={16} className="text-yellow-400" /> },
  ] as const;

  // Cálculos auxiliar
  const calcularTotalSessao = (sessao: SessaoFrentista) => {
    return linhasPagamento.reduce((acc, linha) => acc + parseValue(sessao[linha.key]), 0);
  };

  const calcularTotalPorTipo = (chave: typeof linhasPagamento[number]['key']) => {
    return sessoes.reduce((acc, sessao) => acc + parseValue(sessao[chave]), 0);
  };

  const totalGeralCaixa = sessoes.reduce((acc, sessao) => acc + calcularTotalSessao(sessao), 0);

  return (
    <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-3 text-slate-100">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <span className="text-xl">👥</span>
          </div>
          Detalhamento por Frentista
        </h2>

        <div className="flex items-center gap-4">
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${sessoes.length > 0 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>
            {sessoes.length} Ativos
          </div>
          <button
            onClick={onAdicionarSessao}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500 font-medium transition-colors disabled:opacity-50 shadow-md"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        {sessoes.length === 0 ? (
          <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-2 border-2 border-dashed border-slate-700/50 rounded-xl">
            <User size={48} className="text-slate-600 mb-2" />
            <p className="text-lg font-medium">Nenhum frentista adicionado</p>
            <p className="text-sm">Clique em "Adicionar" para iniciar o detalhamento.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-700/50 bg-slate-900/40 rounded-xl overflow-hidden">
            <thead>
              <tr className="bg-slate-900">
                <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider sticky left-0 z-10 bg-slate-900 border-r border-slate-800 w-[200px]">
                  MEIO DE PAGAMENTO
                </th>
                {sessoes.map((sessao) => (
                  <th key={sessao.tempId} className="px-4 py-2 min-w-[160px] relative group">
                    <div className="flex flex-col gap-2">
                      <select
                        value={sessao.frentistaId || ''}
                        onChange={(e) => onSessaoChange(sessao.tempId, 'frentistaId', e.target.value)}
                        disabled={isLoading}
                        className="block w-full bg-slate-800 border-slate-700 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs py-1.5 px-2 text-slate-200 font-bold uppercase tracking-wide text-center appearance-none cursor-pointer hover:bg-slate-700 transition-colors"
                      >
                        <option value="" className="text-slate-500">SELECIONE...</option>
                        {frentistas.filter(f => f.ativo).map(f => (
                          <option key={f.id} value={f.id}>{f.nome.toUpperCase()}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => onRemoverSessao(sessao.tempId)}
                        className="absolute -top-1 -right-1 p-1 bg-red-500/10 text-red-400 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                        title="Remover Frentista"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[120px] bg-slate-900/50 border-l border-slate-800">
                  TOTAL CAIXA
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {/* Linhas de Pagamento */}
              {linhasPagamento.map((linha) => {
                const totalLinha = calcularTotalPorTipo(linha.key);
                return (
                  <tr key={linha.key} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-300 flex items-center gap-2 border-r border-slate-800/50">
                      {linha.icon}
                      {linha.label}
                    </td>
                    {sessoes.map((sessao) => (
                      <td key={`${sessao.tempId}-${linha.key}`} className="px-2 py-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={sessao[linha.key]}
                          onChange={(e) => onSessaoChange(sessao.tempId, linha.key, e.target.value)}
                          onBlur={(e) => onSessaoBlur(sessao.tempId, linha.key, e.target.value)}
                          disabled={isLoading}
                          className="block w-full bg-slate-800/50 border-slate-700/50 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm py-1.5 px-2 text-right text-slate-200 font-mono placeholder-slate-700 transition-all hover:bg-slate-800"
                          placeholder="0,00"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-bold font-mono text-slate-300 border-l border-slate-800/50 bg-slate-800/20">
                      {paraReais(totalLinha)}
                    </td>
                  </tr>
                );
              })}

              {/* Linha Total Venda Frentista */}
              <tr className="bg-blue-900/20 font-bold">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-200 border-r border-slate-800/50">
                  Total Venda Frentista
                </td>
                {sessoes.map((sessao) => (
                  <td key={`total-${sessao.tempId}`} className="px-4 py-4 whitespace-nowrap text-right text-sm font-mono text-white">
                    {paraReais(calcularTotalSessao(sessao))}
                  </td>
                ))}
                <td className="px-4 py-4 whitespace-nowrap text-right text-base font-mono text-blue-400 border-l border-slate-800/50 bg-blue-900/30">
                  {paraReais(totalGeralCaixa)}
                </td>
              </tr>

              {/* Linha Diferença (Falta) - Placeholder visual por enquanto */}
              <tr className="bg-red-900/10">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-red-400 border-r border-slate-800/50">
                  Diferença (Falta)
                </td>
                {sessoes.map((sessao) => (
                  <td key={`dif-${sessao.tempId}`} className="px-4 py-3 whitespace-nowrap text-right text-sm font-mono text-slate-500">
                    -
                  </td>
                ))}
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-mono text-red-400 border-l border-slate-800/50">
                  -
                </td>
              </tr>

              {/* Linha Participação % */}
              <tr className="bg-slate-900/30 text-xs">
                <td className="px-4 py-3 whitespace-nowrap text-slate-500 border-r border-slate-800/50">
                  Participação %
                </td>
                {sessoes.map((sessao) => {
                  const totalSessao = calcularTotalSessao(sessao);
                  const perc = totalGeralCaixa > 0 ? (totalSessao / totalGeralCaixa) * 100 : 0;
                  return (
                    <td key={`perc-${sessao.tempId}`} className="px-4 py-3 whitespace-nowrap text-right font-mono text-slate-500">
                      {perc.toFixed(2)}%
                    </td>
                  );
                })}
                <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-slate-400 border-l border-slate-800/50">
                  100%
                </td>
              </tr>

            </tbody>
          </table>
        )}
      </div>
      <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
        <AlertCircle size={14} />
        * Valores de Venda Concentrador devem ser preenchidos com o total vendido registrado na bomba (Encerrante).
      </div>
    </div>
  );
};
