import { useState, useEffect, useCallback } from 'react';
import { usePosto } from '../../../../contexts/usePosto';
import { supabase } from '../../../../services/supabase';
import { tanqueService } from '../../../../services/api';
import { Tanque, TankHistory } from '../types';
import { isSuccess } from '../../../../types/ui/response-types';
import { hojeIso } from '@posto/utils';
import { estoqueAtualDerivado, type MovimentoLitros, type ReguaTanque } from '../model/estoque-derivado';

interface ReguaRow { tanque_id: number; data: string; volume_fisico: number | string | null }
interface CompraRow { combustivel_id: number | null; data: string; quantidade_litros: number | string }
interface LeituraRow { data: string; litros_vendidos: number | string | null; bico: { combustivel_id: number } | null }

export const useDashboardEstoque = () => {
  const { postoAtivoId } = usePosto();
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [histories, setHistories] = useState<TankHistory>({});
  const [loading, setLoading] = useState(true);

  // Estado para o modal de medição
  const [showMedicaoModal, setShowMedicaoModal] = useState(false);
  const [selectedTanque, setSelectedTanque] = useState<Tanque | null>(null);
  const [medicaoValue, setMedicaoValue] = useState('');
  const [medicaoObservacao, setMedicaoObservacao] = useState('');
  const [savingMedicao, setSavingMedicao] = useState(false);

  const loadData = useCallback(async () => {
    if (!postoAtivoId) return;

    try {
      setLoading(true);
      const response = await tanqueService.getAll(postoAtivoId);

      if (!isSuccess(response)) {
        setLoading(false);
        return;
      }

      const data = response.data;
      const tanqueIds = data.map((t) => t.id);

      // As três fontes da regra da corrente. `Leitura` é a única que cresce
      // todo dia; as outras duas são pequenas. Sem filtro de data: a data de
      // corte é a régua de CADA tanque, resolvida em `estoqueAtualDerivado`.
      const [reguasRes, comprasRes, leiturasRes] = await Promise.all([
        supabase
          .from('HistoricoTanque')
          .select('tanque_id, data, volume_fisico')
          .in('tanque_id', tanqueIds)
          .not('volume_fisico', 'is', null),
        supabase
          .from('Compra')
          .select('combustivel_id, data, quantidade_litros')
          .eq('posto_id', postoAtivoId),
        supabase
          .from('Leitura')
          .select('data, litros_vendidos, bico:Bico!inner(combustivel_id)')
          .eq('posto_id', postoAtivoId),
      ]);

      const reguas: ReguaTanque[] = ((reguasRes.data ?? []) as ReguaRow[]).map((r) => ({
        tanqueId: r.tanque_id,
        data: r.data.slice(0, 10),
        litros: Number(r.volume_fisico),
      }));
      const compras: MovimentoLitros[] = ((comprasRes.data ?? []) as CompraRow[])
        .filter((c) => c.combustivel_id !== null)
        .map((c) => ({ combustivelId: c.combustivel_id as number, data: c.data, litros: Number(c.quantidade_litros) }));
      const vendas: MovimentoLitros[] = ((leiturasRes.data ?? []) as unknown as LeituraRow[])
        .filter((l) => l.bico !== null)
        .map((l) => ({ combustivelId: (l.bico as { combustivel_id: number }).combustivel_id, data: l.data, litros: Number(l.litros_vendidos ?? 0) }));

      const derivado = estoqueAtualDerivado(
        data.map((t) => ({ id: t.id, combustivelId: t.combustivel_id })),
        reguas,
        compras,
        vendas
      );

      setTanques(
        data.map((t) => {
          const estoque = derivado.get(t.id) ?? null;
          return { ...t, estoque_atual: estoque ?? 0, medido: estoque !== null };
        })
      );

      // Fetch histories
      const histMap: TankHistory = {};
      await Promise.all(data.map(async (t) => {
        try {
          const resHist = await tanqueService.getHistory(t.id, 30);
          const hist = isSuccess(resHist) ? resHist.data : [];
          histMap[t.id] = hist || [];
        } catch (e) {
          console.error(`Erro ao buscar histórico tanque ${t.id}`, e);
          histMap[t.id] = [];
        }
      }));
      setHistories(histMap);

    } catch (error) {
      console.error("Erro ao carregar tanques", error);
    } finally {
      setLoading(false);
    }
  }, [postoAtivoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Salva a medição de régua.
   *
   * @remarks A régua vai para `HistoricoTanque.volume_fisico` e só para lá:
   *          é dela que o estoque atual é derivado. Antes também se
   *          carimbava `Tanque.estoque_atual`, e era esse carimbo que
   *          divergia — a venda nunca o subtraía.
   */
  const handleSaveMedicao = async () => {
    if (!selectedTanque || !medicaoValue) return;

    try {
      setSavingMedicao(true);
      const novoValor = parseFloat(medicaoValue.replace(',', '.'));

      if (isNaN(novoValor) || novoValor < 0) {
        alert('Valor de medição inválido');
        return;
      }

      if (novoValor > selectedTanque.capacidade) {
        alert(`O valor não pode exceder a capacidade do tanque (${selectedTanque.capacidade.toLocaleString()} L)`);
        return;
      }

      const resultado = await tanqueService.saveHistory({
        tanque_id: selectedTanque.id,
        data: hojeIso(),
        volume_fisico: novoValor
      });
      if (!isSuccess(resultado)) {
        alert(`Erro ao salvar medição: ${resultado.error}`);
        return;
      }

      // Limpa os campos e fecha o modal
      setMedicaoValue('');
      setMedicaoObservacao('');
      setSelectedTanque(null);
      setShowMedicaoModal(false);

      // Recarrega os dados
      await loadData();

    } catch (error) {
      console.error('Erro ao salvar medição:', error);
      alert('Erro ao salvar medição. Tente novamente.');
    } finally {
      setSavingMedicao(false);
    }
  };

  // Handler para abrir o modal de medição
  const openMedicaoModal = (tanque?: Tanque) => {
    if (tanque) {
      setSelectedTanque(tanque);
      setMedicaoValue(tanque.estoque_atual.toString().replace('.', ','));
    } else {
      setSelectedTanque(null);
      setMedicaoValue('');
    }
    setMedicaoObservacao('');
    setShowMedicaoModal(true);
  };

  return {
    loading,
    tanques,
    histories,
    showMedicaoModal,
    setShowMedicaoModal,
    selectedTanque,
    setSelectedTanque,
    medicaoValue,
    setMedicaoValue,
    medicaoObservacao,
    setMedicaoObservacao,
    savingMedicao,
    loadData,
    handleSaveMedicao,
    openMedicaoModal
  };
};
