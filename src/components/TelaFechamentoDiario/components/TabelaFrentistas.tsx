import React from 'react';
// [09/01] Adição de totalizadores e coluna de total por linha - Padronização tabelas escuras
import { Trash2, Plus, User } from 'lucide-react';
import { SessaoFrentista } from '../../../types/fechamento';
import { Frentista } from '../../../services/database.types';
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
  // Cálculos dos totais das colunas
  const totais = sessoes.reduce((acc, sessao) => ({
    dinheiro: acc.dinheiro + parseValue(sessao.valor_dinheiro),
    cartao: acc.cartao + parseValue(sessao.valor_cartao),
    pix: acc.pix + parseValue(sessao.valor_pix),
    nota: acc.nota + parseValue(sessao.valor_nota),
    baratao: acc.baratao + parseValue(sessao.valor_baratao),
  }), { dinheiro: 0, cartao: 0, pix: 0, nota: 0, baratao: 0 });

  const totalGeral = Object.values(totais).reduce((acc, val) => acc + val, 0);

  return (
    <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 p-6 mb-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-3 text-slate-100">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <span className="text-xl">👤</span>
          </div>
          Sessões de Frentistas
        </h2>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
            <span className="text-xs text-slate-400 uppercase tracking-wider block">Total Geral</span>
            <span className="text-lg font-mono font-bold text-emerald-400">{paraReais(totalGeral)}</span>
          </div>
          <button
            onClick={onAdicionarSessao}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium transition-colors disabled:opacity-50 shadow-md"
          >
            <Plus size={18} />
            Adicionar Frentista
          </button>
        </div>
      </div>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-900/50">
            <tr>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[200px] rounded-tl-lg">Frentista</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[140px]">Dinheiro</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[140px]">Cartão</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[140px]">PIX</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[140px]">Nota/Vale</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[140px]">Baratão</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider min-w-[140px]">Total</th>
              <th className="px-4 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider w-10 rounded-tr-lg"></th>
            </tr>
          </thead>
          <tbody className="bg-slate-800 divide-y divide-slate-700/50">
            {sessoes.map((sessao) => {
              const totalSessao = parseValue(sessao.valor_dinheiro) + 
                                parseValue(sessao.valor_cartao) + 
                                parseValue(sessao.valor_pix) + 
                                parseValue(sessao.valor_nota) + 
                                parseValue(sessao.valor_baratao);
              
              return (
                <tr key={sessao.tempId} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <select
                      value={sessao.frentistaId || ''}
                      onChange={(e) => onSessaoChange(sessao.tempId, 'frentistaId', e.target.value)}
                      disabled={isLoading}
                      className="block w-full bg-slate-900 border-slate-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 text-slate-200 border transition-colors cursor-pointer"
                    >
                      <option value="" className="bg-slate-800 text-slate-400">Selecione...</option>
                      {frentistas.filter(f => f.ativo).map(f => (
                        <option key={f.id} value={f.id} className="bg-slate-800 text-slate-200">{f.nome}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={sessao.valor_dinheiro}
                      onChange={(e) => onSessaoChange(sessao.tempId, 'valor_dinheiro', e.target.value)}
                      onBlur={(e) => onSessaoBlur(sessao.tempId, 'valor_dinheiro', e.target.value)}
                      disabled={isLoading}
                      className="block w-full bg-slate-900 border-slate-700 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm p-2.5 border text-slate-100 font-mono placeholder-slate-600"
                      placeholder="R$ 0,00"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={sessao.valor_cartao}
                      onChange={(e) => onSessaoChange(sessao.tempId, 'valor_cartao', e.target.value)}
                      onBlur={(e) => onSessaoBlur(sessao.tempId, 'valor_cartao', e.target.value)}
                      disabled={isLoading}
                      className="block w-full bg-slate-900 border-slate-700 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2.5 border text-slate-100 font-mono placeholder-slate-600"
                      placeholder="R$ 0,00"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={sessao.valor_pix}
                      onChange={(e) => onSessaoChange(sessao.tempId, 'valor_pix', e.target.value)}
                      onBlur={(e) => onSessaoBlur(sessao.tempId, 'valor_pix', e.target.value)}
                      disabled={isLoading}
                      className="block w-full bg-slate-900 border-slate-700 rounded-lg shadow-sm focus:ring-teal-500 focus:border-teal-500 sm:text-sm p-2.5 border text-slate-100 font-mono placeholder-slate-600"
                      placeholder="R$ 0,00"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={sessao.valor_nota}
                      onChange={(e) => onSessaoChange(sessao.tempId, 'valor_nota', e.target.value)}
                      onBlur={(e) => onSessaoBlur(sessao.tempId, 'valor_nota', e.target.value)}
                      disabled={isLoading}
                      className="block w-full bg-slate-900 border-slate-700 rounded-lg shadow-sm focus:ring-purple-500 focus:border-purple-500 sm:text-sm p-2.5 border text-slate-100 font-mono placeholder-slate-600"
                      placeholder="R$ 0,00"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={sessao.valor_baratao}
                      onChange={(e) => onSessaoChange(sessao.tempId, 'valor_baratao', e.target.value)}
                      onBlur={(e) => onSessaoBlur(sessao.tempId, 'valor_baratao', e.target.value)}
                      disabled={isLoading}
                      className="block w-full bg-slate-900 border-slate-700 rounded-lg shadow-sm focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm p-2.5 border text-slate-100 font-mono placeholder-slate-600"
                      placeholder="R$ 0,00"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="block w-full bg-slate-800/50 border border-slate-700/50 rounded-lg p-2.5 text-slate-300 font-mono font-bold text-right">
                      {paraReais(totalSessao)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onRemoverSessao(sessao.tempId)}
                      disabled={isLoading}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-900/50 font-bold border-t border-slate-700/50">
            <tr>
              <td className="px-4 py-4 text-right text-slate-400 uppercase tracking-wider text-xs">Totais</td>
              <td className="px-4 py-4 text-emerald-400 font-mono text-sm">{paraReais(totais.dinheiro)}</td>
              <td className="px-4 py-4 text-blue-400 font-mono text-sm">{paraReais(totais.cartao)}</td>
              <td className="px-4 py-4 text-teal-400 font-mono text-sm">{paraReais(totais.pix)}</td>
              <td className="px-4 py-4 text-purple-400 font-mono text-sm">{paraReais(totais.nota)}</td>
              <td className="px-4 py-4 text-yellow-400 font-mono text-sm">{paraReais(totais.baratao)}</td>
              <td className="px-4 py-4 text-white font-mono text-base border-t-2 border-slate-600 bg-slate-800/30">{paraReais(totalGeral)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {sessoes.length === 0 && (
        <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-2">
          <div className="text-4xl filter grayscale opacity-50">👥</div>
          <p>Nenhuma sessão iniciada. Clique em "Adicionar Frentista".</p>
        </div>
      )}
    </div>
  );
};
