import { FuelData, PaymentMethod, AttendantClosing, AttendantPerformance, FuelSummary, NozzleData, InventoryItem, InventoryAlert, InventoryTransaction, ProfitabilityItem, ClosingAttendant, ReadingPump, SalesAnalysisProduct, SalesProfitability, SalesEvolutionData, ProductMixData, AttendantProfile, AttendantHistoryEntry, ProductConfig, NozzleConfig, MobileNotification } from './types';

export const FUEL_DATA: FuelData[] = [];

export const PAYMENT_DATA: PaymentMethod[] = [];

export const CLOSINGS_DATA: AttendantClosing[] = [];

export const PERFORMANCE_DATA: AttendantPerformance[] = [];

export const DAILY_SUMMARY_DATA: FuelSummary[] = [];

export const NOZZLE_DATA_DETAILED: NozzleData[] = [];

export const NOZZLE_DATA: NozzleData[] = [];

export const INVENTORY_ITEMS: InventoryItem[] = [];

export const INVENTORY_ALERTS: InventoryAlert[] = [];

export const RECENT_TRANSACTIONS: InventoryTransaction[] = [];

export const PROFITABILITY_DATA: ProfitabilityItem[] = [];

export const INITIAL_ATTENDANTS_CLOSING: ClosingAttendant[] = [];

// Alias for legacy support if needed
export const INITIAL_ATTENDANTS_DATA = INITIAL_ATTENDANTS_CLOSING;

export const READING_PUMPS_DATA: ReadingPump[] = [];

export const SALES_ANALYSIS_PRODUCTS: SalesAnalysisProduct[] = [];

export const SALES_PROFITABILITY: SalesProfitability[] = [];

export const SALES_EVOLUTION_DATA: SalesEvolutionData[] = [];

export const PRODUCT_MIX_DATA: ProductMixData[] = [];

export const ATTENDANTS_LIST_DATA: AttendantProfile[] = [];

export const ATTENDANT_HISTORY_DATA: AttendantHistoryEntry[] = [];

export const PRODUCTS_CONFIG_DATA: ProductConfig[] = [];

export const NOZZLES_CONFIG_DATA: NozzleConfig[] = [];



export const MOBILE_NOTIFICATIONS_DATA: MobileNotification[] = [];
