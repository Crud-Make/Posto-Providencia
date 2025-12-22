import React, { useState } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardScreen from './components/DashboardScreen';
import DailyClosingScreen from './components/DailyClosingScreen';
import PurchaseRegistrationScreen from './components/PurchaseRegistrationScreen';
import InventoryDashboardScreen from './components/InventoryDashboardScreen';
import CostAnalysisScreen from './components/CostAnalysisScreen';
import DailyReadingsScreen from './components/DailyReadingsScreen';
import SalesAnalysisScreen from './components/SalesAnalysisScreen';
import SalesDashboardScreen from './components/SalesDashboardScreen';
import AttendantManagementScreen from './components/AttendantManagementScreen';
import FinanceManagementScreen from './components/FinanceManagementScreen';
import SolvencyDashboard from './components/SolvencyDashboard';
import SettingsScreen from './components/SettingsScreen';
import ScheduleManagementScreen from './components/ScheduleManagementScreen';
import LoginScreen from './components/LoginScreen';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'closing' | 'inventory' | 'products' | 'purchase' | 'finance' | 'solvency' | 'analysis' | 'readings' | 'reports' | 'sales_dashboard' | 'attendants' | 'settings' | 'schedule'>('dashboard');


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
            <InventoryDashboardScreen initialTab="fuels" onRegisterPurchase={() => setCurrentView('purchase')} />
          )}
          {currentView === 'products' && (
            <InventoryDashboardScreen initialTab="stock" onRegisterPurchase={() => setCurrentView('purchase')} />
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
        </main>
      </div>
    </div>
  );
};

import { ThemeProvider } from './contexts/ThemeContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;