import React from 'react';
import { Droplet, History, Ruler, AlertTriangle } from 'lucide-react';
import { useDashboardEstoque } from './hooks/useDashboardEstoque';
import FuelTank from './components/FuelTank';
import ResumoFinanceiro from './components/ResumoFinanceiro';
import TabelaResumo from './components/TabelaResumo';
import ModalMedicao from './components/ModalMedicao';
import { InventoryHistoryChart } from './components/InventoryHistoryChart';

const TelaDashboardEstoque: React.FC = () => {
  const {
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
  } = useDashboardEstoque();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Carregando tanques...</p>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3 font-display uppercase tracking-wider">
            <Droplet className="text-blue-600" />
            Tanques de Combustível
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitoramento em tempo real dos estoques físicos e conciliação.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <History size={16} /> Atualizar
          </button>
          <button
            onClick={() => openMedicaoModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Ruler size={16} /> Nova Medição (Régua)
          </button>
        </div>
      </div>

      {tanques.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 shadow-sm">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nenhum tanque configurado</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            Para começar a controlar o estoque corretamente, você precisa cadastrar os tanques físicos do seu posto e suas capacidades.
          </p>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg inline-block text-sm">
            Vá em <strong>Configurações &gt; Gestão de Tanques</strong> para cadastrar.
          </div>
        </div>
      ) : (
        <>
          <ResumoFinanceiro tanques={tanques} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {tanques.map(tanque => (
              <FuelTank
                key={tanque.id}
                name={tanque.nome}
                productName={tanque.combustivel?.nome || 'Produto Indefinido'}
                capacity={tanque.capacidade}
                currentVolume={tanque.estoque_atual}
              />
            ))}
          </div>

          <TabelaResumo tanques={tanques} />

          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Evolução do Estoque (30 dias)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tanques.map(t => (
                <InventoryHistoryChart key={t.id} tankName={t.nome} data={histories[t.id]} />
              ))}
            </div>
          </div>
        </>
      )}

      <ModalMedicao
        isOpen={showMedicaoModal}
        onClose={() => setShowMedicaoModal(false)}
        onSave={handleSaveMedicao}
        selectedTanque={selectedTanque}
        setSelectedTanque={setSelectedTanque}
        medicaoValue={medicaoValue}
        setMedicaoValue={setMedicaoValue}
        medicaoObservacao={medicaoObservacao}
        setMedicaoObservacao={setMedicaoObservacao}
        tanques={tanques}
        saving={savingMedicao}
      />
    </div>
  );
};

export default TelaDashboardEstoque;
