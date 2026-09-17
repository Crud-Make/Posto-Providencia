import React from 'react';
import { Filter, X } from 'lucide-react';
import { Calendario, modoIntervalo } from '@shared/ui/calendario';
import { FiltrosFinanceiros as IFiltros } from '../hooks/useFiltrosFinanceiros';

/**
 * Props do componente FiltrosFinanceiros.
 */
interface FiltrosFinanceirosProps {
  /** Estado atual dos filtros */
  filtros: IFiltros;
  /** Função callback para aplicar alteração em um filtro específico */
  onAplicar: (campo: keyof IFiltros, valor: IFiltros[keyof IFiltros]) => void;
  /** Função callback para resetar filtros */
  onReset: () => void;
  /** Função callback para aplicar preset de data */
  onPreset: (preset: 'hoje' | 'semana' | 'mes' | 'ano') => void;
}

/**
 * Barra de filtros do painel de Receitas e Despesas.
 *
 * @remarks [31/07] O rótulo "Período de análise" é obrigatório aqui, não decorativo. Este
 *          painel vive dentro do Fechamento de Caixa, cujo cabeçalho tem um seletor de DIA.
 *          São dois eixos de tempo na mesma tela: o cabeçalho manda no fechamento do dia,
 *          esta barra manda só nos números deste painel. Sem o rótulo, o usuário lê o
 *          gráfico como se fosse do dia selecionado lá em cima.
 */
export const FiltrosFinanceiros: React.FC<FiltrosFinanceirosProps> = ({
  filtros,
  onAplicar,
  onReset,
  onPreset
}) => {
  return (
    <div className="bg-slate-900/40 rounded-2xl border border-slate-700/50 p-4">
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
            Período de análise
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {(['hoje', 'semana', 'mes', 'ano'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => onPreset(preset)}
                className="px-4 py-2 text-sm font-medium bg-slate-800 text-slate-300 border border-slate-700/50 rounded-lg hover:bg-slate-700 hover:text-white transition-colors capitalize whitespace-nowrap"
              >
                {preset === 'mes' ? 'Mês' : preset}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Calendario
            modo={modoIntervalo}
            tom="escuro"
            valor={{ inicio: filtros.dataInicio, fim: filtros.dataFim }}
            aoMudar={({ inicio, fim }) => {
              onAplicar('dataInicio', inicio);
              onAplicar('dataFim', fim);
            }}
          />

          <div className="relative w-full sm:w-48">
            <select
              value={filtros.tipoTransacao}
              onChange={(e) => onAplicar('tipoTransacao', e.target.value)}
              className="w-full appearance-none bg-slate-800 border border-slate-700/50 rounded-lg py-2 pl-4 pr-10 text-sm font-medium text-slate-200 focus:ring-2 focus:ring-blue-500/50 outline-none"
            >
              <option value="todas">Todas Transações</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
            <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <button
            onClick={onReset}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors self-start sm:self-auto"
            title="Limpar Filtros"
            aria-label="Limpar filtros"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
