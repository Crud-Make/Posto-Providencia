import React from 'react';
import { EntradaPagamento } from '../../../types/fechamento';
import { paraReais, obterIconePagamento } from '../../../utils/formatters';

interface SecaoPagamentosProps {
  pagamentos: EntradaPagamento[];
  onPagamentoChange: (index: number, valor: string) => void;
  onPagamentoBlur: (index: number) => void;
  onAutoFill?: () => void;
  totalPagamentos: number;
  isLoading?: boolean;
}

export const SecaoPagamentos: React.FC<SecaoPagamentosProps> = ({
  pagamentos,
  onPagamentoChange,
  onPagamentoBlur,
  onAutoFill,
  totalPagamentos,
  isLoading = false
}) => {
  return (
    <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 p-6 mb-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-100">
        <div className="p-2 bg-emerald-500/20 rounded-lg">
          <span className="text-xl">💰</span>
        </div>
        Formas de Pagamento (Caixa Geral)
      </h2>
      {onAutoFill && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={onAutoFill}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/80 text-white rounded-lg transition-colors border border-slate-600 hover:border-blue-500 shadow-sm disabled:opacity-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            title="Consolida e soma automaticamente os valores preenchidos na aba de Leituras e Frentistas"
          >
            <span className="text-blue-400">⚡</span>
            Auto-preencher dos Frentistas
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {pagamentos.map((pagamento, index) => (
          <div key={pagamento.id} className="bg-slate-900/50 border border-slate-700 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-lg transition-all group duration-300">
            <label className="block mb-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-600 group-hover:border-blue-500/30 transition-colors">
                {obterIconePagamento(pagamento.tipo)}
              </div>
              <span className="text-lg font-semibold text-slate-200 group-hover:text-blue-400 transition-colors">
                {pagamento.nome}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={pagamento.valor}
                onChange={(e) => onPagamentoChange(index, e.target.value)}
                onBlur={() => onPagamentoBlur(index)}
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xl text-white placeholder-slate-600 transition-all hover:bg-slate-800/80 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="0,00"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700 pt-6">
        <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
          <span className="text-xl font-bold text-slate-300">
            Total em Pagamentos:
          </span>
          <span className="text-3xl font-black font-mono text-emerald-400">
            {paraReais(totalPagamentos)}
          </span>
        </div>
      </div>

      {pagamentos.length === 0 && (
        <div className="text-center text-slate-500 py-12 flex flex-col items-center gap-2">
          <div className="text-4xl">📭</div>
          <p>Nenhuma forma de pagamento cadastrada</p>
        </div>
      )}
    </div>
  );
};
