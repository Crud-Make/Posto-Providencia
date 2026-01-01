import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardScreen from './components/DashboardScreen';
import DailyClosingScreen from './components/DailyClosingScreen';
import DailyReportScreen from './components/DailyReportScreen';
import PurchaseRegistrationScreen from './components/PurchaseRegistrationScreen';
import InventoryDashboardScreen from './components/InventoryDashboardScreen'; // Mantido caso queira reverter futuramente
import StockManagementScreen from './components/StockManagementScreen';
import CostAnalysisScreen from './components/CostAnalysisScreen';
import DailyReadingsScreen from './components/DailyReadingsScreen';
import SalesAnalysisScreen from './components/SalesAnalysisScreen';
import SalesDashboardScreen from './components/SalesDashboardScreen';
import AttendantManagementScreen from './components/AttendantManagementScreen';
import FinanceManagementScreen from './components/FinanceManagementScreen';
import SolvencyDashboard from './components/SolvencyDashboard';
import SettingsScreen from './components/SettingsScreen';
import ScheduleManagementScreen from './components/ScheduleManagementScreen';
import PostoManagementScreen from './components/PostoManagementScreen';
import CustomerManagementScreen from './components/CustomerManagementScreen';
import ExpenseManagementScreen from './components/ExpenseManagementScreen';
import OwnerDashboard from './components/OwnerDashboard';
import BaratenciaManagementScreen from './components/BaratenciaManagementScreen';
import { StrategicDashboard } from './components/ai/StrategicDashboard';
import LoginScreen from './components/LoginScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PostoProvider } from './contexts/PostoContext';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'closing' | 'inventory' | 'products' | 'purchase' | 'finance' | 'solvency' | 'analysis' | 'readings' | 'reports' | 'sales_dashboard' | 'attendants' | 'settings' | 'schedule' | 'postos' | 'clients' | 'daily_report' | 'expenses' | 'ai_strategy' | 'owner_dashboard' | 'baratencia'>('dashboard');


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-blue-600">
        <Loader2 size={48} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">

      {/* Sidebar for Desktop */}
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        className="hidden lg:flex"
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header for Mobile */}
        <div className="lg:hidden">
          <Header
            currentView={currentView}
            onNavigate={setCurrentView}
          />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && (
            <DashboardScreen onNewClosing={() => setCurrentView('closing')} />
          )}
          {currentView === 'ai_strategy' && (
            <StrategicDashboard />
          )}
          {currentView === 'sales_dashboard' && (
            <SalesDashboardScreen />
          )}
          {currentView === 'attendants' && (
            <AttendantManagementScreen />
          )}
          {currentView === 'settings' && (
            <SettingsScreen />
          )}
          {currentView === 'closing' && (
            <DailyClosingScreen />
          )}
          {currentView === 'readings' && (
            <DailyReadingsScreen />
          )}
          {currentView === 'inventory' && (
            <InventoryDashboardScreen />
          )}
          {currentView === 'products' && (
            <StockManagementScreen />
          )}
          {currentView === 'purchase' && (
            <PurchaseRegistrationScreen />
          )}
          {currentView === 'finance' && (
            <FinanceManagementScreen />
          )}
          {currentView === 'solvency' && (
            <SolvencyDashboard />
          )}
          {currentView === 'analysis' && (
            <CostAnalysisScreen />
          )}
          {currentView === 'reports' && (
            <SalesAnalysisScreen />
          )}
          {currentView === 'schedule' && (
            <ScheduleManagementScreen />
          )}
          {currentView === 'postos' && (
            <PostoManagementScreen />
          )}
          {currentView === 'clients' && (
            <CustomerManagementScreen />
          )}
          {currentView === 'daily_report' && (
            <DailyReportScreen />
          )}
          {currentView === 'expenses' && (
            <ExpenseManagementScreen />
          )}
          {currentView === 'owner_dashboard' && (
            <OwnerDashboard />
          )}
          {currentView === 'baratencia' && (
            <BaratenciaManagementScreen />
          )}
        </main>
      </div>
    </div>
  );
};

import { ThemeProvider } from './contexts/ThemeContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PostoProvider>
        <ThemeProvider>
          <Toaster position="top-right" richColors closeButton />
          <AppContent />
        </ThemeProvider>
      </PostoProvider>
    </AuthProvider>
  );
};

export default App;