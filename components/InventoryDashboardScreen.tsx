
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

interface InventoryDashboardProps {
  onRegisterPurchase: () => void;
}

const InventoryDashboardScreen: React.FC<InventoryDashboardProps> = ({ onRegisterPurchase }) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchInventoryData();
        setItems(data.items);
        setAlerts(data.alerts);
        setTransactions(data.transactions);
      } catch (error) {
        console.error("Failed to load inventory data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

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
          <p className="text-gray-500 mt-2 max-w-2xl">Monitore os níveis dos tanques, previsões de reabastecimento e alertas críticos de todas as bombas.</p>
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

      {/* Fuel Status Cards (Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <FuelTank
            key={item.id}
            productName={item.name}
            code={item.code}
            currentVolume={item.volume}
            capacity={item.capacity}
            color={item.color as any}
            status={item.status as any}
            daysRemaining={item.daysRemaining}
          />
        ))}
      </div>

      {/* Middle Section: Alerts & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Alerts Panel */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">Ações Recomendadas</h3>
              <span className="px-2 py-1 rounded-full bg-red-50 text-red-600 text-xs font-bold">{alerts.length} Alertas</span>
            </div>

            <div className="space-y-4 flex-1">
              {alerts.length === 0 ? <p className="text-sm text-gray-400 italic">Nenhum alerta pendente.</p> : alerts.map((alert) => (
                <div key={alert.id} className={`p-4 rounded-lg border ${alert.type === 'critical' ? 'bg-red-50 border-red-100' : 'bg-yellow-50 border-yellow-100'}`}>
                  <div className="flex gap-3 items-start">
                    <div className={`mt-0.5 ${alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500'}`}>
                      {alert.type === 'critical' ? <AlertOctagon size={24} fill={alert.type === 'critical' ? 'currentColor' : 'none'} className="text-red-500" /> : <AlertTriangle size={24} fill="currentColor" className="text-yellow-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">{alert.title}</p>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{alert.message}</p>
                      <div className="flex gap-2 mt-3">
                        {alert.actionSecondary && (
                          <button className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">{alert.actionSecondary}</button>
                        )}
                        <button className={`flex-1 px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm ${alert.type === 'critical' ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                          {alert.actionPrimary}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="w-full mt-4 text-xs font-bold text-[#13ec6d] hover:text-[#0eb553] transition-colors flex items-center justify-center gap-1">
              Ver todos os alertas
              <ArrowRight size={16} />
            </button>
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

            {/* Visual Chart Representation using Divs as per HTML design */}
            <div className="flex-1 flex items-end justify-between gap-2 sm:gap-4 h-64 w-full pt-4">
              {[
                { day: 'Seg', sales: 0, entry: 0 },
                { day: 'Ter', sales: 0, entry: 0 },
                { day: 'Qua', sales: 0, entry: 0 },
                { day: 'Qui', sales: 0, entry: 0 },
                { day: 'Sex', sales: 0, entry: 0 },
                { day: 'Sab', sales: 0, entry: 0 },
                { day: 'Dom', sales: 0, entry: 0 },
              ].map((data, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 flex-1 group cursor-pointer h-full justify-end">
                  <div className="w-full flex gap-1 h-full items-end justify-center relative">
                    {/* Sales Bar */}
                    <div
                      className="w-3 sm:w-6 bg-[#13ec6d] rounded-t-sm group-hover:bg-[#13ec6d]/90 transition-all relative"
                      style={{ height: `${data.sales}%` }}
                    >
                    </div>
                    {/* Entry Bar */}
                    <div
                      className="w-3 sm:w-6 bg-gray-300 rounded-t-sm relative group-hover:bg-gray-400 transition-all"
                      style={{ height: `${data.entry}%` }}
                    >
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
      <InventoryFinancialCharts items={items} />

      {/* Financial Reconciliation & Stock Analysis (Excel Match) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
          <div>
            <h3 className="font-bold text-lg text-gray-900">Conciliação e Financeiro</h3>
            <p className="text-sm text-gray-500">Análise financeira do estoque atual e projeção de lucro</p>
          </div>
          <div className="flex gap-2">
            <div className="px-3 py-1 rounded bg-[#e7f3ec] border border-[#13ec6d]/20 text-[#0d1b13] text-xs font-bold flex flex-col items-end">
              <span className="text-[10px] text-[#4c9a6c] uppercase">Estoque (Custo)</span>
              R$ -
            </div>
            <div className="px-3 py-1 rounded bg-blue-50 border border-blue-100 text-[#0d1b13] text-xs font-bold flex flex-col items-end">
              <span className="text-[10px] text-blue-500 uppercase">Estoque (Venda)</span>
              R$ -
            </div>
            <div className="px-3 py-1 rounded bg-[#13ec6d] text-[#0d1b13] text-xs font-bold flex flex-col items-end shadow-sm">
              <span className="text-[10px] text-[#0d1b13]/60 uppercase">Lucro Projetado</span>
              R$ -
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wider text-gray-500 font-bold text-center">
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 bg-gray-100/50">Estoque Anterior</th>
                <th className="px-4 py-3 bg-gray-100/50">+ Compras</th>
                <th className="px-4 py-3 bg-gray-100/50">- Vendas</th>
                <th className="px-4 py-3 bg-blue-50/30 text-blue-700">Estoque Atual</th>
                <th className="px-4 py-3 bg-red-50/30 text-red-700">Perda/Sobra</th>
                <th className="px-4 py-3 text-right">Custo Médio</th>
                <th className="px-4 py-3 text-right">Preço Venda</th>
                <th className="px-4 py-3 text-right">Valor em Estoque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item) => {
                // Valores reais - quando integrado com backend
                const costPrice = item.costPrice || 0;
                const sellPrice = item.sellPrice || 0;
                const stockValue = item.volume * costPrice;
                const previousStock = item.previousStock || 0;
                const purchases = item.purchases || 0;
                const sales = item.sales || 0;

                // Define row colors based on product code
                let rowClass = "";
                if (item.code === 'GC') rowClass = "border-l-4 border-l-red-500";
                if (item.code === 'GA') rowClass = "border-l-4 border-l-blue-400";
                if (item.code === 'ET') rowClass = "border-l-4 border-l-green-400";
                if (item.code === 'S10') rowClass = "border-l-4 border-l-yellow-400";

                return (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${rowClass}`}>
                    <td className="px-4 py-3 font-bold text-gray-900 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-gray-300"></span>
                      {item.name}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 bg-gray-50/30">{previousStock > 0 ? `${previousStock.toLocaleString('pt-BR')} L` : '-'}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-medium bg-gray-50/30">{purchases > 0 ? `+ ${purchases.toLocaleString('pt-BR')}` : '-'}</td>
                    <td className="px-4 py-3 text-center text-red-500 font-medium bg-gray-50/30">{sales > 0 ? `- ${sales.toLocaleString('pt-BR')}` : '-'}</td>
                    <td className="px-4 py-3 text-center font-bold text-[#0d1b13] bg-blue-50/10">{item.volume.toLocaleString('pt-BR')} L</td>
                    <td className="px-4 py-3 text-center text-gray-400 bg-red-50/10">-</td>
                    <td className="px-4 py-3 text-right text-gray-600">{costPrice > 0 ? `R$ ${costPrice.toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{sellPrice > 0 ? `R$ ${sellPrice.toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#0d1b13]">{stockValue > 0 ? `R$ ${stockValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
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
