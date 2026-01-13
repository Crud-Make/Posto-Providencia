import { useState, useEffect, useMemo, useCallback } from 'react';
import { stockService } from '../../../../services/stockService';
import { usePosto } from '../../../../contexts/PostoContext';
import { Produto, MovementType } from '../types';

export const useGestaoEstoque = () => {
  const { postoAtivoId } = usePosto();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Produto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Produto | null>(null);
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<Produto | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('entrada');

  const loadProducts = useCallback(async () => {
    if (!postoAtivoId) return;
    
    setLoading(true);
    try {
      const data = await stockService.getAllProducts(postoAtivoId);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [postoAtivoId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_barras?.includes(searchTerm);
      const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const stats = useMemo(() => {
    const lowStockCount = products.filter(p => p.estoque_atual <= p.estoque_minimo).length;
    const totalValue = products.reduce((acc, p) => acc + (p.estoque_atual * p.preco_custo), 0);
    return { lowStockCount, totalValue, totalProducts: products.length };
  }, [products]);

  const handleSaveProduct = async (formData: FormData) => {
    const productData = {
      nome: formData.get('nome') as string,
      codigo_barras: formData.get('codigo_barras') as string,
      categoria: formData.get('categoria') as string,
      preco_custo: Number(formData.get('preco_custo')),
      preco_venda: Number(formData.get('preco_venda')),
      estoque_minimo: Number(formData.get('estoque_minimo')),
      unidade_medida: formData.get('unidade_medida') as string,
      descricao: formData.get('descricao') as string,
    };

    try {
      if (editingProduct) {
        await stockService.updateProduct(editingProduct.id, productData);
      } else {
        await stockService.createProduct({
          ...productData,
          estoque_atual: Number(formData.get('estoque_inicial') || 0),
          posto_id: postoAtivoId
        });
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Erro ao salvar produto');
    }
  };

  const handleSaveMovement = async (formData: FormData) => {
    if (!selectedProductForMovement) return;

    const type = formData.get('tipo') as MovementType;
    const quantity = Number(formData.get('quantidade'));

    try {
      await stockService.registerMovement({
        produto_id: selectedProductForMovement.id,
        tipo: type,
        quantidade: quantity,
        valor_unitario: type === 'entrada' ? Number(formData.get('valor_unitario')) : undefined,
        observacao: formData.get('observacao') as string,
        data: new Date().toISOString(),
        posto_id: postoAtivoId
      });
      setIsMovementModalOpen(false);
      setSelectedProductForMovement(null);
      setMovementType('entrada'); // Reset default
      loadProducts();
    } catch (error) {
      console.error('Error saving movement:', error);
      alert('Erro ao registrar movimentação');
    }
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Produto) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const openMovementModal = (product: Produto) => {
    setSelectedProductForMovement(product);
    setMovementType('entrada');
    setIsMovementModalOpen(true);
  };

  return {
    loading,
    products: filteredProducts,
    stats,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    
    // Modal states & Actions
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
  };
};
