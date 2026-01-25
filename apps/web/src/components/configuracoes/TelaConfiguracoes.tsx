// [10/01 17:46] Criado durante refatoração Issue #16
// [10/01 17:55] Fix: Passando postoAtivoId para useResetSistema
import React from 'react';
import { Settings, AlertTriangle, RotateCcw, Save } from 'lucide-react';
import { usePosto } from '../../contexts/PostoContext';
import { FormaPagamento } from './types';
import {
    useConfiguracoesData,
    useFormaPagamento,
    useParametros,
    useResetSistema
} from './hooks/index';
import {
    GestaoProdutos,
    GestaoBicos,
    GestaoFormasPagamento,
    ParametrosFechamento,
    ParametrosEstoque,
    ModalResetSistema
} from './components/index';

/**
 * Tela de Configurações do Sistema.
 * Permite gerenciar produtos, bicos, formas de pagamento e parâmetros gerais.
 */
const TelaConfiguracoes: React.FC = () => {
    const { postoAtivoId } = usePosto();

    // Hooks de Dados e Controle
    const {
        products,
        nozzles,
        paymentMethods,
        setPaymentMethods,
        loading
    } = useConfiguracoesData();

    const {
        tolerance,
        diasEstoqueCritico,
        diasEstoqueBaixo,
        configsModified,
        updateTolerance,
        updateDiasCritico,
        updateDiasBaixo,
        handleSaveConfigs
    } = useParametros(postoAtivoId);

    const {
        isResetModalOpen,
        isResetting,
        openResetModal,
        closeResetModal,
        handleReset
    } = useResetSistema(postoAtivoId);

    const {
        isPaymentModalOpen,
        editingPayment,
        paymentForm,
        openPaymentModal,
        setIsPaymentModalOpen,
        handleFormChange,
        handleSavePayment,
        handleToggleStatus
    } = useFormaPagamento(postoAtivoId, setPaymentMethods);

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans">
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 z-10">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                            <Settings size={20} />
                            <h1 className="text-xl font-bold font-display uppercase tracking-wider">Configurações</h1>
                        </div>
                    </div>

                    {configsModified && (
                        <button
                            onClick={handleSaveConfigs}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20 animate-in fade-in slide-in-from-right-4"
                        >
                            <Save size={16} />
                            Salvar Alterações
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide pb-24">
                    <div className="w-full mx-auto space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Coluna Esquerda: Produtos e Bicos */}
                            <div className="space-y-6">
                                <GestaoProdutos
                                    products={products}
                                    loading={loading}
                                />
                                <GestaoBicos
                                    nozzles={nozzles}
                                    loading={loading}
                                />
                            </div>

                            {/* Coluna Direita: Pagamentos, Parâmetros e Reset */}
                            <div className="space-y-6">
                                <GestaoFormasPagamento
                                    paymentMethods={paymentMethods}
                                    loading={loading}
                                    onAdd={() => openPaymentModal()}
                                    onEdit={(method) => openPaymentModal(method)}
                                    onToggleStatus={handleToggleStatus}
                                    modal={{
                                        isOpen: isPaymentModalOpen,
                                        editingPayment,
                                        formData: paymentForm,
                                        onClose: () => setIsPaymentModalOpen(false),
                                        onSave: handleSavePayment,
                                        onChange: handleFormChange
                                    }}
                                />

                                <ParametrosFechamento
                                    tolerance={tolerance}
                                    saving={false} // Managed internally by ParametrosFechamento or parent if needed
                                    modified={configsModified}
                                    onChange={updateTolerance}
                                    onSave={handleSaveConfigs}
                                />

                                <ParametrosEstoque
                                    diasCritico={diasEstoqueCritico}
                                    diasBaixo={diasEstoqueBaixo}
                                    saving={false}
                                    modified={configsModified}
                                    onChangeCritico={updateDiasCritico}
                                    onChangeBaixo={updateDiasBaixo}
                                    onSave={handleSaveConfigs}
                                />

                                <div className="bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 p-6">
                                    <h3 className="text-red-800 dark:text-red-400 font-bold mb-2 flex items-center gap-2">
                                        <AlertTriangle size={20} />
                                        Zona de Perigo
                                    </h3>
                                    <p className="text-sm text-red-600 dark:text-red-300 mb-4">
                                        Ações destrutivas que não podem ser desfeitas.
                                    </p>
                                    <button
                                        onClick={openResetModal}
                                        className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                                    >
                                        <RotateCcw size={18} />
                                        RESETAR SISTEMA COMPLETO
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ModalResetSistema
                    isOpen={isResetModalOpen}
                    isResetting={isResetting}
                    onClose={closeResetModal}
                    onConfirm={handleReset}
                />
            </main>
        </div>
    );
};

export default TelaConfiguracoes;
