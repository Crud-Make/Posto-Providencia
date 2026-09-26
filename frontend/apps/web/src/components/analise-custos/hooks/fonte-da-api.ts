/**
 * Insumos da Análise de Custos lidos da API Laravel (#103, `VITE_API_CUSTOS`).
 *
 * @remarks
 * Duas rotas que já existiam, nenhuma chamada ao Supabase (com o login pela API não há sessão dele):
 *  - `GET /dashboard?inicio=aaaa-mm-01&fim=aaaa-mm-último` → venda do mês por combustível, compras
 *    do mês civil por combustível e o rateio (despesa de competência e litros de todos os
 *    combustíveis). Rota de proprietário (`posto.acesso:gerir`): operador 403, posto alheio 403.
 *  - `GET /combustiveis` → nome, código e preço de bomba — a lista de produtos da tela.
 *
 * Paridade com `fonte-supabase.ts`, campo a campo:
 *  - **Produtos.** O Supabase lê `Estoque` (com o combustível); o `Estoque` não tem rota e é 1:1 com
 *    `Combustivel` (uma linha por combustível, mesmo id, no banco de hoje). Aqui vem o catálogo,
 *    inativos inclusive, em ordem de `id` — a ordem física em que o PostgREST devolvia o estoque.
 *  - **Venda.** Σ `litros_vendidos` e Σ `valor_total` do mês por combustível, somadas pelo Postgres
 *    em `numeric` (o Supabase somava em float no cliente). O servidor agrupa por
 *    `Leitura.combustivel_id`; o Supabase, pelo combustível do bico — as duas colunas coincidem em
 *    todas as leituras do banco.
 *  - **Compras.** A soma do mês por combustível (Σ litros, Σ valor); o Supabase devolvia as linhas e
 *    `custoMedioCompra` somava. É a mesma razão Σ valor ÷ Σ litros.
 *  - **Rateio.** `rateio.despesas_total` e `rateio.litros_vendidos` do mês civil — o período pedido
 *    é o mês inteiro, então o mês civil é ele mesmo. Mesmos filtros de `despesaService.getByMonth`
 *    (`Despesa.data`, competência) e das leituras do mês.
 */
import { ResultAsync } from 'neverthrow';
import { corteDaTelaLigado, descreverErroDaApi } from '../../../services/api/base';
import { lerCombustiveisComPrecoDaApi, type CombustivelComPreco } from '../../../services/api/combustivel.api';
import { lerDashboardDaApi, type DashboardDaApi } from '../../../services/api/dashboard.api';
import { limitesDoMes, type InsumosDaAnalise, type VendaDoMes } from './insumos';

/**
 * `true` quando a Análise de Custos lê da API. `VITE_API_CUSTOS` ausente segue `VITE_API_URL`;
 * `0` a deixa no Supabase (mesmo padrão de `VITE_API_RELATORIO`/`VITE_API_DASHBOARD`).
 */
export function analiseCustosPelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_CUSTOS);
}

/** O dashboard do mês e o catálogo no formato de `InsumosDaAnalise` — só `Number()` e agrupamento. */
export function paraInsumosDaAnalise(dashboard: DashboardDaApi, catalogo: readonly CombustivelComPreco[]): InsumosDaAnalise {
    const vendas = new Map<number, VendaDoMes>();
    for (const p of dashboard.produtos) {
        const venda = { litros: Number(p.litros_vendidos), receita: Number(p.receita) };
        if (venda.litros !== 0 || venda.receita !== 0) vendas.set(p.combustivel_id, venda);
    }

    return {
        produtos: [...catalogo]
            .sort((a, b) => a.id - b.id)
            .map((c) => ({ combustivelId: c.id, nome: c.nome, codigo: c.codigo, precoVenda: c.precoVenda })),
        vendas,
        totalDespesas: Number(dashboard.rateio.despesas_total),
        litrosDoMes: Number(dashboard.rateio.litros_vendidos),
        compras: dashboard.produtos.map((p) => ({
            combustivel_id: p.combustivel_id,
            quantidade_litros: Number(p.compras.litros),
            valor_total: Number(p.compras.valor_total),
        })),
    };
}

/** Os insumos do mês pela API. Qualquer rota que falhe faz a análise inteira falhar — nunca meia tela. */
export function insumosDaApi(ano: number, mes: number, postoId: number): ResultAsync<InsumosDaAnalise, string> {
    const { inicio, fim } = limitesDoMes(ano, mes);
    return ResultAsync.combine([lerDashboardDaApi(postoId, inicio, fim), lerCombustiveisComPrecoDaApi(postoId)] as const)
        .map(([dashboard, catalogo]) => paraInsumosDaAnalise(dashboard, catalogo))
        .mapErr(descreverErroDaApi);
}
