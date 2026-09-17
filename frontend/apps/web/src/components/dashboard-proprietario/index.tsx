import React, { useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { hojeIso, formatarMesBR } from '../../utils/periodo';
import { usePeriodo } from '../../contexts/usePeriodo';
import { useDashboardProprietario } from './hooks/useDashboardProprietario';
import { FiltrosDashboard } from './components/FiltrosDashboard';
import { ResumoExecutivo } from './components/ResumoExecutivo';
import { DemonstrativoFinanceiro } from './components/DemonstrativoFinanceiro';
import { AlertasGerenciais } from './components/AlertasGerenciais';
import { CentroDoMesConectado } from '@/widgets/resumo-mensal';
import { ImpactoTrocaPreco } from '@/widgets/impacto-troca-preco';
import { PeriodoFiltro } from './types';

const TelaDashboardProprietario: React.FC = () => {
  // O mês vem do contexto: é o mesmo período das demais telas de análise.
  const { mes: mesSelecionado, definirMes: setMesSelecionado } = usePeriodo();
  const { dados, loading, recarregar } = useDashboardProprietario(mesSelecionado);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('hoje');

  // Trava o calendário no mês corrente: mês futuro não tem dado, só confundiria.
  const mesLimite = useMemo(() => hojeIso().slice(0, 7), []);

  // Trocar para um mês fechado tira "Hoje" do ar — a aba deixaria de existir na barra e o
  // painel ficaria preso num período que não é mais oferecido.
  const ehMesCorrente = dados?.ehMesCorrente ?? true;
  const periodoEfetivo: PeriodoFiltro = ehMesCorrente ? periodo : 'mes';

  const dadosAtuais = periodoEfetivo === 'hoje' ? dados?.hoje : dados?.mes;

  // Um rótulo só, usado nos cartões e no rodapé — para os dois nunca divergirem.
  const periodoLabel =
    periodoEfetivo === 'hoje'
      ? 'Hoje'
      : `${formatarMesBR(mesSelecionado)}${ehMesCorrente ? ' (até hoje)' : ''}`;

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
        periodo={periodoEfetivo}
        onPeriodoChange={setPeriodo}
        onRefresh={recarregar}
        loading={loading}
        nomePosto={dados.posto?.nome}
        mesSelecionado={mesSelecionado}
        onMesChange={setMesSelecionado}
        mesLimite={mesLimite}
        ehMesCorrente={ehMesCorrente}
      />

      {/* Cards Principais */}
      <ResumoExecutivo dados={dadosAtuais} periodoLabel={periodoLabel} />

      {/* A corrente que decide o lucro: despesa → custo do litro → lucro. Sempre do
          MÊS, mesmo com a aba "Hoje" ativa — custo por litro é rateio mensal, um dia
          isolado não o sustenta. As três tabelas da planilha ficam em tela própria
          ("Planilha do Mês"): são uma leitura densa, de outro tipo. */}
      <CentroDoMesConectado postoId={dados.posto?.id ?? null} mesIso={mesSelecionado} />

      {/* Demonstrativo (Entradas - Saídas = Resultado) */}
      <DemonstrativoFinanceiro dados={dadosAtuais} />

      {/* Impacto das trocas de preço do mês (#61) — some quando o mês não teve troca. */}
      <ImpactoTrocaPreco postoId={dados.posto?.id ?? null} mesIso={mesSelecionado} />

      {/* Alertas e Insights */}
      {dados.alertas.length > 0 && (
        <AlertasGerenciais alertas={dados.alertas} />
      )}

      {/* Footer Info */}
      <div className="text-center text-sm text-gray-400 dark:text-gray-500 py-4 border-t border-gray-100 dark:border-gray-800">
        <p>
          💡 Visualizando dados de: <strong>{periodoLabel}</strong>
          {periodoEfetivo === 'mes' && !ehMesCorrente ? ' (mês fechado)' : ''}.
          {/* [31/07] A frase antiga dizia "estimativas baseadas na margem média cadastrada". */}
          {/* Não era verdade: o lucro sai da receita real menos o custo de compra real. */}
          {' '}Lucro apurado da receita real menos o custo de compra e as despesas lançadas.
        </p>
        <p className="text-xs mt-1 opacity-70">
          Última atualização: {new Date(dados.ultimaAtualizacao).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
};

export default TelaDashboardProprietario;
