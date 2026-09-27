import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { usePosto } from '../../../../contexts/usePosto';
import { Produto, MovementType } from '../types';
import { carregarProdutos, gravarProduto, movimentoDoFormulario, produtoDoFormulario, registrarMovimentacao } from './fonte-do-estoque';

/** Uma chave de idempotência por TENTATIVA — gerada a cada abertura de modal (ver `fonte-do-estoque`). */
const novaChave = (): string => crypto.randomUUID();

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
  const chaveDoModal = useRef<string>(novaChave());

  const aplicar = useCallback((lidos: Produto[]) => {
    setProducts(lidos);
    setLoading(false);
  }, []);
  const falhar = useCallback((erro: string) => {
    console.error('Error loading products:', erro);
    setLoading(false);
  }, []);

  /** Releitura depois de gravar: mostra o spinner, como antes. */
  const loadProducts = useCallback(async () => {
    if (postoAtivoId === 0) return;
    setLoading(true);
    (await carregarProdutos(postoAtivoId)).match(aplicar, falhar);
  }, [postoAtivoId, aplicar, falhar]);

  // A primeira leitura (e a troca de posto) sem `setLoading` síncrono no efeito — o React 19 o
  // barra; o spinner inicial já vem do `useState(true)`.
  useEffect(() => {
    if (postoAtivoId === 0) return;
    void carregarProdutos(postoAtivoId).match(aplicar, falhar);
  }, [postoAtivoId, aplicar, falhar]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo_barras?.includes(searchTerm);
      const matchesCategory = selectedCategory === 'Todos' || p.categoria === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const stats = useMemo(() => {
    // `estoque_minimo` e `preco_custo` são NOT NULL DEFAULT 0 no banco
    // (banco/init/01-esquema-base.sql). O tipo de dominio `Produto` em
    // @posto/types os declara anuláveis — a divergência é do tipo, não do dado.
    // Sem mínimo cadastrado, o comportamento é o do default do banco (0):
    // só conta como baixo quem está zerado ou negativo.
    const lowStockCount = products.filter(p => p.estoque_atual <= (p.estoque_minimo ?? 0)).length;

    // Dinheiro: custo ausente não vira 0 em silêncio. Se algum dia chegar null,
    // o total sai subestimado e o console avisa quais produtos causaram isso.
    const semCusto = products.filter(p => p.preco_custo === null || p.preco_custo === undefined);
    if (semCusto.length > 0) {
      console.warn(
        `[estoque] ${semCusto.length} produto(s) sem preco_custo — valor total do estoque está SUBESTIMADO`,
        semCusto.map(p => ({ id: p.id, nome: p.nome }))
      );
    }
    const totalValue = products.reduce((acc, p) => acc + (p.estoque_atual * (p.preco_custo ?? 0)), 0);
    return { lowStockCount, totalValue, totalProducts: products.length };
  }, [products]);

  const handleSaveProduct = async (formData: FormData) => {
    const gravado = await gravarProduto(postoAtivoId, produtoDoFormulario(formData), editingProduct?.id, chaveDoModal.current);
    if (gravado.isErr()) {
      console.error('Error saving product:', gravado.error);
      alert(gravado.error);
      return;
    }
    setIsProductModalOpen(false);
    setEditingProduct(null);
    void loadProducts();
  };

  const handleSaveMovement = async (formData: FormData) => {
    if (!selectedProductForMovement) return;

    const gravado = await registrarMovimentacao(postoAtivoId, selectedProductForMovement.id, movimentoDoFormulario(formData), chaveDoModal.current);
    if (gravado.isErr()) {
      console.error('Error saving movement:', gravado.error);
      alert(gravado.error);
      return;
    }
    setIsMovementModalOpen(false);
    setSelectedProductForMovement(null);
    setMovementType('entrada'); // Reset default
    void loadProducts();
  };

  const openNewProductModal = () => {
    chaveDoModal.current = novaChave();
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (product: Produto) => {
    chaveDoModal.current = novaChave();
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const openMovementModal = (product: Produto) => {
    chaveDoModal.current = novaChave();
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
