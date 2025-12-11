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
import SettingsScreen from './components/SettingsScreen';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'dashboard' | 'closing' | 'inventory' | 'purchase' | 'finance' | 'readings' | 'reports' | 'sales_dashboard' | 'attendants' | 'settings'>('settings');

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900 transition-colors duration-200">
      
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
            <InventoryDashboardScreen onRegisterPurchase={() => setCurrentView('purchase')} />
          )}
          {currentView === 'purchase' && (
            <PurchaseRegistrationScreen />
          )}
          {currentView === 'finance' && (
            <CostAnalysisScreen />
          )}
          {currentView === 'reports' && (
            <SalesAnalysisScreen />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;