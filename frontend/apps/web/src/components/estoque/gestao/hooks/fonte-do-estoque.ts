/**
 * De onde a tela Produtos e Estoque (loja) lê e grava: Supabase (o caminho de hoje, `stockService`) ou
 * API Laravel (#103, `painel-pela-api.md` §12), pela flag da tela ({@link estoqueDeProdutosPelaApi}).
 * As duas fontes entregam o MESMO `Produto`; a tela — e a conta do "Valor em Estoque" no hook — não
 * sabe qual respondeu.
 *
 * Paridade da fonte da API com o Supabase, campo a campo:
 * - lista: os ativos do posto, por nome (`.eq('ativo', true).eq('posto_id').order('nome')`); preço e
 *   custo chegam em string decimal e viram número pelo mesmo `Number()` que o PostgREST fazia;
 * - cadastro/edição: os mesmos campos do formulário; o posto vai na ROTA, não no corpo; preço vai como
 *   `String(numero)` — o texto que o supabase-js mandava — e o `numeric(10,2)` arredonda no banco;
 * - movimentação: os mesmos campos; estoque e custo médio mudam no SERVIDOR, numa transação (antes,
 *   três chamadas soltas do navegador). A hora é a do servidor.
 * - toda gravação leva a chave da TENTATIVA (uma por abertura do modal): o mesmo "Salvar" chegando
 *   duas vezes não cria o produto duas vezes nem soma o estoque duas vezes.
 */
import { ResultAsync } from 'neverthrow';
import { stockService } from '../../../../services/stockService';
import { descreverErroDaApi } from '../../../../services/api/base';
import {
    cadastrarProdutoNaApi,
    editarProdutoNaApi,
    estoqueDeProdutosPelaApi,
    lerProdutosDaApi,
    movimentarEstoqueNaApi,
    type ProdutoDaApi,
    type ProdutoDeclarado,
} from '../../../../services/api/estoque-produtos.api';
import type { MovementFormData, MovementType, Produto, ProductFormData } from '../types';

const TIPOS: readonly MovementType[] = ['entrada', 'saida', 'ajuste'];

const texto = (formulario: FormData, campo: string): string => {
    const valor = formulario.get(campo);
    return typeof valor === 'string' ? valor : '';
};

const mensagem = (erro: unknown, padrao: string): string => (erro instanceof Error ? erro.message : padrao);

/** O formulário "Novo/Editar Produto", lido como o hook sempre leu (`Number()` em cada número). */
export function produtoDoFormulario(formulario: FormData): ProductFormData {
    return {
        nome: texto(formulario, 'nome'),
        codigo_barras: texto(formulario, 'codigo_barras'),
        categoria: texto(formulario, 'categoria'),
        preco_custo: Number(texto(formulario, 'preco_custo')),
        preco_venda: Number(texto(formulario, 'preco_venda')),
        estoque_minimo: Number(texto(formulario, 'estoque_minimo')),
        unidade_medida: texto(formulario, 'unidade_medida'),
        descricao: texto(formulario, 'descricao'),
        // `Number(formData.get('estoque_inicial') || 0)`: ausente (edição) ou vazio é 0.
        estoque_inicial: Number(texto(formulario, 'estoque_inicial') || 0),
    };
}

/** O formulário "Registrar Movimentação". O custo unitário só é lido na entrada, como antes. */
export function movimentoDoFormulario(formulario: FormData): MovementFormData {
    const tipo = TIPOS.find((t) => t === texto(formulario, 'tipo')) ?? 'entrada';
    const base = { tipo, quantidade: Number(texto(formulario, 'quantidade')), observacao: texto(formulario, 'observacao') };
    return tipo === 'entrada' ? { ...base, valor_unitario: Number(texto(formulario, 'valor_unitario')) } : base;
}

