import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * PARIDADE das duas fontes da tela Produtos e Estoque (#103, painel-pela-api.md §12): o MESMO posto,
 * na forma que o PostgREST entregava (número, `select('*')` com todas as colunas) e na forma da API
 * (string decimal), vira o MESMO `Produto[]` — e portanto os mesmos cartões ("Valor em Estoque",
 * "Estoque Baixo"), que o hook calcula igual para as duas.
 */
const { linhas } = vi.hoisted(() => ({ linhas: { Produto: [] as unknown[] } }));

vi.mock('../../../../services/supabase', () => ({
    supabase: {
        from: (tabela: string) => {
            const builder: Record<string, unknown> = {};
            for (const metodo of ['select', 'eq', 'order']) builder[metodo] = () => builder;
            builder['then'] = (ok: (v: unknown) => unknown) =>
                Promise.resolve({ data: tabela === 'Produto' ? linhas.Produto : [], error: null }).then(ok);
            return builder;
        },
    },
}));

import { carregarProdutos, movimentoDoFormulario, produtoDoFormulario } from './fonte-do-estoque';

/** Como o PostgREST devolvia: `numeric` como número, e as colunas que a tela não usa junto. */
const DO_SUPABASE = [
    { id: 2, nome: 'Aditivo', codigo_barras: '789', categoria: 'Aditivo', descricao: null, preco_custo: 4.5, preco_venda: 9.9, estoque_atual: 3,
        estoque_minimo: 5, unidade_medida: 'unidade', ativo: true, posto_id: 1, created_at: '2026-09-01T12:00:00+00:00', updated_at: 'x', chave_cadastro: null },
    { id: 1, nome: 'Óleo 20W', codigo_barras: null, categoria: 'Lubrificante', descricao: 'SAE', preco_custo: 1234.56, preco_venda: 19.9, estoque_atual: -2,
        estoque_minimo: 0, unidade_medida: 'litro', ativo: null, posto_id: 1, created_at: null, updated_at: 'x', chave_cadastro: null },
];

/** Como a API devolve (`ProdutoDoPainelResource.php`). */
const DA_API = [
    { id: 2, nome: 'Aditivo', codigo_barras: '789', categoria: 'Aditivo', descricao: null, preco_custo: '4.50', preco_venda: '9.90', estoque_atual: 3,
        estoque_minimo: 5, unidade_medida: 'unidade', ativo: true, posto_id: 1, created_at: '2026-09-01T12:00:00+00:00' },
    { id: 1, nome: 'Óleo 20W', codigo_barras: null, categoria: 'Lubrificante', descricao: 'SAE', preco_custo: '1234.56', preco_venda: '19.90', estoque_atual: -2,
        estoque_minimo: 0, unidade_medida: 'litro', ativo: null, posto_id: 1, created_at: null },
];

describe('as duas fontes da tela dão o mesmo produto', () => {
    beforeEach(() => {
        linhas.Produto = DO_SUPABASE;
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: DA_API }), { status: 200 })));
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('Supabase × API: o mesmo Produto[], com preço e custo em número exato', async () => {
        vi.stubEnv('VITE_API_ESTOQUE', '0');
        const peloSupabase = (await carregarProdutos(1))._unsafeUnwrap();
        vi.stubEnv('VITE_API_ESTOQUE', '1');
        const pelaApi = (await carregarProdutos(1))._unsafeUnwrap();

        expect(pelaApi).toEqual(peloSupabase);
        expect(pelaApi.map((p) => [p.preco_custo, p.preco_venda, p.estoque_atual, p.ativo])).toEqual([
            [4.5, 9.9, 3, true],
            [1234.56, 19.9, -2, false],
        ]);
        // O "Valor em Estoque" do hook, igual nas duas: 3 × 4,50 + (−2) × 1234,56 = −2455,62.
        const valor = (lista: typeof pelaApi): number => lista.reduce((acc, p) => acc + p.estoque_atual * (p.preco_custo ?? 0), 0);
        expect(valor(pelaApi)).toBe(valor(peloSupabase));
        expect(valor(pelaApi)).toBeCloseTo(-2455.62, 10);
    });

    it('os formulários são lidos como o hook sempre leu', () => {
        const produto = new FormData();
        for (const [k, v] of Object.entries({ nome: 'X', codigo_barras: '', categoria: 'Outros', preco_custo: '1.5', preco_venda: '2', estoque_minimo: '5', unidade_medida: 'caixa', descricao: '' })) {
            produto.set(k, v);
        }
        expect(produtoDoFormulario(produto)).toEqual({
            nome: 'X', codigo_barras: '', categoria: 'Outros', preco_custo: 1.5, preco_venda: 2, estoque_minimo: 5, unidade_medida: 'caixa', descricao: '', estoque_inicial: 0,
        });

        const saida = new FormData();
        saida.set('tipo', 'saida');
        saida.set('quantidade', '4');
        saida.set('valor_unitario', '9');
        saida.set('observacao', '');
        expect(movimentoDoFormulario(saida)).toEqual({ tipo: 'saida', quantidade: 4, observacao: '' });
        saida.set('tipo', 'entrada');
        expect(movimentoDoFormulario(saida)).toEqual({ tipo: 'entrada', quantidade: 4, observacao: '', valor_unitario: 9 });
    });
});
