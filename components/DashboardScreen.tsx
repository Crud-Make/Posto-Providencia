
import React, { useEffect, useState, useRef } from 'react';
import {
  Download,
  Plus,
  Banknote,
  Receipt,
  AlertTriangle,
  Calendar,
  ChevronDown,
  Loader2,
  User,
  Clock
} from 'lucide-react';
import KPICard from './KPICard';
import FuelVolumeChart from './FuelVolumeChart';
import PaymentMixChart from './PaymentMixChart';
import ClosingsTable from './ClosingsTable';
import PerformanceSidebar from './PerformanceSidebar';
import { fetchDashboardData, frentistaService, turnoService } from '../services/api';
import { FuelData, PaymentMethod, AttendantClosing, AttendantPerformance } from '../types';

interface DashboardScreenProps {
  onNewClosing: () => void;
}

interface Frentista {
  id: number;
  nome: string;
}

interface Turno {
  id: number;
  nome: string;
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

  // Filters state
  const [selectedDate, setSelectedDate] = useState<string>('hoje');
  const [selectedFrentista, setSelectedFrentista] = useState<number | null>(null);
  const [selectedTurno, setSelectedTurno] = useState<number | null>(null);

  // Dropdown visibility
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showFrentistaDropdown, setShowFrentistaDropdown] = useState(false);
  const [showTurnoDropdown, setShowTurnoDropdown] = useState(false);

  // Options lists
  const [frentistas, setFrentistas] = useState<Frentista[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);

  // Refs for click outside
  const dateRef = useRef<HTMLDivElement>(null);
  const frentistaRef = useRef<HTMLDivElement>(null);
  const turnoRef = useRef<HTMLDivElement>(null);

  // Load filter options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [frentistasData, turnosData] = await Promise.all([
          frentistaService.getAll(),
          turnoService.getAll()
        ]);
        setFrentistas(frentistasData);
        setTurnos(turnosData);
      } catch (error) {
        console.error("Failed to load filter options", error);
      }
    };
    loadOptions();
  }, []);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
      }
      if (frentistaRef.current && !frentistaRef.current.contains(event.target as Node)) {
        setShowFrentistaDropdown(false);
      }
      if (turnoRef.current && !turnoRef.current.contains(event.target as Node)) {
        setShowTurnoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const dashboardData = await fetchDashboardData(selectedDate, selectedFrentista, selectedTurno);
        setData(dashboardData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedDate, selectedFrentista, selectedTurno]);

  const clearFilters = () => {
    setSelectedDate('hoje');
    setSelectedFrentista(null);
    setSelectedTurno(null);
  };

  const getDateLabel = () => {
    switch (selectedDate) {
      case 'hoje': return 'Hoje';
      case 'ontem': return 'Ontem';
      case 'semana': return 'Última Semana';
      case 'mes': return 'Este Mês';
      default: return 'Hoje';
    }
  };

  const getFrentistaLabel = () => {
    if (!selectedFrentista) return 'Todos';
    const f = frentistas.find(fr => fr.id === selectedFrentista);
    return f?.nome || 'Todos';
  };

  const getTurnoLabel = () => {
    if (!selectedTurno) return 'Todos';
    const t = turnos.find(tu => tu.id === selectedTurno);
    return t?.nome || 'Todos';
  };

  if (loading && !data) {
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
          <h1 className="text-3xl font-bold text-gray-900">Visão Geral do Posto</h1>
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
        {/* Date Filter */}
        <div className="relative" ref={dateRef}>
          <div
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm cursor-pointer hover:border-gray-300 transition-colors"
          >
            <Calendar size={16} className="text-gray-400" />
            <span className="text-gray-500">Data:</span>
            <span className="font-semibold text-gray-900">{getDateLabel()}</span>
            <ChevronDown size={14} className={`text-gray-400 ml-2 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
          </div>
          {showDateDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              {[
                { value: 'hoje', label: 'Hoje' },
                { value: 'ontem', label: 'Ontem' },
                { value: 'semana', label: 'Última Semana' },
                { value: 'mes', label: 'Este Mês' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setSelectedDate(opt.value); setShowDateDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedDate === opt.value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Frentista Filter */}
        <div className="relative" ref={frentistaRef}>
          <div
            onClick={() => setShowFrentistaDropdown(!showFrentistaDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm cursor-pointer hover:border-gray-300 transition-colors"
          >
            <User size={16} className="text-gray-400" />
            <span className="text-gray-500">Frentista:</span>
            <span className="font-semibold text-gray-900">{getFrentistaLabel()}</span>
            <ChevronDown size={14} className={`text-gray-400 ml-2 transition-transform ${showFrentistaDropdown ? 'rotate-180' : ''}`} />
          </div>
          {showFrentistaDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
              <button
                onClick={() => { setSelectedFrentista(null); setShowFrentistaDropdown(false); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedFrentista === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
              >
                Todos
              </button>
              {frentistas.map(f => (
                <button
                  key={f.id}
                  onClick={() => { setSelectedFrentista(f.id); setShowFrentistaDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedFrentista === f.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                >
                  {f.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Turno Filter */}
        <div className="relative" ref={turnoRef}>
          <div
            onClick={() => setShowTurnoDropdown(!showTurnoDropdown)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm cursor-pointer hover:border-gray-300 transition-colors"
          >
            <Clock size={16} className="text-gray-400" />
            <span className="text-gray-500">Turno:</span>
            <span className="font-semibold text-gray-900">{getTurnoLabel()}</span>
            <ChevronDown size={14} className={`text-gray-400 ml-2 transition-transform ${showTurnoDropdown ? 'rotate-180' : ''}`} />
          </div>
          {showTurnoDropdown && (
            <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
              <button
                onClick={() => { setSelectedTurno(null); setShowTurnoDropdown(false); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedTurno === null ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
              >
                Todos
              </button>
              {turnos.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTurno(t.id); setShowTurnoDropdown(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${selectedTurno === t.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                >
                  {t.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={clearFilters}
          className="ml-auto text-sm text-blue-700 font-medium hover:underline"
        >
          Limpar Filtros
        </button>
      </div>

      {/* Loading overlay for filter changes */}
      {loading && (
        <div className="fixed inset-0 bg-white/50 flex items-center justify-center z-40">
          <Loader2 size={32} className="animate-spin text-blue-600" />
        </div>
      )}

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

      {/* Main Grid: Charts & Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <FuelVolumeChart data={data.fuelData} />
        <PaymentMixChart data={data.paymentData} />
        <PerformanceSidebar data={data.performanceData} />
      </div>

      {/* Closings Table */}
      <div className="mb-8">
        <ClosingsTable data={data.closingsData} />
      </div>
    </div>
  );
};

export default DashboardScreen;
