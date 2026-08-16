import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PostoProvider } from './contexts/PostoContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PeriodoProvider } from './contexts/PeriodoContext';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import UpdateNotifier from './shared/ui/UpdateNotifier';
import MainLayout from './layouts/MainLayout';

// Lazy loading das telas para melhor performance
const TelaDashboard = React.lazy(() => import('./components/dashboard'));
const TelaFechamentoDiario = React.lazy(() => import('./components/fechamento-diario'));
const TelaRelatorioDiario = React.lazy(() => import('./components/relatorio-diario'));
const TelaRegistroCompras = React.lazy(() => import('./components/registro-compras'));
const TelaDashboardEstoque = React.lazy(() => import('./components/estoque/dashboard'));
const TelaGestaoEstoque = React.lazy(() => import('./components/estoque/gestao'));
const TelaAnaliseCustos = React.lazy(() => import('./components/analise-custos'));
const TelaLeiturasDiarias = React.lazy(() => import('./components/leituras-diarias'));
const TelaAnaliseVendas = React.lazy(() => import('./components/vendas/analise'));
const TelaDashboardVendas = React.lazy(() => import('./components/vendas/dashboard'));
const TelaGestaoFrentistas = React.lazy(() => import('./components/frentistas'));
// TelaConfiguracoes é export nomeado
const TelaConfiguracoes = React.lazy(() => import('./components/configuracoes').then(module => ({ default: module.TelaConfiguracoes })));
const TelaGestaoEscalas = React.lazy(() => import('./components/TelaGestaoEscalas'));
const TelaGestaoClientes = React.lazy(() => import('./components/clientes/TelaGestaoClientes'));
const TelaFechamentoMensal = React.lazy(() => import('./components/fechamento-mensal'));
const TelaDashboardProprietario = React.lazy(() => import('./components/dashboard-proprietario'));
const TelaPlanilhaMensal = React.lazy(() => import('./pages/planilha-mensal'));

// Componente de Loading para Suspense
const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full w-full min-h-[400px] text-blue-600">
    <Loader2 size={48} className="animate-spin" />
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
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
        {/* [31/07] "Gestão Financeira" virou a aba "Receitas e Despesas" do Fechamento de */}
        {/* Caixa. A rota fica como redirect em vez de sumir: link salvo pelo usuário cairia */}
        {/* no catch-all e o levaria ao Dashboard, sem pista de para onde a tela foi. */}
        <Route path="/financeiro" element={<Navigate to="/fechamento" replace />} />
        <Route path="/configuracoes" element={<Suspense fallback={<LoadingFallback />}><TelaConfiguracoes /></Suspense>} />
        <Route path="/escalas" element={<Suspense fallback={<LoadingFallback />}><TelaGestaoEscalas /></Suspense>} />
        <Route path="/clientes" element={<Suspense fallback={<LoadingFallback />}><TelaGestaoClientes /></Suspense>} />
        {/* [02/08] `/despesas` REMOVIDA. Era tela orfã: existia, funcionava, mas nunca
            esteve no menu — só se chegava digitando a URL. O caminho oficial para o dono
            lançar despesa é Fechamento de Caixa → aba "💵 Receitas e Despesas", decisão de
            31/07 que aposentou a "Gestão Financeira". Manter as duas dava dois lugares para
            a mesma coisa, com vocabulários de categoria diferentes.
            O `FormDespesa` e o `types.ts` daquela pasta CONTINUAM: são usados pela aba
            oficial e pelo relatório diário. */}
        <Route path="/despesas" element={<Navigate to="/fechamento" replace />} />
        <Route path="/fechamento-mensal" element={<Suspense fallback={<LoadingFallback />}><TelaFechamentoMensal /></Suspense>} />
        <Route path="/proprietario" element={<Suspense fallback={<LoadingFallback />}><TelaDashboardProprietario /></Suspense>} />
        <Route path="/planilha" element={<Suspense fallback={<LoadingFallback />}><TelaPlanilhaMensal /></Suspense>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

// [14/01 07:05] Refatoração completa para React Router + Lazy Loading.
// Implementado Suspense para carregamento sob demanda das rotas.

const App: React.FC = () => {
  return (
    <PostoProvider>
      <ThemeProvider>
        <PeriodoProvider>
          <Toaster position="top-right" richColors closeButton />
          <UpdateNotifier />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PeriodoProvider>
      </ThemeProvider>
    </PostoProvider>
  );
};

export default App;
