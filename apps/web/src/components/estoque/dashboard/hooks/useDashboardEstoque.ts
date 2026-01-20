import { useState, useEffect, useCallback } from 'react';
import { usePosto } from '../../../../contexts/PostoContext';
import { estoqueService, tanqueService } from '../../../../services/api';
import { Tanque } from '../../../../services/api/tanque.service';
import { TankHistory } from '../types';
import { isSuccess } from '../../../../types/ui/response-types';

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
      setTanques(data);

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

  // Handler para salvar nova medição
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

      // Atualiza o estoque do tanque
      await tanqueService.update(selectedTanque.id, {
        estoque_atual: novoValor
      });

      // Registra no histórico (se o serviço suportar)
      try {
        await tanqueService.saveHistory({
          tanque_id: selectedTanque.id,
          data: new Date().toISOString().split('T')[0],
          volume_fisico: novoValor
        });
      } catch (e) {
        console.log('Histórico não registrado (funcionalidade opcional)');
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
