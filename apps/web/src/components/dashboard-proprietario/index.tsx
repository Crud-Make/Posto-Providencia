import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useDashboardProprietario } from './hooks/useDashboardProprietario';
import { FiltrosDashboard } from './components/FiltrosDashboard';
import { ResumoExecutivo } from './components/ResumoExecutivo';
import { DemonstrativoFinanceiro } from './components/DemonstrativoFinanceiro';
import { AlertasGerenciais } from './components/AlertasGerenciais';
import { PeriodoFiltro } from './types';

const TelaDashboardProprietario: React.FC = () => {
  const { dados, loading, recarregar } = useDashboardProprietario();
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('hoje');

  // Seleciona os dados com base no filtro
  // Nota: 'semana' fallback para 'mes' temporariamente, pois o backend não retorna semana separada ainda
  const dadosAtuais = periodo === 'hoje' ? dados?.hoje : dados?.mes;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Consolidando dados financeiros...</p>
        </div>
      </div>
    );
  }

  if (!dados || !dadosAtuais) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <p className="text-gray-500">Não foi possível carregar os dados.</p>
          <button
            onClick={() => recarregar()}
            className="text-blue-600 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 w-full space-y-8 animate-in fade-in duration-500">
      <FiltrosDashboard
        periodo={periodo}
        onPeriodoChange={setPeriodo}
        onRefresh={recarregar}
        loading={loading}
        nomePosto={dados.posto?.nome}
      />

      {/* Cards Principais */}
      <ResumoExecutivo dados={dadosAtuais} />

      {/* Demonstrativo (Entradas - Saídas = Resultado) */}
      <DemonstrativoFinanceiro dados={dadosAtuais} />

      {/* Alertas e Insights */}
      {dados.alertas.length > 0 && (
        <AlertasGerenciais alertas={dados.alertas} />
      )}

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4 border-t border-gray-100 dark:border-gray-800">
        <p>
          💡 Visualizando dados de: <strong>{periodo === 'hoje' ? 'Hoje' : 'Mês Corrente'}</strong>.
          Os valores de lucro são estimativas baseadas na margem média cadastrada.
        </p>
        <p className="text-xs mt-1 opacity-70">
          Última atualização: {new Date(dados.ultimaAtualizacao).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default TelaDashboardProprietario;
