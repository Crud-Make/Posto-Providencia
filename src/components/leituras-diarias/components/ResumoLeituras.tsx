import React from 'react';
import { Droplet, DollarSign, BarChart3 } from 'lucide-react';
import type { useLeituras } from '../../fechamento-diario/hooks/useLeituras';
import { FUEL_COLORS } from '../types';

type UseLeiturasReturn = ReturnType<typeof useLeituras>;

interface ResumoLeiturasProps {
  leiturasHook: UseLeiturasReturn;
}

export const ResumoLeituras: React.FC<ResumoLeiturasProps> = ({ leiturasHook }) => {
  const { totals, getSummaryByCombustivel } = leiturasHook;
  const summary = getSummaryByCombustivel();

  if (totals.litros === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
        <BarChart3 className="text-gray-500" size={20} />
        <h3 className="font-bold text-gray-700">Resumo da Leitura</h3>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {summary.map((item) => (
            <div key={item.codigo} className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${FUEL_COLORS[item.codigo] || 'bg-gray-200 text-gray-700'}`}>
                  {item.codigo}
                </span>
                <span className="text-sm text-gray-500 font-medium">{item.nome}</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{item.litros.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} L</div>
                <div className="text-xs text-gray-500">R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-end gap-8 pt-6 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Droplet size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Volume Total</p>
              <p className="text-2xl font-black text-gray-900">{totals.litrosDisplay} <span className="text-base font-normal text-gray-500">L</span></p>
            </div>
          </div>

          <div className="w-px h-12 bg-gray-200 hidden sm:block"></div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Valor Total</p>
              <p className="text-2xl font-black text-gray-900">R$ {totals.valorDisplay}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
