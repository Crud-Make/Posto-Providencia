/**
 * Hook de dados do Dashboard.
 *
 * @remarks
 * Centraliza carregamento/estado de filtros e padroniza a extração de dados de `ApiResponse`.
 */
import { useState, useEffect, useRef } from 'react';
import { usePosto } from '../../../contexts/PostoContext';
import { fetchDashboardData, frentistaService } from '../../../services/api';
import type { Frentista } from '@posto/types';
import { FuelData, PaymentMethod, AttendantClosing, AttendantPerformance } from '../../../types/ui/dashboard';
import type { ApiResponse } from '../../../types/ui/response-types';
import { isSuccess } from '../../../types/ui/response-types';

/**
 * KPIs do Dashboard.
 */
interface DashboardKpis {
  totalSales: number;
  avgTicket: number;
  totalDivergence: number;
  totalVolume?: number;
  totalProfit?: number;
}

/**
 * Payload consolidado do Dashboard.
 */
interface DashboardData {
  fuelData: FuelData[];
  paymentData: PaymentMethod[];
  closingsData: AttendantClosing[];
  performanceData: AttendantPerformance[];
  kpis: DashboardKpis;
}

/**
 * Extrai o `data` de uma `ApiResponse` com mensagem de erro consistente.
 *
 * @param response - Resposta retornada pelos services
 */
function extractApiData<T>(response: ApiResponse<T>): T {
  if (isSuccess(response)) return response.data;
  throw new Error(response.error || 'Erro ao buscar dados do serviço');
}

export const useDashboard = () => {
  const { postoAtivoId } = usePosto();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  // Filters state
  const [selectedDate, setSelectedDate] = useState<string>('hoje');
  const [selectedFrentista, setSelectedFrentista] = useState<number | null>(null);

  // Dropdown visibility
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showFrentistaDropdown, setShowFrentistaDropdown] = useState(false);

  // Options lists
  const [frentistas, setFrentistas] = useState<Frentista[]>([]);

  // Refs for click outside
  const dateRef = useRef<HTMLDivElement>(null);
  const frentistaRef = useRef<HTMLDivElement>(null);

  // Load filter options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [frentistasData] = await Promise.all([
          frentistaService.getAll(postoAtivoId),
        ]);
        setFrentistas(frentistasData);
      } catch (error) {
        console.error("Failed to load filter options", error);
      }
    };
    if (postoAtivoId) {
      loadOptions();
    }
  }, [postoAtivoId]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
      }
      if (frentistaRef.current && !frentistaRef.current.contains(event.target as Node)) {
        setShowFrentistaDropdown(false);
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
        // Modo diário: passa null para turno (carrega dados do dia inteiro)
        // [18/01 10:34] Extraído payload de ApiResponse para evitar `kpis` indefinido no Dashboard.
        const dashboardResponse = (await fetchDashboardData(
          selectedDate,
          selectedFrentista,
          null,
          postoAtivoId
        )) as ApiResponse<DashboardData>;
        const dashboardData = extractApiData(dashboardResponse);
        setData(dashboardData);
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    if (postoAtivoId) {
      loadData();
    }
  }, [selectedDate, selectedFrentista, postoAtivoId]);

  const clearFilters = () => {
    setSelectedDate('hoje');
    setSelectedFrentista(null);
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

  return {
    loading,
    data,
    selectedDate,
    setSelectedDate,
    selectedFrentista,
    setSelectedFrentista,
    showDateDropdown,
    setShowDateDropdown,
    showFrentistaDropdown,
    setShowFrentistaDropdown,
    frentistas,
    dateRef,
    frentistaRef,
    clearFilters,
    getDateLabel,
    getFrentistaLabel
  };
};
