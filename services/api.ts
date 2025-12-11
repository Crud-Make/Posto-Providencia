
import { 
  FUEL_DATA, 
  PAYMENT_DATA, 
  CLOSINGS_DATA, 
  PERFORMANCE_DATA, 
  DAILY_SUMMARY_DATA,
  NOZZLE_DATA,
  INITIAL_ATTENDANTS_DATA,
  INVENTORY_ITEMS,
  INVENTORY_ALERTS,
  RECENT_TRANSACTIONS,
  ATTENDANTS_LIST_DATA,
  ATTENDANT_HISTORY_DATA,
  PRODUCTS_CONFIG_DATA,
  NOZZLES_CONFIG_DATA,
  SHIFTS_CONFIG_DATA,
  MOBILE_NOTIFICATIONS_DATA
} from '../constants';
import { 
  FuelData, 
  PaymentMethod, 
  AttendantClosing, 
  AttendantPerformance, 
  FuelSummary,
  NozzleData,
  ClosingAttendantInput,
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
  attendantsData: ClosingAttendantInput[];
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

const SIMULATED_DELAY = 800;

// Dashboard
export const fetchDashboardData = async (): Promise<DashboardData> => {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
  
  const totalSales = DAILY_SUMMARY_DATA.reduce((acc, curr) => acc + curr.totalValue, 0);
  const avgTicket = totalSales > 0 ? 145.50 : 0; 
  const totalDivergence = CLOSINGS_DATA
    .filter(c => c.status === 'Divergente')
    .reduce((acc, curr) => acc + (Math.random() * 50), 0);

  return {
    fuelData: FUEL_DATA,
    paymentData: PAYMENT_DATA,
    closingsData: CLOSINGS_DATA,
    performanceData: PERFORMANCE_DATA,
    summaryData: DAILY_SUMMARY_DATA,
    kpis: { totalSales, avgTicket, totalDivergence }
  };
};

// Daily Closing Screen
export const fetchClosingData = async (): Promise<ClosingData> => {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
  return {
    summaryData: DAILY_SUMMARY_DATA,
    nozzleData: NOZZLE_DATA,
    attendantsData: INITIAL_ATTENDANTS_DATA
  };
};

// Inventory Screen
export const fetchInventoryData = async (): Promise<InventoryData> => {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
  return {
    items: INVENTORY_ITEMS,
    alerts: INVENTORY_ALERTS,
    transactions: RECENT_TRANSACTIONS
  };
};

// Attendants Management Screen
export const fetchAttendantsData = async (): Promise<AttendantsManagementData> => {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
  return {
    list: ATTENDANTS_LIST_DATA,
    history: ATTENDANT_HISTORY_DATA
  };
};

// Settings Screen
export const fetchSettingsData = async (): Promise<SettingsData> => {
  await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
  return {
    products: PRODUCTS_CONFIG_DATA,
    nozzles: NOZZLES_CONFIG_DATA,
    shifts: SHIFTS_CONFIG_DATA
  };
};

// ==========================================
// MOBILE API EXTENSIONS (React Native Support)
// ==========================================

export const MobileService = {
  // 1. Mobile Authentication
  login: async (email: string, pass: string): Promise<MobileAuthResponse> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Mock validation
    if (email === 'admin@posto.com' && pass === '123456') {
      return {
        token: 'jwt-mock-token-xyz-123',
        user: {
          id: 'u1',
          name: 'Admin Gerente',
          role: 'manager',
          avatar: 'https://ui-avatars.com/api/?name=Admin+Gerente&background=E0D0B8&color=fff'
        }
      };
    }
    throw new Error('Credenciais inválidas');
  },

  // 2. Optimized Mobile Home Data (Aggregated for performance)
  fetchMobileHome: async (): Promise<MobileHomeData> => {
    await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
    
    const totalSales = DAILY_SUMMARY_DATA.reduce((acc, curr) => acc + curr.totalValue, 0);
    const pendingClosings = CLOSINGS_DATA.filter(c => c.status === 'Aberto').length;
    
    return {
      totalSalesToday: totalSales,
      pendingClosings,
      alertsCount: INVENTORY_ALERTS.length + MOBILE_NOTIFICATIONS_DATA.filter(n => !n.read).length,
      recentNotifications: MOBILE_NOTIFICATIONS_DATA.slice(0, 3), // Only top 3 for home screen
      quickStats: [
        { label: 'Vendas', value: `R$ ${totalSales.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`, trend: 'up' },
        { label: 'Estoque', value: 'Ok', trend: 'neutral' },
        { label: 'Divergências', value: '2', trend: 'down' }
      ]
    };
  },

  // 3. Notifications List
  fetchNotifications: async (): Promise<MobileNotification[]> => {
    await new Promise(resolve => setTimeout(resolve, SIMULATED_DELAY));
    return MOBILE_NOTIFICATIONS_DATA;
  },

  // 4. Action: Approve Closing remotely
  approveClosing: async (closingId: string): Promise<{ success: boolean }> => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log(`Closing ${closingId} approved via mobile`);
    return { success: true };
  }
};
