import React from 'react';
import { Plus } from 'lucide-react';
import { useGestaoEstoque } from './hooks/useGestaoEstoque';
import StatsEstoque from './components/StatsEstoque';
import FiltrosEstoque from './components/FiltrosEstoque';
import TabelaEstoque from './components/TabelaEstoque';
import ModalProduto from './components/ModalProduto';
import ModalMovimentacao from './components/ModalMovimentacao';

const TelaGestaoEstoque: React.FC = () => {
  const {
    loading,
    products,
    stats,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    isProductModalOpen,
    setIsProductModalOpen,
    isMovementModalOpen,
    setIsMovementModalOpen,
    editingProduct,
    selectedProductForMovement,
    movementType,
    setMovementType,
    openNewProductModal,
    openEditProductModal,
    openMovementModal,
    handleSaveProduct,
    handleSaveMovement
  } = useGestaoEstoque();

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8 space-y-6 font-sans text-gray-800">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gray-900">Gestão de Estoque (Produtos)</h2>
          <p className="text-gray-500 mt-1">Gerencie lubrificantes, aditivos e outros itens da loja.</p>
        </div>
        <button
          onClick={openNewProductModal}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all"
        >
          <Plus size={20} />
          Novo Produto
        </button>
      </div>

      {/* Stats Cards */}
      <StatsEstoque stats={stats} />

      {/* Filters and Search */}
      <FiltrosEstoque
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      {/* Product List */}
      <TabelaEstoque
        loading={loading}
        products={products}
        onMovement={openMovementModal}
        onEdit={openEditProductModal}
      />

      {/* Modals */}
      <ModalProduto
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
      />

      <ModalMovimentacao
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        onSave={handleSaveMovement}
        product={selectedProductForMovement}
        movementType={movementType}
        setMovementType={setMovementType}
      />

    </div>
  );
};

export default TelaGestaoEstoque;