/** Um produto da API no tipo da tela. Exportada para o teste de paridade. */
export function produtoDaApiNaTela(p: ProdutoDaApi, postoId: number): Produto {
    return {
        id: p.id,
        nome: p.nome,
        preco_venda: Number(p.preco_venda),
        preco_custo: Number(p.preco_custo),
        estoque_atual: p.estoque_atual,
        estoque_minimo: p.estoque_minimo,
        categoria: p.categoria,
        codigo_barras: p.codigo_barras,
        unidade_medida: p.unidade_medida,
        descricao: p.descricao,
        // As mesmas duas conversões do `paraProduto` do `stockService`.
        ativo: p.ativo ?? false,
        posto_id: p.posto_id ?? postoId,
        ...(p.created_at === null ? {} : { created_at: p.created_at }),
    };
}

const vazioENulo = (valor: string): string | null => (valor === '' ? null : valor);

function corpoDoProduto(dados: ProductFormData): ProdutoDeclarado {
    return {
        nome: dados.nome,
        codigo_barras: vazioENulo(dados.codigo_barras),
        categoria: dados.categoria,
        preco_custo: String(dados.preco_custo),
        preco_venda: String(dados.preco_venda),
        estoque_minimo: dados.estoque_minimo,
        unidade_medida: dados.unidade_medida,
        descricao: vazioENulo(dados.descricao),
    };
}

/* ------------------------------------------------------------------------ a escolha ------- */

/** A lista da tela: os produtos ativos do posto. O erro é a mensagem para o console. */
export function carregarProdutos(postoId: number): ResultAsync<Produto[], string> {
    if (estoqueDeProdutosPelaApi()) {
        return lerProdutosDaApi(postoId).map((lista) => lista.map((p) => produtoDaApiNaTela(p, postoId))).mapErr(descreverErroDaApi);
    }
    return ResultAsync.fromPromise(stockService.getAllProducts(postoId), (erro) => mensagem(erro, 'Erro ao carregar produtos'));
}

/** Cadastra (sem `produtoId`) ou edita. O erro é a mensagem do `alert`. */
export function gravarProduto(postoId: number, dados: ProductFormData, produtoId: number | undefined, chave: string): ResultAsync<void, string> {
    if (estoqueDeProdutosPelaApi()) {
        const corpo = corpoDoProduto(dados);
        const gravacao =
            produtoId === undefined
                ? cadastrarProdutoNaApi(postoId, { ...corpo, chave, estoque_inicial: dados.estoque_inicial ?? 0 })
                : editarProdutoNaApi(postoId, produtoId, corpo);
        return gravacao.map(() => undefined).mapErr((erro) => `Erro ao salvar produto. ${descreverErroDaApi(erro)}`);
    }

    // O caminho de hoje, intacto: o `estoque_inicial` não vai na edição, e o posto vai no corpo.
    const { estoque_inicial: estoqueInicial, ...productData } = dados;
    const pedido =
        produtoId === undefined
            ? stockService.createProduct({ ...productData, estoque_atual: estoqueInicial ?? 0, posto_id: postoId })
            : stockService.updateProduct(produtoId, productData);
    return ResultAsync.fromPromise(pedido, () => 'Erro ao salvar produto').map(() => undefined);
}

/** A "Registrar Movimentação". O erro é a mensagem do `alert`. */
export function registrarMovimentacao(postoId: number, produtoId: number, movimento: MovementFormData, chave: string): ResultAsync<void, string> {
    if (estoqueDeProdutosPelaApi()) {
        const valor = movimento.tipo === 'entrada' && movimento.valor_unitario !== undefined ? { valor_unitario: String(movimento.valor_unitario) } : {};
        return movimentarEstoqueNaApi(postoId, {
            chave,
            produto_id: produtoId,
            tipo: movimento.tipo,
            quantidade: movimento.quantidade,
            observacao: vazioENulo(movimento.observacao),
            ...valor,
        })
            .map(() => undefined)
            .mapErr((erro) => `Erro ao registrar movimentação. ${descreverErroDaApi(erro)}`);
    }

    const pedido = stockService.registerMovement({
        produto_id: produtoId,
        tipo: movimento.tipo,
        quantidade: movimento.quantidade,
        ...(movimento.valor_unitario === undefined ? {} : { valor_unitario: movimento.valor_unitario }),
        observacao: movimento.observacao,
        data: new Date().toISOString(),
        posto_id: postoId,
    });
    return ResultAsync.fromPromise(pedido, () => 'Erro ao registrar movimentação').map(() => undefined);
}
