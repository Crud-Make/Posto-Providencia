// Public API da entity produto (FSD-3). De fora, só por aqui.
export { buscarProdutosAtivos, buscarVendasDeHoje, registrarVenda } from './api/produto-api';
export {
  listaDeProdutosSchema,
  novaVendaSchema,
  produtoSchema,
  vendaCriadaSchema,
  vendaDeHojeSchema,
  vendasDeHojeSchema,
} from './model/schema';
export type { NovaVenda, Produto, VendaCriada, VendaDeHoje } from './model/schema';
