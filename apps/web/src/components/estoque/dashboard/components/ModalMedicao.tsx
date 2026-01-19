import React from 'react';
import { Ruler } from 'lucide-react';
import { Tanque } from '../types';

interface ModalMedicaoProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedTanque: Tanque | null;
  setSelectedTanque: (tanque: Tanque | null) => void;
  medicaoValue: string;
  setMedicaoValue: (value: string) => void;
  medicaoObservacao: string;
  setMedicaoObservacao: (value: string) => void;
  tanques: Tanque[];
  saving: boolean;
}

const ModalMedicao: React.FC<ModalMedicaoProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedTanque,
  setSelectedTanque,
  medicaoValue,
  setMedicaoValue,
  medicaoObservacao,
  setMedicaoObservacao,
  tanques,
  saving
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Ruler className="text-blue-600" size={24} />
            Nova Medição (Régua)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Seleção do Tanque */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Selecione o Tanque
          </label>
          <select
            value={selectedTanque?.id || ''}
            onChange={(e) => {
              const tanque = tanques.find(t => t.id === Number(e.target.value));
              if (tanque) {
                setSelectedTanque(tanque);
                setMedicaoValue(tanque.estoque_atual.toString().replace('.', ','));
              }
            }}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Escolha um tanque...</option>
            {tanques.map(t => (
              <option key={t.id} value={t.id}>
                {t.nome} - {t.combustivel?.nome} (Atual: {t.estoque_atual.toLocaleString()} L)
              </option>
            ))}
          </select>
        </div>

        {/* Valor da Medição */}
        {selectedTanque && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Volume Medido (Litros)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={medicaoValue}
                  onChange={(e) => setMedicaoValue(e.target.value)}
                  placeholder="Ex: 15000"
                  className="w-full pl-4 pr-12 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono font-bold"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">L</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Capacidade Máxima: {selectedTanque.capacidade.toLocaleString()} L
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Observações (Opcional)
              </label>
              <textarea
                value={medicaoObservacao}
                onChange={(e) => setMedicaoObservacao(e.target.value)}
                placeholder="Ex: Medição realizada após descarga..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              ></textarea>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onSave}
                disabled={saving || !medicaoValue}
                className="flex-1 px-4 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? 'Salvando...' : 'Confirmar Medição'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModalMedicao;
