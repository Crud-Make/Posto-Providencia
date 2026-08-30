import React from 'react';
import { Receipt, PiggyBank, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@posto/utils';
import { ResumoFinanceiro } from '../types';

interface DemonstrativoFinanceiroProps {
  dados: ResumoFinanceiro;
}

const litros = (v: number) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} L`;

const porLitro = (v: number) =>
  `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}/L`;

/**
 * Demonstrativo do resultado do período: receita → lucro bruto → despesa → lucro real.
 *
 * @remarks [31/07] Este componente subtraía as despesas de `lucroEstimado`, que vinha do
 *          `lucro_liquido` da RPC — valor que **já vinha líquido de despesa**. O desconto
 *          acontecia duas vezes. Ficou invisível enquanto a tabela `Despesa` esteve vazia
 *          (subtrair zero duas vezes não muda nada); com julho/2026 carregado, o resultado
 *          exibido caía de R$ 19.084,23 para R$ 440,96.
 *
 *          Agora o componente **não calcula nada**: recebe `lucroReal` já apurado pelo hook
 *          contra a fórmula canônica de `@posto/utils`. Componente que calcula dinheiro está
 *          errado por definição (CLAUDE.md §3).
 */
export const DemonstrativoFinanceiro: React.FC<DemonstrativoFinanceiroProps> = ({ dados }) => {
  const positivo = dados.lucroReal >= 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 font-display">
            <span className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </span>
            Resultado do Período
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Receita menos custo do combustível, menos toda a despesa do posto.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-display">Volume</p>
          <p className="text-lg font-bold text-gray-700 dark:text-gray-200 font-finance">
            {litros(dados.litros)}
          </p>
        </div>
      </div>

      {!dados.temDespesa && dados.vendas > 0 && (
        <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-800 dark:text-amber-300">
              Nenhuma despesa lançada neste período.
            </p>
            <p className="text-amber-700 dark:text-amber-400/90 mt-0.5">
              O valor abaixo é o <strong>lucro bruto</strong>, não o real — falta descontar
              salários, energia, impostos e o resto. Lance as despesas em Fechamento de Caixa →
              Receitas e Despesas.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
        <div className="hidden md:block absolute top-1/2 left-1/3 w-8 h-8 -ml-4 -mt-4 text-gray-300 dark:text-gray-600 z-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </div>
        <div className="hidden md:block absolute top-1/2 right-1/3 w-8 h-8 -mr-4 -mt-4 text-gray-300 dark:text-gray-600 z-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14m-7-7l7 7-7 7" />
          </svg>
        </div>

        {/* 1. Lucro bruto — receita menos o custo de compra do combustível */}
        <div className="bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-800/30 relative overflow-hidden group hover:border-blue-300 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ArrowUpRight className="w-24 h-24 text-blue-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 font-display">
              Lucro Bruto
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white font-finance tracking-tight">
              {formatCurrency(dados.lucroBruto)}
            </p>

            <div className="mt-4 pt-4 border-t border-blue-200/50 dark:border-blue-800/30 space-y-1">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Receita:</span>
                <span className="font-medium font-finance">{formatCurrency(dados.vendas)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-blue-600/70 dark:text-blue-400/70">
                <span>Já sem o custo do combustível</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Despesas operacionais, com o rateio por litro */}
        <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl p-6 border border-amber-100 dark:border-amber-800/30 relative overflow-hidden group hover:border-amber-300 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <PiggyBank className="w-24 h-24 text-amber-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2 font-display">
              Despesas Operacionais
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white font-finance tracking-tight">
              {dados.temDespesa ? formatCurrency(dados.despesas) : '—'}
            </p>

            <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-800/30">
              {dados.temDespesa ? (
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Custo por litro:</span>
                  <span className="font-medium font-finance">{porLitro(dados.rateioPorLitro)}</span>
                </div>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Sem lançamento no período.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 3. Lucro real */}
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/30 relative overflow-hidden group hover:border-emerald-300 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Receipt className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 font-display">
              {dados.temDespesa ? 'Lucro Real' : 'Lucro Bruto (sem despesa)'}
            </p>
            <p
              className={`text-3xl font-bold ${positivo ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'} font-finance tracking-tight`}
            >
              {formatCurrency(dados.lucroReal)}
            </p>

            <div className="mt-4 pt-4 border-t border-emerald-200/50 dark:border-emerald-800/30">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${positivo ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-700'}`}
                >
                  {positivo ? 'LUCRO' : 'PREJUÍZO'}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Margem {dados.margemMedia.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
