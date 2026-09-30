/**
 * Um período de teste para a aba Receitas e Despesas (#103): o MESMO movimento em dois formatos —
 * as linhas que o Supabase entrega a `useFinanceiro` e as que a API entrega — para o teste de
 * paridade exigir números idênticos. Tem os casos que já enganaram contas antes:
 * - o bico 2 é de Etanol, mas a Leitura dele diz Gasolina (`Leitura.combustivel_id` ≠ o do bico):
 *   a venda conta no combustível DO BICO, como o Supabase fazia;
 * - Etanol vendido sem compra no período (custo `null`, "produto sem compra");
 * - duas compras de Gasolina a preços diferentes (custo médio do período);
 * - despesa, receita extra e recebimento.
 */
export const GC = { id: 1, nome: 'Gasolina Comum', codigo: 'GC' };
export const ET = { id: 2, nome: 'Etanol', codigo: 'ET' };

export const BICOS = [
    { id: 11, numero: 1, combustivel: GC, bomba: { id: 1, nome: 'BOMBA 01' } },
    { id: 12, numero: 2, combustivel: ET, bomba: { id: 1, nome: 'BOMBA 01' } },
];

/** As linhas cruas do período, em reais (como o banco guarda). */
export const PERIODO = {
    leituras: [
        { id: 501, bico_id: 11, combustivel_id: 1, data: '2026-09-02T00:00:00+00:00', litros_vendidos: 1000.5, valor_total: 6893.45, preco_litro: 6.89 },
        { id: 502, bico_id: 12, combustivel_id: 1, data: '2026-09-02T00:00:00+00:00', litros_vendidos: 300, valor_total: 1467, preco_litro: 4.89 },
        { id: 503, bico_id: 11, combustivel_id: 1, data: '2026-09-15T00:00:00+00:00', litros_vendidos: 800.25, valor_total: 5513.72, preco_litro: 6.89 },
    ],
    compras: [
        { id: 701, combustivel_id: 1, data: '2026-09-01T00:00:00+00:00', quantidade_litros: 5000, valor_total: 29500, fornecedor: 'Distribuidora A' },
        { id: 702, combustivel_id: 1, data: '2026-09-10T00:00:00+00:00', quantidade_litros: 3000, valor_total: 18300.3, fornecedor: 'Distribuidora B' },
    ],
    despesas: [
        { id: 801, descricao: 'Energia', categoria: 'Energia', valor: 850.4, data: '2026-09-30' },
        { id: 802, descricao: 'Troca de óleo', categoria: null, valor: 120, data: '2026-09-12' },
    ],
    receitas: [{ id: 901, descricao: 'Aluguel do box', categoria: 'Aluguel', valor: 300, data: '2026-09-05' }],
    recebimentos: [{ id: 601, forma: 'Pix', valor: 2000, data: '2026-09-02T00:00:00+00:00' }],
};

export const FILTROS = { dataInicio: '2026-09-01', dataFim: '2026-09-30', postoId: 2 };

/** O mesmo período com uma compra de Etanol: todo produto vendido tem custo, e o lucro sai. */
export const PERIODO_COM_LUCRO = {
    ...PERIODO,
    compras: [
        ...PERIODO.compras,
        { id: 703, combustivel_id: 2, data: '2026-09-03T00:00:00+00:00', quantidade_litros: 2000, valor_total: 7980, fornecedor: 'Distribuidora A' },
    ],
};

export const CENARIOS = { 'Etanol sem compra': PERIODO, 'todo produto com compra': PERIODO_COM_LUCRO } as const;
