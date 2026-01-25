// [25/01 17:10] Refatoração Senior para Design Premium e Conciliação Robusta
// Motivo: Implementar visão de dashboard financeiro com inversão de matriz e integração mobile.

import React from 'react';
import { SessaoFrentista, Frentista } from '../../../types/fechamento';
import { TabelaConciliacaoFrentistas } from './detalhamento/TabelaConciliacaoFrentistas';

/**
 * Props para o componente TabDetalhamentoFrentista
 */
interface TabDetalhamentoFrentistaProps {
  frentistaSessions: SessaoFrentista[]; // Lista de sessões de frentistas
  frentistas: Frentista[]; // Lista de cadastros de frentistas para lookup de nomes
  totalVendasPosto: number; // Total geral de vendas para cálculos
  loading?: boolean; // Estado de carregamento
  onUpdateCampo?: (tempId: string, campo: string, valor: number) => void; // Callback genérico para outros campos
  data?: string; // Data do fechamento para exibição no cabeçalho
  onRefresh?: () => void; // Callback para sincronização
}

/**
 * Aba de Detalhamento por Frentista (Versão Dashboard Premium)
 * 
 * @remarks
 * Orquestra a exibição de métricas rápidas e a tabela de conciliação robusta.
 * Foca em uma experiência visual de alta qualidade com dados consolidados do mobile e sistema.
 */
export const TabDetalhamentoFrentista: React.FC<TabDetalhamentoFrentistaProps> = ({
  frentistaSessions,
  frentistas,
  totalVendasPosto,
  loading,
  onUpdateCampo,
  data,
  onRefresh
}) => {
  if (loading) {
    return (
      <div className="p-20 text-center text-slate-400 bg-slate-900/20 rounded-3xl border border-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="font-medium animate-pulse">Sincronizando frentistas e envios mobile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-6">
      <TabelaConciliacaoFrentistas
        sessoes={frentistaSessions}
        frentistas={frentistas}
        onRefresh={onRefresh}
        isLoading={loading}
      />

      {frentistaSessions.length === 0 && (
        <div className="p-12 text-center bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
          <p className="text-slate-500 italic">Nenhum frentista registrado para este turno até o momento.</p>
        </div>
      )}
    </div>
  );
};
