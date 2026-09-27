import { errAsync, okAsync, type ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, corteDaTelaLigado, enviarParaApi, type ErroDaApi } from './base';

/**
 * A tela "Produtos e Estoque" (loja) pela API Laravel (#103, `painel-pela-api.md` §12): a lista dos
 * produtos, o "Novo/Editar Produto" e a "Registrar Movimentação".
 *
 * @remarks
 * Nenhuma conta aqui: preço e custo chegam e saem em string decimal, o Zod valida na borda e o
 * `Number()` da leitura é o mesmo que o PostgREST fazia. O custo médio da entrada é do servidor
 * (`PrecoMedioDoProduto.php`, o porte de `calculos-estoque-produto.ts`); o "Valor em Estoque" da tela
 * continua no hook, com a mesma conta.
 */

/**
 * `true` quando a tela INTEIRA — lista, cadastro, edição e movimentação — fala com a API.
 * `VITE_API_ESTOQUE` ausente segue o `VITE_API_URL`; `0` a deixa no Supabase.
 */
export function estoqueDeProdutosPelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_ESTOQUE);
}

const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/**
 * Decimal que SAI do painel: o `String(numero)` do formulário, com as casas do float — o texto que o
 * supabase-js mandava. O `numeric(10,2)` arredonda no banco, como antes. Espelha a regra do
 * `ProdutoDoPainelRequest.php` (até 7 dígitos inteiros, sem expoente).
 */
export const decimalDoFormulario = z.string().regex(/^-?\d{1,7}(\.\d{1,20})?$/, 'valor fora do formato aceito');

const inteiroDaColuna = z.number().int().min(-1_000_000).max(1_000_000);

/** Espelha `ProdutoDoPainelResource.php`. */
export const produtoDaApi = z.object({
    id: z.number().int(),
    nome: z.string(),
    codigo_barras: z.string().nullable(),
    categoria: z.string(),
    descricao: z.string().nullable(),
    preco_custo: decimalEmString,
    preco_venda: decimalEmString,
    estoque_atual: z.number().int(),
    estoque_minimo: z.number().int(),
    unidade_medida: z.string(),
    ativo: z.boolean().nullable(),
    posto_id: z.number().int().nullable(),
    created_at: z.string().nullable(),
});

export type ProdutoDaApi = z.infer<typeof produtoDaApi>;

/** Corpo de `PUT /estoque/produtos/{id}` — espelha `ProdutoDoPainelRequest.php`. */
export const produtoDeclarado = z.object({
    nome: z.string().trim().min(1, 'nome vazio'),
    codigo_barras: z.string().nullable(),
    categoria: z.string().min(1),
    preco_custo: decimalDoFormulario,
    preco_venda: decimalDoFormulario,
    estoque_minimo: inteiroDaColuna,
    unidade_medida: z.string().min(1),
    descricao: z.string().nullable(),
});

/** Corpo de `POST /estoque/produtos`: o formulário, a chave da tentativa e o estoque inicial. */
export const produtoNovoDeclarado = produtoDeclarado.extend({ chave: z.string().uuid(), estoque_inicial: inteiroDaColuna });

/** Corpo de `POST /estoque/movimentacoes` — espelha `MovimentacaoDoPainelRequest.php`. */
export const movimentacaoDeclarada = z.object({
    chave: z.string().uuid(),
    produto_id: z.number().int().positive(),
    tipo: z.union([z.literal('entrada'), z.literal('saida'), z.literal('ajuste')]),
    quantidade: z.number().int().min(1).max(1_000_000),
    valor_unitario: decimalDoFormulario.optional(),
    observacao: z.string().nullable(),
});

export type ProdutoDeclarado = z.infer<typeof produtoDeclarado>;
export type ProdutoNovoDeclarado = z.infer<typeof produtoNovoDeclarado>;
export type MovimentacaoDeclarada = z.infer<typeof movimentacaoDeclarada>;

const produtoGravado = z.object({ data: z.object({ repetido: z.boolean(), produto: produtoDaApi }) });

const movimentacaoGravada = z.object({
    data: z.object({
        repetido: z.boolean(),
        movimentacao: z.object({ id: z.number().int(), produto_id: z.number().int(), tipo: z.string(), quantidade: z.number().int() }).passthrough(),
        produto: produtoDaApi,
    }),
});

/** O corpo passa pelo schema antes de sair: valor fora do contrato não chega ao servidor. */
function validado<T>(schema: z.ZodType<T>, corpo: unknown): ResultAsync<T, ErroDaApi> {
    const lido = schema.safeParse(corpo);
    return lido.success ? okAsync(lido.data) : errAsync({ tipo: 'formato', detalhe: lido.error.message });
}

/** Os produtos ATIVOS do posto, por nome, com o custo. Rota `posto.acesso:gerir`. */
export function lerProdutosDaApi(postoId: number): ResultAsync<ProdutoDaApi[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/estoque/produtos`, z.object({ data: z.array(produtoDaApi) })).map((r) => r.data);
}

/** "Novo Produto" — idempotente pela `chave`: repetir devolve o mesmo produto. */
export function cadastrarProdutoNaApi(postoId: number, corpo: ProdutoNovoDeclarado): ResultAsync<ProdutoDaApi, ErroDaApi> {
    return validado(produtoNovoDeclarado, corpo)
        .andThen((limpo) => enviarParaApi(`/api/postos/${postoId}/estoque/produtos`, 'POST', limpo, produtoGravado))
        .map((r) => r.data.produto);
}

/** "Editar Produto" — nunca mexe no estoque. */
export function editarProdutoNaApi(postoId: number, produtoId: number, corpo: ProdutoDeclarado): ResultAsync<ProdutoDaApi, ErroDaApi> {
    return validado(produtoDeclarado, corpo)
        .andThen((limpo) => enviarParaApi(`/api/postos/${postoId}/estoque/produtos/${produtoId}`, 'PUT', limpo, z.object({ data: produtoDaApi })))
        .map((r) => r.data);
}

/** "Registrar Movimentação" — idempotente pela `chave`: repetir não mexe no estoque outra vez. */
export function movimentarEstoqueNaApi(postoId: number, corpo: MovimentacaoDeclarada): ResultAsync<ProdutoDaApi, ErroDaApi> {
    return validado(movimentacaoDeclarada, corpo)
        .andThen((limpo) => enviarParaApi(`/api/postos/${postoId}/estoque/movimentacoes`, 'POST', limpo, movimentacaoGravada))
        .map((r) => r.data.produto);
}
