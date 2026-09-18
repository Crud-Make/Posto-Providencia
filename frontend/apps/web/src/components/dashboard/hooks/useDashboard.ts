/**
 * Hook de dados do Dashboard.
 *
 * @remarks
 * Centraliza carregamento/estado de filtros e padroniza a extração de dados de `ApiResponse`.
 * Estado de UI dos dropdowns (abertura, clique fora) vive no componente `filter-dropdown`.
 */
import { useState, useEffect } from 'react';
import { usePosto } from '../../../contexts/usePosto';
import { usePeriodo } from '../../../contexts/usePeriodo';
import { fetchDashboardData, frentistaService } from '../../../services/api';
import type { JanelaDoRateio } from '../../../services/api/dashboard.api';
import type { Frentista } from '@posto/types';
import { FuelData, PaymentMethod, AttendantClosing, AttendantPerformance } from '../../../types/ui/dashboard';
import { hojeIso } from '../../../utils/periodo';
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
  /** `null` = produto vendido sem compra no mês (ver `produtosSemCompra`). */
  totalProfit?: number | null;
  produtosSemCompra?: readonly string[];
  /**
   * Mês civil de onde saíram a compra e a despesa rateada. Pela API Laravel, em período que
   * atravessa meses, cobre mais de um mês (decisão do dono, 18/09/2026) — a tela avisa.
   */
  janelaDoRateio?: JanelaDoRateio;
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

  // Filters state — o período vem do contexto: é o mesmo das demais telas de análise.
  const { periodo, definirPeriodo: setPeriodo } = usePeriodo();
  const [selectedFrentista, setSelectedFrentista] = useState<number | null>(null);

  // Options lists
  const [frentistas, setFrentistas] = useState<Frentista[]>([]);

  // Load filter options
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const frentistasResponse = await frentistaService.getAll(postoAtivoId);
        setFrentistas(isSuccess(frentistasResponse) ? frentistasResponse.data : []);
      } catch (error) {
        console.error("Failed to load filter options", error);
      }
    };
    if (postoAtivoId) {
      loadOptions();
    }
  }, [postoAtivoId]);

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Modo diário: passa null para turno (carrega dados do dia inteiro)
        // [18/01 10:34] Extraído payload de ApiResponse para evitar `kpis` indefinido no Dashboard.
        const dashboardResponse = (await fetchDashboardData(
          periodo.inicio,
          periodo.fim,
          selectedFrentista,
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
  }, [periodo, selectedFrentista, postoAtivoId]);

  const clearFilters = () => {
    const hoje = hojeIso();
    setPeriodo({ inicio: hoje, fim: hoje });
    setSelectedFrentista(null);
  };

  const getFrentistaLabel = () => {
    if (!selectedFrentista) return 'Todos';
    const f = frentistas.find(fr => fr.id === selectedFrentista);
    return f?.nome || 'Todos';
  };

  return {
    loading,
    data,
    periodo,
    setPeriodo,
    selectedFrentista,
    setSelectedFrentista,
    frentistas,
    clearFilters,
    getFrentistaLabel
  };
};
