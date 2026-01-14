import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PostoProvider } from './contexts/PostoContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import UpdateNotifier from './components/common/UpdateNotifier';
import MainLayout from './layouts/MainLayout';
import TelaLogin from './components/TelaLogin';

// Lazy loading das telas para melhor performance
const TelaDashboard = React.lazy(() => import('./components/dashboard'));
const TelaFechamentoDiario = React.lazy(() => import('./components/fechamento-diario'));
const TelaRelatorioDiario = React.lazy(() => import('./components/relatorio-diario'));
const TelaRegistroCompras = React.lazy(() => import('./components/registro-compras'));
const TelaDashboardEstoque = React.lazy(() => import('./components/estoque/dashboard'));
const TelaGestaoEstoque = React.lazy(() => import('./components/estoque/gestao'));
const TelaAnaliseCustos = React.lazy(() => import('./components/analise-custos'));
const TelaLeiturasDiarias = React.lazy(() => import('./components/leituras'));
const TelaAnaliseVendas = React.lazy(() => import('./components/vendas/analise'));
const TelaDashboardVendas = React.lazy(() => import('./components/vendas/dashboard'));
const TelaGestaoFrentistas = React.lazy(() => import('./components/frentistas'));
const TelaGestaoFinanceira = React.lazy(() => import('./components/financeiro'));
// TelaConfiguracoes é export nomeado
const TelaConfiguracoes = React.lazy(() => import('./components/configuracoes').then(module => ({ default: module.TelaConfiguracoes })));
const TelaGestaoEscalas = React.lazy(() => import('./components/TelaGestaoEscalas'));
const TelaGestaoClientes = React.lazy(() => import('./components/clientes/TelaGestaoClientes'));
const TelaGestaoDespesas = React.lazy(() => import('./components/despesas'));
const TelaDashboardProprietario = React.lazy(() => import('./components/dashboard-proprietario'));

// Componente de Loading para Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[400px] text-blue-600">
    <Loader2 size={48} className="animate-spin" />
  </div>
);

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <TelaLogin />} />
      
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Suspense fallback={<LoadingFallback />}><TelaDashboard /></Suspense>} />
        <Route path="/fechamento" element={<Suspense fallback={<LoadingFallback />}><TelaFechamentoDiario /></Suspense>} />
        <Route path="/relatorio-diario" element={<Suspense fallback={<LoadingFallback />}><TelaRelatorioDiario /></Suspense>} />
        <Route path="/compras" element={<Suspense fallback={<LoadingFallback />}><TelaRegistroCompras /></Suspense>} />
        <Route path="/estoque/tanques" element={<Suspense fallback={<LoadingFallback />}><TelaDashboardEstoque /></Suspense>} />
        <Route path="/estoque/produtos" element={<Suspense fallback={<LoadingFallback />}><TelaGestaoEstoque /></Suspense>} />
        <Route path="/analise-custos" element={<Suspense fallback={<LoadingFallback />}><TelaAnaliseCustos /></Suspense>} />
        <Route path="/leituras" element={<Suspense fallback={<LoadingFallback />}><TelaLeiturasDiarias /></Suspense>} />
        <Route path="/vendas/analise" element={<Suspense fallback={<LoadingFallback />}><TelaAnaliseVendas /></Suspense>} />
        <Route path="/vendas/dashboard" element={<Suspense fallback={<LoadingFallback />}><TelaDashboardVendas /></Suspense>} />
        <Route path="/frentistas" element={<Suspense fallback={<LoadingFallback />}><TelaGestaoFrentistas /></Suspense>} />
        <Route path="/financeiro" element={<Suspense fallback={<LoadingFallback />}><TelaGestaoFinanceira /></Suspense>} />
        <Route path="/configuracoes" element={<Suspense fallback={<LoadingFallback />}><TelaConfiguracoes /></Suspense>} />
        <Route path="/escalas" element={<Suspense fallback={<LoadingFallback />}><TelaGestaoEscalas /></Suspense>} />
        <Route path="/clientes" element={<Suspense fallback={<LoadingFallback />}><TelaGestaoClientes /></Suspense>} />
        <Route path="/despesas" element={<Suspense fallback={<LoadingFallback />}><TelaGestaoDespesas /></Suspense>} />
        <Route path="/proprietario" element={<Suspense fallback={<LoadingFallback />}><TelaDashboardProprietario /></Suspense>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// [14/01 07:05] Refatoração completa para React Router + Lazy Loading.
// Implementado Suspense para carregamento sob demanda das rotas.

const App: React.FC = () => {
  return (
    <AuthProvider>
      <PostoProvider>
        <ThemeProvider>
          <Toaster position="top-right" richColors closeButton />
          <UpdateNotifier />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ThemeProvider>
      </PostoProvider>
    </AuthProvider>
  );
};

export default App;
