import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { hojeIso } from '@posto/utils';
import { decimalDaApi, lerDaApi, postarNaApi, type ErroDeApi } from '@frentista/shared/api';
import type { Produto, VendaDeHoje } from '../model/schema';

/**
 * A tela de Vendas pela API Laravel (#101, fatia 2).
 *
 * @remarks O carrinho vai INTEIRO numa chamada (tudo ou nada) e só com produto e quantidade: o preço
 *          e o total são do SERVIDOR, sobre o preço do banco, em decimal exato. O caminho do Supabase
 *          grava item a item com `preco_venda * quantidade` em float no cliente (dívida §2 g do Design
 *          Doc do FSD) — por isso a tela não manda preço nenhum aqui.
 */
const produtosSchema = z.object({
  data: z.array(z.object({
    id: z.number(),
    nome: z.string(),
    preco_venda: decimalDaApi,
    estoque_atual: z.number(),
    categoria: z.string(),
    unidade_medida: z.string(),
  })),
});

const vendaSchema = z.object({
  id: z.number(),
  quantidade: decimalDaApi,
  valor_unitario: decimalDaApi,
  valor_total: decimalDaApi,
  data: z.string(),
  produto: z.object({ nome: z.string(), categoria: z.string() }).nullable().optional(),
});

const vendasSchema = z.object({ data: z.array(vendaSchema) });

const carrinhoRegistradoSchema = z.object({ data: z.object({ repetido: z.boolean(), vendas: z.array(vendaSchema) }) });

/** Um item do carrinho como a API o aceita: produto e quantidade inteira (≥ 1). */
export interface ItemDoCarrinho {
  readonly produto_id: number;
  readonly quantidade: number;
}

export function buscarProdutosPelaApi(postoId: number, token: string): ResultAsync<Produto[], ErroDeApi> {
  return lerDaApi(`/api/postos/${postoId}/produtos`, null, token, produtosSchema).map((resposta) => resposta.data);
}

/**
 * Vendas de hoje do frentista do TOKEN. "Hoje" é o do aparelho: a meia-noite LOCAL e a do dia
 * seguinte, em UTC — o mesmo recorte de `buscarVendasDeHoje` (a venda das 21h30 é de hoje).
 */
export function buscarVendasDeHojePelaApi(postoId: number, token: string): ResultAsync<VendaDeHoje[], ErroDeApi> {
  const inicio = new Date(`${hojeIso()}T00:00:00`);
  const fim = new Date(inicio);
  fim.setDate(fim.getDate() + 1);
  return lerDaApi(`/api/postos/${postoId}/vendas`, { inicio: inicio.toISOString(), fim: fim.toISOString() }, token, vendasSchema)
    .map((resposta) => resposta.data.map((venda) => ({ ...venda, produto: venda.produto ?? null })));
}

/**
 * Registra o carrinho. `chave` é o UUID desta tentativa: repetir o MESMO carrinho com a mesma chave
 * (a rede caiu depois de gravar) devolve as linhas já gravadas, sem vender em dobro.
 *
 * @returns `Err` 422 `sem_estoque`/`produto_invalido`, 409 `chave_reutilizada`, 401 sem sessão.
 */
export function registrarCarrinhoPelaApi(postoId: number, token: string, chave: string, itens: readonly ItemDoCarrinho[]): ResultAsync<void, ErroDeApi> {
  return postarNaApi(`/api/postos/${postoId}/vendas`, { chave, itens }, token, carrinhoRegistradoSchema).map(() => undefined);
}
