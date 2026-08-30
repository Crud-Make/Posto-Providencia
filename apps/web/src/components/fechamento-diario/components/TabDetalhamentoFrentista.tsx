import React, { useState } from 'react';
import { SessaoFrentista, Frentista } from '../../../types/fechamento';
import { TabelaConciliacaoFrentistas } from './detalhamento/TabelaConciliacaoFrentistas';
import { ResumoMensalFrentistas } from './detalhamento/ResumoMensalFrentistas';
import { useResumoMensalFrentistas } from '../hooks/useResumoMensalFrentistas';

interface TabDetalhamentoFrentistaProps {
  frentistaSessions: SessaoFrentista[];
  frentistas: Frentista[];
  loading?: boolean;
  onUpdateCampo?: (tempId: string, campo: string, valor: number) => void;
  postoId: number | null;
  /** Data selecionada no cabeçalho (ISO `YYYY-MM-DD`); o mês vem dela. */
  dataSelecionada: string | null;
}

type Visao = 'dia' | 'mes';

const rotuloDoMes = (dataIso: string | null): string => {
  if (!dataIso) return 'mês';
  const [ano, mes] = dataIso.split('-').map(Number);
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

/**
 * Aba de Detalhamento por Frentista.
 *
 * @remarks
 * Duas visões: **Dia** (a conciliação editável do dia selecionado) e **Mês** (o bloco
 * `Caixa Dia 01 a 31` da planilha — quanto cada frentista recebeu por forma de
 * pagamento no mês, e quem é o frentista do mês). Adicionada em 30/08/2026.
 */
export const TabDetalhamentoFrentista: React.FC<TabDetalhamentoFrentistaProps> = ({
  frentistaSessions,
  frentistas,
  loading,
  onUpdateCampo,
  postoId,
  dataSelecionada,
}) => {
  const [visao, setVisao] = useState<Visao>('dia');
  // Só consulta o mês quando a visão pede; no dia a chamada não acontece.
  const resumoMensal = useResumoMensalFrentistas(postoId, visao === 'mes' ? dataSelecionada : null);

  const botao = (v: Visao, rotulo: string) => (
    <button
      type="button"
      onClick={() => setVisao(v)}
      className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${visao === v
        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-700/60'}`}
    >
      {rotulo}
    </button>
  );

  return (
    <div className="p-2 space-y-6">
      <div className="flex items-center gap-2">
        {botao('dia', 'Dia')}
        {botao('mes', `Mês · ${rotuloDoMes(dataSelecionada)}`)}
      </div>

      {visao === 'mes' ? (
        <ResumoMensalFrentistas resumo={resumoMensal} rotuloMes={rotuloDoMes(dataSelecionada)} />
      ) : loading ? (
        <div className="p-20 text-center text-slate-400 bg-slate-900/20 rounded-3xl border border-slate-800">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
            <p className="font-medium animate-pulse">Sincronizando frentistas e envios mobile...</p>
          </div>
        </div>
      ) : (
        <>
          <TabelaConciliacaoFrentistas
            sessoes={frentistaSessions}
            frentistas={frentistas}
            isLoading={loading}
            onUpdateCampo={onUpdateCampo}
          />
          {frentistaSessions.length === 0 && (
            <div className="p-12 text-center bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
              <p className="text-slate-500 italic">Nenhum frentista registrado para este turno até o momento.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};
