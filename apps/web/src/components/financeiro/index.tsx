import React from 'react';
import { usePosto } from '../../contexts/usePosto';
import { useFiltrosFinanceiros } from './hooks/useFiltrosFinanceiros';
import { useFinanceiro } from './hooks/useFinanceiro';
import { useFluxoCaixa } from './hooks/useFluxoCaixa';
import { FiltrosFinanceiros } from './components/FiltrosFinanceiros';
import { ResumoFinanceiro } from './components/ResumoFinanceiro';
import { GraficoFluxoCaixa } from './components/GraficoFluxoCaixa';
import { DespesasPorCategoria } from './components/DespesasPorCategoria';
import { Loader2, Plus, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import type { FixaPendente } from '@posto/utils';
import FormDespesa from '../despesas/components/FormDespesa';
import { DespesaFormData } from '../despesas/types';
import { despesaService, receitaService } from '../../services/api';
import { isSuccess } from '../../types/ui/response-types';
import { despesaFixaService, type LancamentoFixa } from '../../services/api/despesa-fixa.service';
import { hojeIso, mesAtualIso, ultimoDiaDoMes, deIsoLocal } from '../../utils/periodo';
import { FormReceita, ReceitaFormData } from './components/FormReceita';
import { ModalFixasPendentes } from './components/ModalFixasPendentes';
// [01/02 11:22] Integrado FormReceita e lógica de salvamento de receitas extras.

/**
 * Painel de Receitas e Despesas.
 *
 * @remarks
 * [31/07] Era a rota `/financeiro` ("Gestão Financeira"), item próprio da barra lateral.
 * Passou a ser aba do Fechamento de Caixa: lançar receita e despesa é operação de caixa,
 * e ficava a dois cliques de distância de onde o caixa é conferido.
 *
 * O que mudou foi ONDE isto aparece, não O QUE é calculado — todos os números continuam
 * vindo de `useFinanceiro` exatamente como antes.
 *
 * A tabela "Últimas Transações" foi removida nessa mudança. O pipeline que a alimentava
 * (`dados.transacoes`) continua vivo de propósito: `GraficoFluxoCaixa` e
 * `DespesasPorCategoria` derivam dele.
 *
 * @module PainelReceitasDespesas
 */
export const PainelReceitasDespesas: React.FC = () => {
  const { postoAtivoId } = usePosto();
  const [showFormDespesa, setShowFormDespesa] = React.useState(false);
  const [showFormReceita, setShowFormReceita] = React.useState(false);
  const [fixasPendentes, setFixasPendentes] = React.useState<FixaPendente[] | null>(null);
  const [buscandoFixas, setBuscandoFixas] = React.useState(false);

  const { filtros, atualizar, resetar, aplicarPreset } = useFiltrosFinanceiros(postoAtivoId || undefined);
  const { dados, carregando, erro, recarregar } = useFinanceiro(filtros);
  const { series } = useFluxoCaixa(dados, 'diario');

  const handleSaveDespesa = async (data: DespesaFormData, id?: string): Promise<boolean> => {
    if (!id) {
      const response = await despesaService.create(data);
      if (response.success) {
        await recarregar();
        return true;
      }
    }
    return false;
  };

  /**
   * Mês em que as fixas serão lançadas: o do filtro de período, não "hoje".
   *
   * @remarks Se o dono está olhando junho e manda lançar as fixas, elas têm de cair
   *          em junho. Usar `hojeIso()` aqui jogaria tudo no mês corrente e sujaria
   *          o mês errado — do tipo de erro que só aparece quando o lucro já saiu.
   */
  const mesDoFiltro = filtros.dataInicio?.slice(0, 7) || mesAtualIso();

  const abrirFixas = async () => {
    if (!postoAtivoId) return;
    setBuscandoFixas(true);
    try {
      const res = await despesaFixaService.pendentesDoMes(mesDoFiltro, postoAtivoId);
      if (!isSuccess(res)) {
        toast.error(res.error);
        return;
      }
      if (res.data.length === 0) {
        toast.info('Nenhuma despesa fixa pendente neste mês — todas já foram lançadas.');
        return;
      }
      setFixasPendentes(res.data);
    } finally {
      setBuscandoFixas(false);
    }
  };

  const handleLancarFixas = async (lancamentos: LancamentoFixa[]) => {
    if (!postoAtivoId) return;

    // Lança no último dia do mês exibido — mesma convenção da carga histórica, em que
    // a despesa mensal é do mês inteiro e não de um dia específico. No mês corrente
    // usa hoje, porque lançar no futuro deixaria a despesa fora de qualquer relatório
    // até o mês virar.
    const ultimoDia = ultimoDiaDoMes(deIsoLocal(`${mesDoFiltro}-01`));
    const hoje = hojeIso();
    const data = ultimoDia > hoje ? hoje : ultimoDia;

    const res = await despesaFixaService.lancar(lancamentos, data, postoAtivoId);
    if (!isSuccess(res)) {
      toast.error(res.error);
      return;
    }

    toast.success(`${res.data} despesa(s) fixa(s) lançada(s) em ${data.split('-').reverse().join('/')}.`);
    setFixasPendentes(null);
    await recarregar();
  };

  const handleSaveReceita = async (data: ReceitaFormData): Promise<boolean> => {
    // [01/02 11:38] Adicionando usuario_id nulo por padrão para satisfazer tipo ReceitaInsert
    const response = await receitaService.create({ ...data, usuario_id: null });
    if (response.success) {
      await recarregar();
      return true;
    }
    return false;
  };

  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Receitas e Despesas</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Lançamentos e fluxo de caixa do período selecionado abaixo.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={abrirFixas}
            disabled={!postoAtivoId || buscandoFixas}
            title="Lança de uma vez as despesas que se repetem todo mês, com o valor do último mês para você revisar"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {buscandoFixas ? <Loader2 size={18} className="animate-spin" /> : <Repeat size={18} />}
            Despesas Fixas
          </button>

          <button
            onClick={() => setShowFormReceita(true)}
            disabled={!postoAtivoId}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            Nova Receita
          </button>

          <button
            onClick={() => setShowFormDespesa(true)}
            disabled={!postoAtivoId}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={18} />
            Nova Despesa
          </button>
        </div>
      </div>

      <FiltrosFinanceiros
        filtros={filtros}
        onAplicar={atualizar}
        onReset={resetar}
        onPreset={aplicarPreset}
      />

      {erro && (
        <div className="p-4 bg-red-900/20 text-red-200 rounded-xl border border-red-500/30 flex justify-between items-center">
          <span>{erro}</span>
          <button onClick={() => recarregar()} className="text-sm underline hover:text-red-100">Tentar novamente</button>
        </div>
      )}

      <ResumoFinanceiro dados={dados} carregando={carregando} />

      {carregando ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] w-full text-slate-500">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="font-medium">Carregando dados financeiros...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <div className="lg:col-span-2">
            <GraficoFluxoCaixa series={series} />
          </div>
          <div>
            <DespesasPorCategoria dados={dados} />
          </div>
        </div>
      )}

      {fixasPendentes && (
        <ModalFixasPendentes
          mes={mesDoFiltro}
          pendentes={fixasPendentes}
          onCancelar={() => setFixasPendentes(null)}
          onLancar={handleLancarFixas}
        />
      )}

      {showFormDespesa && postoAtivoId && (
        <FormDespesa
          postoId={postoAtivoId}
          onSave={handleSaveDespesa}
          onCancel={() => setShowFormDespesa(false)}
        />
      )}

      {showFormReceita && postoAtivoId && (
        <FormReceita
          postoId={postoAtivoId}
          onSave={handleSaveReceita}
          onCancel={() => setShowFormReceita(false)}
        />
      )}
    </div>
  );
};
