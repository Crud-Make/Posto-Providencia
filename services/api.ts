
import { supabase } from './supabase';
import { 
  FuelData, 
  PaymentMethod, 
  AttendantClosing, 
  AttendantPerformance, 
  FuelSummary,
  NozzleData,
  ClosingAttendant,
  InventoryItem,
  InventoryAlert,
  InventoryTransaction,
  AttendantProfile,
  AttendantHistoryEntry,
  ProductConfig,
  NozzleConfig,
  ShiftConfig,
  MobileAuthResponse,
  MobileHomeData,
  MobileNotification
} from '../types';

interface DashboardData {
  fuelData: FuelData[];
  paymentData: PaymentMethod[];
  closingsData: AttendantClosing[];
  performanceData: AttendantPerformance[];
  summaryData: FuelSummary[];
  kpis: {
    totalSales: number;
    avgTicket: number;
    totalDivergence: number;
  }
}

interface ClosingData {
  summaryData: FuelSummary[];
  nozzleData: NozzleData[];
  attendantsData: ClosingAttendant[];
}

interface InventoryData {
  items: InventoryItem[];
  alerts: InventoryAlert[];
  transactions: InventoryTransaction[];
}

interface AttendantsManagementData {
  list: AttendantProfile[];
  history: AttendantHistoryEntry[];
}

interface SettingsData {
  products: ProductConfig[];
  nozzles: NozzleConfig[];
  shifts: ShiftConfig[];
}

// Helper generic to fetch data or return fallback
async function fetchTableData<T>(tableName: string, fallback: T): Promise<T> {
  try {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
        console.warn(`Supabase error fetching ${tableName}:`, error.message);
        return fallback;
    }
    // If table is empty, return fallback (which should now be empty array usually)
    if (!data || data.length === 0) return fallback;
    return data as unknown as T;
  } catch (e) {
    console.warn(`Connection error fetching ${tableName}:`, e);
    return fallback;
  }
}

// Dashboard
export const fetchDashboardData = async (): Promise<DashboardData> => {
  const [fuelData, paymentData, closingsData, performanceData, summaryData] = await Promise.all([
    fetchTableData<FuelData[]>('fuel_levels', []),
    fetchTableData<PaymentMethod[]>('payment_stats', []),
    fetchTableData<AttendantClosing[]>('closings', []),
    fetchTableData<AttendantPerformance[]>('attendant_performance', []),
    fetchTableData<FuelSummary[]>('daily_summary', [])
  ]);

  // Calculate KPIs dynamically based on fetched data
  const totalSales = summaryData.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
  // Simple logic for avgTicket based on transactions count simulation
  const avgTicket = totalSales > 0 ? totalSales / 150 : 0; 
  
  const totalDivergence = closingsData
    .filter(c => c.status === 'Divergente')
    .reduce((acc, curr) => {
        // In a real scenario, the difference value would be a property of AttendantClosing
        return acc + 50; 
    }, 0);

  return {
    fuelData,
    paymentData,
    closingsData,
    performanceData,
    summaryData,
    kpis: { totalSales, avgTicket, totalDivergence }
  };
};

// Daily Closing Screen
export const fetchClosingData = async (): Promise<ClosingData> => {
  const [summaryData, nozzleData, attendantsData] = await Promise.all([
    fetchTableData<FuelSummary[]>('daily_summary', []),
    fetchTableData<NozzleData[]>('nozzle_readings', []),
    fetchTableData<ClosingAttendant[]>('closing_attendants', [])
  ]);

  return {
    summaryData,
    nozzleData,
    attendantsData
  };
};

// Inventory Screen
export const fetchInventoryData = async (): Promise<InventoryData> => {
  const [items, alerts, transactions] = await Promise.all([
    fetchTableData<InventoryItem[]>('inventory_items', []),
    fetchTableData<InventoryAlert[]>('inventory_alerts', []),
    fetchTableData<InventoryTransaction[]>('inventory_transactions', [])
  ]);

  return {
    items,
    alerts,
    transactions
  };
};

// Attendants Management Screen
export const fetchAttendantsData = async (): Promise<AttendantsManagementData> => {
  const [list, history] = await Promise.all([
    fetchTableData<AttendantProfile[]>('attendants_list', []),
    fetchTableData<AttendantHistoryEntry[]>('attendant_history', [])
  ]);

  return {
    list,
    history
  };
};

// Settings Screen
export const fetchSettingsData = async (): Promise<SettingsData> => {
  const [products, nozzles, shifts] = await Promise.all([
    fetchTableData<ProductConfig[]>('products_config', []),
    fetchTableData<NozzleConfig[]>('nozzles_config', []),
    fetchTableData<ShiftConfig[]>('shifts_config', [])
  ]);

  return {
    products,
    nozzles,
    shifts
  };
};

// ==========================================
// MOBILE API EXTENSIONS (React Native Support)
// ==========================================

export const MobileService = {
  // 1. Mobile Authentication using Supabase Auth
  login: async (email: string, pass: string): Promise<MobileAuthResponse> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: pass,
        });

        if (error) throw error;
        if (!data.session || !data.user) throw new Error("No session created");

        // Fetch custom user profile info if exists in a separate table
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        return {
            token: data.session.access_token,
            user: {
                id: data.user.id,
                name: profile?.name || data.user.email?.split('@')[0] || 'Usuário',
                role: profile?.role || 'attendant',
                avatar: profile?.avatar || 'https://ui-avatars.com/api/?name=User&background=E0D0B8&color=fff'
            }
        };

    } catch (error) {
        throw new Error('Falha na autenticação ou credenciais inválidas');
    }
  },

  // 2. Mobile Home Data
  fetchMobileHome: async (): Promise<MobileHomeData> => {
    // Reusing fetchDashboard logic roughly
    const summaryData = await fetchTableData<FuelSummary[]>('daily_summary', []);
    const closingsData = await fetchTableData<AttendantClosing[]>('closings', []);
    const alertsData = await fetchTableData<InventoryAlert[]>('inventory_alerts', []);
    const notifications = await fetchTableData<MobileNotification[]>('mobile_notifications', []);
    
    const totalSales = summaryData.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
    const pendingClosings = closingsData.filter(c => c.status === 'Aberto').length;
    
    return {
      totalSalesToday: totalSales,
      pendingClosings,
      alertsCount: alertsData.length + notifications.filter(n => !n.read).length,
      recentNotifications: notifications.slice(0, 3), 
      quickStats: [
        { label: 'Vendas', value: `R$ ${totalSales.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, trend: 'up' },
        { label: 'Estoque', value: 'Ok', trend: 'neutral' },
        { label: 'Divergências', value: `${closingsData.filter(c => c.status === 'Divergente').length}`, trend: 'down' }
      ]
    };
  },

  // 3. Notifications List
  fetchNotifications: async (): Promise<MobileNotification[]> => {
    return fetchTableData<MobileNotification[]>('mobile_notifications', []);
  },

  // 4. Action: Approve Closing remotely
  approveClosing: async (closingId: string): Promise<{ success: boolean }> => {
    try {
        const { error } = await supabase
            .from('closings')
            .update({ status: 'OK' })
            .eq('id', closingId);
        
        if (error) throw error;
        return { success: true };
    } catch (e) {
        console.warn("Error approving closing", e);
        return { success: false };
    }
  }
};
