import React from 'react';
import { BarChart2, ArrowRight } from 'lucide-react';
import { ProductData, Totals } from '../types';
import { formatarMoeda } from '../../../../utils/formatters';

interface TabelaVendasProps {
  products: ProductData[];
  totals: Totals;
}

const TabelaVendas: React.FC<TabelaVendasProps> = ({ products, totals }) => {
  return (
    <div className="lg:col-span-2 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="text-blue-600" />
          <h2 className="text-xl font-bold text-gray-900">Vendas por Produto</h2>
        </div>
        <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
          Ver todas as bombas <ArrowRight size={16} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Leitura (Ini/Fim)</th>
                <th className="px-6 py-4">Litros</th>
                <th className="px-6 py-4">Preço (Prat. / Sugerido)</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Lucro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm italic">
                    Nenhum registro de vendas no período.
                  </td>
                </tr>
              ) : (
                products.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${item.colorClass}`}>
                          {item.code}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.bicos}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs font-mono">
                        <span className="text-gray-400">{item.readings.start?.toLocaleString('pt-BR') || '-'}</span>
                        <span className="text-gray-900 font-bold">{item.readings.end?.toLocaleString('pt-BR') || '-'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{item.volume.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{formatarMoeda(item.price)}</span>
                        {item.suggestedPrice && (
                          <span className="text-xs text-gray-400" title="Preço Sugerido (Custo + Despesas)">
                            Sug: {formatarMoeda(item.suggestedPrice)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400 uppercase font-bold">R$</span>
                        <span className="text-sm font-bold text-gray-900">{item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${item.margin < 10 ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'}`}>
                        {formatarMoeda(item.profit)}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">{item.margin.toFixed(1)}% margem</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-gray-50 border-t border-gray-100">
              <tr>
                <td className="px-6 py-4 font-bold text-gray-900 text-sm">Totais Consolidados</td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 font-bold text-gray-900 text-sm">{totals.volume.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                <td className="px-6 py-4 text-center text-gray-400">-</td>
                <td className="px-6 py-4 text-right font-bold text-gray-900 text-sm">
                  {formatarMoeda(totals.revenue)}
                </td>
                <td className="px-6 py-4 text-right font-bold text-blue-600 text-sm">
                  {formatarMoeda(totals.profit)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TabelaVendas;
