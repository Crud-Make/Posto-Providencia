import React, { useState } from 'react';
import Cabecalho from './components/Cabecalho';
import BarraLateral from './components/BarraLateral';
import TelaDashboard from './components/TelaDashboard';
import TelaFechamentoDiario from './components/TelaFechamentoDiario';
import TelaRelatorioDiario from './components/TelaRelatorioDiario';
import TelaRegistroCompras from './components/TelaRegistroCompras';
import TelaDashboardEstoque from './components/TelaDashboardEstoque';
import TelaGestaoEstoque from './components/TelaGestaoEstoque';
import TelaAnaliseCustos from './components/TelaAnaliseCustos';
import TelaLeiturasDiarias from './components/TelaLeiturasDiarias';
import TelaAnaliseVendas from './components/TelaAnaliseVendas';
import TelaDashboardVendas from './components/TelaDashboardVendas';
import TelaGestaoFrentistas from './components/TelaGestaoFrentistas';
import TelaGestaoFinanceira from './components/financeiro';
import TelaConfiguracoes from './components/TelaConfiguracoes';
import TelaGestaoEscalas from './components/TelaGestaoEscalas';
import TelaGestaoClientes from './components/clientes/TelaGestaoClientes';
import TelaGestaoDespesas from './components/TelaGestaoDespesas';
import TelaDashboardProprietario from './components/TelaDashboardProprietario';
import TelaLogin from './components/TelaLogin';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PostoProvider } from './contexts/PostoContext';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import UpdateNotifier from './components/UpdateNotifier';

/**
 * Componente principal de conteúdo da aplicação.
 * Gerencia o estado da visualização atual (currentView) e o layout principal (BarraLateral + Cabecalho + Conteúdo).
 * Também lida com a verificação de autenticação e estados de carregamento iniciais.
 */
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'closing' | 'inventory' | 'products' | 'purchase' | 'finance' | 'analysis' | 'readings' | 'reports' | 'sales_dashboard' | 'attendants' | 'settings' | 'schedule' | 'clients' | 'daily_report' | 'expenses' | 'owner_dashboard'>('dashboard');

  // Estado para controlar o menu mobile (Drawer)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-blue-600">
        <Loader2 size={48} className="animate-spin" />
      </div>
    );
  }

  // Mesmo sem usuário, mostramos o app agora (auth mockada)
  if (!user) {
    return <TelaLogin />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">

      {/* Overlay Backdrop para Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Barra Lateral (Desktop + Mobile Drawer) */}
      <BarraLateral
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setIsMobileMenuOpen(false); // Fecha o menu ao navegar no mobile
        }}
        onClose={() => setIsMobileMenuOpen(false)}
        className={`
          ${isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50 shadow-xl' : 'hidden'} 
          lg:flex lg:static lg:shadow-none lg:h-screen lg:sticky lg:top-0
        `}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Cabeçalho para Mobile */}
        <div className="lg:hidden">
          <Cabecalho
            currentView={currentView}
            onNavigate={setCurrentView}
            onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </div>

        {/* Conteúdo Principal */}
        <main className="flex-1 overflow-y-auto w-full custom-scrollbar">
          <div className="w-full">
            {currentView === 'dashboard' && (
              <TelaDashboard onNewClosing={() => setCurrentView('closing')} />
            )}
            {currentView === 'sales_dashboard' && (
              <TelaDashboardVendas />
            )}
            {currentView === 'attendants' && (
              <TelaGestaoFrentistas />
            )}
            {currentView === 'settings' && (
              <TelaConfiguracoes />
            )}
            {currentView === 'closing' && (
              <TelaFechamentoDiario />
            )}
            {currentView === 'readings' && (
              <TelaLeiturasDiarias />
            )}
            {currentView === 'inventory' && (
              <TelaDashboardEstoque />
            )}
            {currentView === 'products' && (
              <TelaGestaoEstoque />
            )}
            {currentView === 'purchase' && (
              <TelaRegistroCompras />
            )}
            {currentView === 'finance' && (
              <TelaGestaoFinanceira />
            )}
            {currentView === 'analysis' && (
              <TelaAnaliseCustos />
            )}
            {currentView === 'reports' && (
              <TelaAnaliseVendas />
            )}
            {currentView === 'schedule' && (
              <TelaGestaoEscalas />
            )}
            {currentView === 'clients' && (
              <TelaGestaoClientes />
            )}
            {currentView === 'daily_report' && (
              <TelaRelatorioDiario />
            )}
            {currentView === 'expenses' && (
              <TelaGestaoDespesas />
            )}
            {currentView === 'owner_dashboard' && (
              <TelaDashboardProprietario />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

import { ThemeProvider } from './contexts/ThemeContext';

/**
 * Componente raiz da aplicação (Ponto de Entrada).
 * Provê os contextos globais (Auth, Posto, Theme) e o componente de notificações Toaster.
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <PostoProvider>
        <ThemeProvider>
          <Toaster position="top-right" richColors closeButton />
          <UpdateNotifier />
          <AppContent />
        </ThemeProvider>
      </PostoProvider>
    </AuthProvider>
  );
};

export default App;
