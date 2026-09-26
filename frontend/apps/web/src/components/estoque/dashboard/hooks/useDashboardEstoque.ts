import { useState, useEffect, useCallback } from 'react';
import { hojeIso } from '@posto/utils';
import { usePosto } from '../../../../contexts/usePosto';
import type { Tanque, TankHistory } from '../types';
import { carregarPainel } from './carregar-painel';
import type { PainelMontado } from './montar-painel';
import { gravarMedicao } from './gravar-medicao';

/** Estado do modal "Nova Medição (Régua)". */
function useModalMedicao() {
  const [showMedicaoModal, setShowMedicaoModal] = useState(false);
  const [selectedTanque, setSelectedTanque] = useState<Tanque | null>(null);
  const [medicaoValue, setMedicaoValue] = useState('');
  const [medicaoObservacao, setMedicaoObservacao] = useState('');

  const openMedicaoModal = (tanque?: Tanque) => {
    setSelectedTanque(tanque ?? null);
    setMedicaoValue(tanque === undefined ? '' : tanque.estoque_atual.toString().replace('.', ','));
    setMedicaoObservacao('');
    setShowMedicaoModal(true);
  };

  const fecharEnviado = () => {
    setMedicaoValue('');
    setMedicaoObservacao('');
    setSelectedTanque(null);
    setShowMedicaoModal(false);
  };

  return {
    showMedicaoModal, setShowMedicaoModal, selectedTanque, setSelectedTanque, medicaoValue, setMedicaoValue,
    medicaoObservacao, setMedicaoObservacao, openMedicaoModal, fecharEnviado,
  };
}

/** O valor digitado, ou a mensagem do `alert` que o recusa (mesmas regras de antes). */
function validarMedicao(texto: string, tanque: Tanque): number | string {
  const valor = parseFloat(texto.replace(',', '.'));
  if (isNaN(valor) || valor < 0) return 'Valor de medição inválido';
  if (valor > tanque.capacidade) return `O valor não pode exceder a capacidade do tanque (${tanque.capacidade.toLocaleString()} L)`;
  return valor;
}

/**
 * A tela de Tanques: carrega pela fonte ligada (API com `VITE_API_TANQUES`, Supabase sem — ver
 * `carregar-painel.ts`) e grava a régua do dia (`gravar-medicao.ts`). As contas estão em
 * `montar-painel.ts`.
 */
export const useDashboardEstoque = () => {
  const { postoAtivoId } = usePosto();
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [histories, setHistories] = useState<TankHistory>({});
  // Despesa operacional por litro do mês corrente — alimenta o "Lucro Previsto" (0 sem despesa).
  const [despesaLitro, setDespesaLitro] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingMedicao, setSavingMedicao] = useState(false);
  const modal = useModalMedicao();

  const aplicar = useCallback((painel: PainelMontado) => {
    setDespesaLitro(painel.despesaLitro);
    setTanques(painel.tanques);
    setHistories(painel.historicos);
    setLoading(false);
  }, []);
  const falhar = useCallback((erro: string) => {
    console.error('Erro ao carregar tanques', erro);
    setLoading(false);
  }, []);

  /** O botão "Atualizar" e a releitura depois de medir: mostram o carregando. */
  const loadData = useCallback(async () => {
    if (postoAtivoId === 0) return;
    setLoading(true);
    (await carregarPainel(postoAtivoId)).match(aplicar, falhar);
  }, [postoAtivoId, aplicar, falhar]);

  // A primeira leitura (e a troca de posto) só aplica o resultado: o `loading` já nasce `true`.
  useEffect(() => {
    if (postoAtivoId === 0) return;
    void carregarPainel(postoAtivoId).match(aplicar, falhar);
  }, [postoAtivoId, aplicar, falhar]);

  const handleSaveMedicao = async () => {
    const tanque = modal.selectedTanque;
    if (tanque === null || modal.medicaoValue === '' || postoAtivoId === 0) return;
    const valor = validarMedicao(modal.medicaoValue, tanque);
    if (typeof valor === 'string') {
      alert(valor);
      return;
    }
    setSavingMedicao(true);
    const gravado = await gravarMedicao(postoAtivoId, tanque.id, hojeIso(), valor);
    setSavingMedicao(false);
    if (gravado.isErr()) {
      alert(`Erro ao salvar medição: ${gravado.error}`);
      return;
    }
    modal.fecharEnviado();
    await loadData();
  };

  const { fecharEnviado: _fechar, ...estadoDoModal } = modal;
  return { loading, tanques, histories, despesaLitro, ...estadoDoModal, savingMedicao, loadData, handleSaveMedicao };
};
