
import React, { useState, useEffect } from 'react';
import {
  Fuel,
  Leaf,
  Truck,
  RefreshCw,
  Plus,
  Calendar,
  AlertTriangle,
  AlertOctagon,
  TrendingUp,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  FileText,
  ShoppingCart,
  Loader2
} from 'lucide-react';
import { fetchInventoryData } from '../services/api';
import { InventoryItem, InventoryAlert, InventoryTransaction } from '../types';
import InventoryFinancialCharts from './InventoryFinancialCharts';
import FuelTank from './FuelTank';
import StockManagementScreen from './StockManagementScreen';

interface InventoryDashboardProps {
  onRegisterPurchase: () => void;
  initialTab?: 'fuels' | 'stock';
}

const InventoryDashboardScreen: React.FC<InventoryDashboardProps> = ({ onRegisterPurchase, initialTab = 'fuels' }) => {
  const [activeTab, setActiveTab] = useState<'fuels' | 'stock'>(initialTab);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({ totalCost: 0, totalSell: 0, projectedProfit: 0 });
  const [measurements, setMeasurements] = useState<Record<string, string>>({});

  const handleMeasurementChange = (id: string, value: string) => {
    // Permite apenas numeros e virgula/ponto
    const formatted = value.replace(/[^0-9,.]/g, '');
    setMeasurements(prev => ({ ...prev, [id]: formatted }));
  };

  const parseMeasure = (val: string) => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.')) || 0;
  };

  // Recalcula totais baseado no físico (se houver) ou lógico
  const currentSummary = React.useMemo(() => {
    if (items.length === 0) return summary;

    let totalCost = 0;
    let totalSell = 0;

    items.forEach(item => {
      const measureVal = measurements[item.id];
      const volume = measureVal ? parseMeasure(measureVal) : item.volume;
      totalCost += volume * (item.costPrice || 0);
      totalSell += volume * (item.sellPrice || 0);
    });

    return { totalCost, totalSell, projectedProfit: totalSell - totalCost };
  }, [items, measurements, summary]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] w-full text-blue-600">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Sincronizando estoque...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#13ec6d]/10 text-[#0eb553] border border-[#13ec6d]/20">Tempo Real</span>
            <span className="text-xs text-gray-400">Atualizado agora</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">Dashboard de Estoque</h2>
          <p className="text-gray-500 mt-2 max-w-2xl">Gerencie combustíveis, lubrificantes e outros produtos do posto em um só lugar.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
            <RefreshCw size={18} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={onRegisterPurchase}
            className="flex items-center gap-2 px-4 h-10 rounded-lg bg-[#13ec6d] text-[#0d1b13] text-sm font-bold hover:bg-[#13ec6d]/90 transition-colors shadow-sm shadow-[#13ec6d]/20"
          >
            <Plus size={18} />
            <span>Registrar Compra</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('fuels')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm
              ${activeTab === 'fuels'
                ? 'border-[#13ec6d] text-[#0d1b13]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Combustíveis (Tanques)
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm
              ${activeTab === 'stock'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Lubrificantes e Produtos
          </button>
        </nav>
      </div>

      {activeTab === 'stock' ? (
        <StockManagementScreen />
      ) : (
        <>
          {/* Fuel Status Cards (Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {items.map((item) => {
              // Atualiza volume visual se houver medição manual
              const measureVal = measurements[item.id];
              const hasMeasure = measureVal && measureVal !== '';
              const displayVol = hasMeasure ? parseMeasure(measureVal) : item.volume;
              const percent = Math.min(100, Math.round((displayVol / item.capacity) * 100));

              return (
                <FuelTank
                  key={item.id}
                  productName={item.name}
                  code={item.code}
                  currentVolume={displayVol}
                  capacity={item.capacity}
                  color={item.color as any}
                  status={percent < 10 ? 'CRÍTICO' : percent < 20 ? 'BAIXO' : 'OK'}
                  daysRemaining={item.daysRemaining}
                />
              );
            })}
          </div>

          {/* Middle Section: Alerts & Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Alerts Panel */}
            <div className="lg:col-span-1 flex flex-col gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-gray-900">Ações Recomendadas</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${alerts.some(a => a.type === 'critical')
                    ? 'bg-red-50 text-red-600 animate-pulse-subtle'
                    : 'bg-yellow-50 text-yellow-600'
                    }`}>
                    {alerts.length} {alerts.length === 1 ? 'Alerta' : 'Alertas'}
                  </span>
                </div>

                <div className="space-y-4 flex-1">
                  {alerts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                        <TrendingUp size={24} className="text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">Tudo em ordem!</p>
                      <p className="text-xs text-gray-400 mt-1">Nenhum alerta pendente no momento.</p>
                    </div>
                  ) : alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border transition-all duration-300 ${alert.type === 'critical'
                        ? 'bg-red-50 border-red-200 animate-pulse-subtle'
                        : 'bg-yellow-50 border-yellow-100'
                        }`}
                    >
                      <div className="flex gap-3 items-start">
                        <div className={`mt-0.5 flex-shrink-0 ${alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500'}`}>
                          {alert.type === 'critical'
                            ? <AlertOctagon size={24} fill="currentColor" className="text-red-500" />
                            : <AlertTriangle size={24} fill="currentColor" className="text-yellow-500" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-gray-900">{alert.title}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{alert.message}</p>
                          <div className="flex gap-2 mt-3">
                            {alert.actionSecondary && (
                              <button className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                                {alert.actionSecondary}
                              </button>
                            )}
                            <button
                              onClick={onRegisterPurchase}
                              className={`flex-1 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm ${alert.type === 'critical'
                                ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                                : 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-500/20'
                                }`}
                            >
                              {alert.actionPrimary}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {alerts.length > 0 && (
                  <button className="w-full mt-4 text-xs font-bold text-[#13ec6d] hover:text-[#0eb553] transition-colors flex items-center justify-center gap-1">
                    Ver todos os alertas
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Chart Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 h-full flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">Movimentação dos Últimos 7 Dias</h3>
                    <p className="text-sm text-gray-500">Comparativo de Vendas vs. Entradas de Combustível</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-[#13ec6d]"></span>
                      <span className="text-xs font-medium text-gray-500">Vendas (L)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full bg-gray-300"></span>
                      <span className="text-xs font-medium text-gray-500">Entradas (L)</span>
                    </div>
                    <select className="text-xs border-none bg-gray-100 rounded-lg py-1.5 pl-3 pr-8 font-medium text-gray-700 focus:ring-0 cursor-pointer ml-2">
                      <option>Últimos 7 dias</option>
                      <option>Este Mês</option>
                    </select>
                  </div>
                </div>

                {/* Visual Chart Representation */}
                <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 h-64 w-full pt-4">
                  {chartData.map((data, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer h-full justify-end">
                      <div className="w-full flex gap-1 h-full items-end justify-center relative">
                        {/* Sales Bar */}
                        <div
                          className="w-3 sm:w-6 bg-[#13ec6d] rounded-t-sm group-hover:bg-[#13ec6d]/90 transition-all relative"
                          style={{ height: `${data.salesPerc || 0}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                            Venda: {data.sales.toLocaleString()} L
                          </div>
                        </div>
                        {/* Entry Bar */}
                        <div
                          className="w-3 sm:w-6 bg-gray-300 rounded-t-sm relative group-hover:bg-gray-400 transition-all"
                          style={{ height: `${data.entryPerc || 0}%` }}
                        >
                          <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                            Entrada: {data.entry.toLocaleString()} L
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{data.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Charts Section */}
          <InventoryFinancialCharts items={items.map(i => {
            // Passa para os gráficos os valores ajustados pelo físico
            const measureVal = measurements[i.id];
            const volume = measureVal ? parseMeasure(measureVal) : i.volume;
            return { ...i, volume };
          })} />

          {/* Financial Reconciliation & Stock Analysis */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="font-bold text-lg text-gray-900">Conciliação e Financeiro</h3>
                <p className="text-sm text-gray-500">Análise financeira do estoque atual e projeção de lucro</p>
              </div>
              <div className="flex gap-2">
                <div className="px-3 py-1 rounded bg-[#e7f3ec] border border-[#13ec6d]/20 text-[#0d1b13] text-xs font-bold flex flex-col items-end">
                  <span className="text-[10px] text-[#4c9a6c] uppercase">Estoque (Custo)</span>
                  R$ {currentSummary.totalCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </div>
                <div className="px-3 py-1 rounded bg-blue-50 border border-blue-100 text-[#0d1b13] text-xs font-bold flex flex-col items-end">
                  <span className="text-[10px] text-blue-500 uppercase">Estoque (Venda)</span>
                  R$ {currentSummary.totalSell.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </div>
                <div className="px-3 py-1 rounded bg-[#13ec6d] text-[#0d1b13] text-xs font-bold flex flex-col items-end shadow-sm">
                  <span className="text-[10px] text-[#0d1b13]/60 uppercase">Lucro Projetado</span>
                  R$ {currentSummary.projectedProfit.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-bold text-center">
                    <th className="px-4 py-3 text-left">Produto</th>
                    <th className="px-4 py-3 bg-gray-100/50">Anterior</th>
                    <th className="px-4 py-3 bg-gray-100/50">+ Cmpr</th>
                    <th className="px-4 py-3 bg-gray-100/50">- Vnd</th>
                    <th className="px-4 py-3 bg-blue-50/30 text-blue-700">Lógico</th>
                    <th className="px-4 py-3 bg-yellow-50/30 text-yellow-700 w-32">Físico</th>
                    <th className="px-4 py-3 bg-red-50/30 text-red-700">P/S</th>
                    <th className="px-4 py-3 text-right">Custo Médio</th>
                    <th className="px-4 py-3 text-right">Valor Estoque</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const measureVal = measurements[item.id];
                    const physicalVol = measureVal ? parseMeasure(measureVal) : item.volume;
                    const diff = measureVal ? physicalVol - item.volume : 0;

                    const stockValue = physicalVol * item.costPrice;

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors text-center">
                        <td className="px-4 py-4 text-left font-bold text-gray-900 border-l-4" style={{ borderColor: item.color === 'green' ? '#13ec6d' : item.color }}>
                          {item.name}
                        </td>
                        <td className="px-4 py-4 text-gray-500">{item.previousStock?.toLocaleString() || 0} L</td>
                        <td className="px-4 py-4 text-green-600 font-medium">{item.totalPurchases > 0 ? `+ ${item.totalPurchases.toLocaleString()}` : '-'}</td>
                        <td className="px-4 py-4 text-red-500 font-medium">{item.totalSales > 0 ? `- ${item.totalSales.toLocaleString()}` : '-'}</td>
                        <td className="px-4 py-4 bg-blue-50/20 font-bold text-blue-700">{item.volume.toLocaleString()} L</td>
                        <td className="px-4 py-4 bg-yellow-50/20">
                          <input
                            type="text"
                            value={measurements[item.id] || ''}
                            onChange={(e) => handleMeasurementChange(item.id, e.target.value)}
                            placeholder={item.volume.toLocaleString('pt-BR')}
                            className="w-full text-center bg-white border border-gray-300 rounded px-2 py-1 text-sm font-bold shadow-sm focus:border-yellow-500 focus:ring-1 focus:ring-yellow-200 outline-none"
                          />
                        </td>
                        <td className={`px-4 py-4 font-bold ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                          {measureVal ? (diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()) : '-'}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-500 font-medium">R$ {item.costPrice.toFixed(2)}</td>
                        <td className="px-4 py-4 text-right font-bold text-gray-900">R$ {stockValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-20">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-900">Últimos Registros</h3>
              <button className="text-sm font-bold text-[#13ec6d] hover:text-[#0eb553] transition-colors">Ver Histórico</button>
            </div>
            <div className="overflow-x-auto">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm italic">Nenhum registro encontrado.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-400 uppercase text-xs font-bold">
                    <tr>
                      <th className="px-6 py-3">Data/Hora</th>
                      <th className="px-6 py-3">Tipo</th>
                      <th className="px-6 py-3">Combustível</th>
                      <th className="px-6 py-3 text-right">Quantidade</th>
                      <th className="px-6 py-3">Responsável</th>
                      <th className="px-6 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-gray-900">{tx.date}</td>
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-1.5 text-gray-900 font-medium">
                            {tx.type === 'Venda' ? <ArrowDown size={16} className="text-green-500" /> : <ArrowUp size={16} className="text-blue-500" />}
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">{tx.product}</td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                          {tx.quantity > 0 ? `+ ${tx.quantity.toLocaleString('pt-BR')} L` : `${tx.quantity.toLocaleString('pt-BR')} L`}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{tx.responsible}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.status === 'Concluído' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </>
      )}

      {/* Sticky Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap justify-between items-center gap-4">
          <p className="text-xs text-gray-500 hidden sm:block">
            Último backup do sistema: Hoje às 03:00 AM • Versão 2.4.1
          </p>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm font-bold hover:bg-gray-50 transition-colors">
              <FileText size={20} />
              Relatório Completo
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-[#0d1b13] text-white text-sm font-bold hover:bg-black transition-colors shadow-lg">
              <ShoppingCart size={20} />
              Nova Cotação
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default InventoryDashboardScreen;
