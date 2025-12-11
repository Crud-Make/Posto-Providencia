
import React, { useEffect, useState } from 'react';
import { 
  Download, 
  Plus, 
  Banknote, 
  Receipt, 
  AlertTriangle,
  Calendar,
  ChevronDown,
  Loader2
} from 'lucide-react';
import KPICard from './KPICard';
import FuelVolumeChart from './FuelVolumeChart';
import PaymentMixChart from './PaymentMixChart';
import ClosingsTable from './ClosingsTable';
import PerformanceSidebar from './PerformanceSidebar';
import { fetchDashboardData } from '../services/api';
import { FuelData, PaymentMethod, AttendantClosing, AttendantPerformance } from '../types';

interface DashboardScreenProps {
  onNewClosing: () => void;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ onNewClosing }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    fuelData: FuelData[];
    paymentData: PaymentMethod[];
    closingsData: AttendantClosing[];
    performanceData: AttendantPerformance[];
    kpis: {
      totalSales: number;
      avgTicket: number;
      totalDivergence: number;
    }
  } | null>(null);

  useEffect(() => {
    // Simulating Next.js data fetching (Client Component)
    const loadData = async () => {
      try {
        const dashboardData = await fetchDashboardData();
        setData(dashboardData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] w-full text-blue-600">
        <Loader2 size={48} className="animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Carregando dados do sistema...</p>
      </div>
    );
  }

  // Safety check
  if (!data) return null;

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      {/* Page Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-gray-500 mt-1">Acompanhe os indicadores do dia e o status operacional.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
            <Download size={16} />
            Exportar
          </button>
          <button 
            onClick={onNewClosing}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-800 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Novo Fechamento
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <div className="relative group">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm cursor-pointer hover:border-gray-300 transition-colors">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-gray-500">Data:</span>
            <span className="font-semibold text-gray-900">Hoje</span>
            <ChevronDown size={14} className="text-gray-400 ml-2" />
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm cursor-pointer hover:border-gray-300 transition-colors">
           <span className="text-gray-500">Frentista:</span>
           <span className="font-semibold text-gray-900">Todos</span>
           <ChevronDown size={14} className="text-gray-400 ml-2" />
        </div>

        <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm cursor-pointer hover:border-gray-300 transition-colors">
           <span className="text-gray-500">Turno:</span>
           <span className="font-semibold text-gray-900">Todos</span>
           <ChevronDown size={14} className="text-gray-400 ml-2" />
        </div>

        <button className="ml-auto text-sm text-blue-700 font-medium hover:underline">
          Limpar Filtros
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KPICard 
          title="TOTAL VENDIDO"
          value={`R$ ${data.kpis.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trendValue="+12%"
          trendLabel="vs. ontem"
          isNegativeTrend={false}
          Icon={Banknote}
          iconBgColor="bg-red-50"
          iconColor="text-red-400"
        />
        <KPICard 
          title="TICKET MÉDIO"
          value={`R$ ${data.kpis.avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trendValue="+5%"
          trendLabel="vs. ontem"
          isNegativeTrend={false}
          Icon={Receipt}
          iconBgColor="bg-gray-100"
          iconColor="text-gray-400"
        />
        <KPICard 
          title="DIVERGÊNCIA TOTAL"
          value={`R$ ${data.kpis.totalDivergence.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          trendValue="0%"
          trendLabel="Sem alertas críticos"
          isNegativeTrend={false}
          alert={data.kpis.totalDivergence > 50}
          Icon={AlertTriangle}
          iconBgColor="bg-green-50"
          iconColor="text-green-500"
        />
      </div>

      {/* Main Grid: Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column (Charts) */}
        <div className="lg:col-span-2 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FuelVolumeChart data={data.fuelData} />
              <PaymentMixChart data={data.paymentData} />
           </div>
           
           {/* Table - Full width of left col */}
           <ClosingsTable data={data.closingsData} />
        </div>

        {/* Right Column (Sidebar) */}
        <div className="lg:col-span-1">
          <PerformanceSidebar data={data.performanceData} />
        </div>
      </div>
    </div>
  );
};

export default DashboardScreen;
