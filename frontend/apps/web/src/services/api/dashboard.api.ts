import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { CompraParaCusto } from '../custo-do-mes';
import { buscarNaApi, type ErroDaApi } from './base';

/** `aaaa-mm-dd`, como o Laravel serializa `Periodo`. */
const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data fora de aaaa-mm-dd');

/**
 * Decimal em string, como o PDO entrega `numeric` — o backend nunca manda float (Design Doc
 * `agregacao.md` §5, "Escala"). Número cru aqui é resposta fora do contrato.
 */
const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/**
 * Contrato de `GET /api/postos/{posto}/dashboard?inicio&fim` — espelha
 * `backend/app/Agregacao/Http/Resources/{Dashboard,ProdutoAgregado,RateioDoMesCivil}Resource.php`.
 * O corpo é a raiz do JSON, sem envelope `data` (`DashboardResource::$wrap = null`).
 */
export const dashboardDaApi = z.object({
    periodo: z.object({ inicio: dataIso, fim: dataIso }),
    produtos: z.array(
        z.object({
            combustivel_id: z.number().int(),
            produto: z.string(),
            litros_vendidos: decimalEmString,
            receita: decimalEmString,
            compras: z.object({ litros: decimalEmString, valor_total: decimalEmString }),
        }),
    ),
    rateio: z.object({
        mes_civil: z.object({ inicio: dataIso, fim: dataIso }),
        despesas_total: decimalEmString,
        litros_vendidos: decimalEmString,
    }),
    /**
     * Leituras cruas do período exato, em ordem de bico, dia e id (`LeituraDoPeriodoResource.php`).
     * Aditivo da #103 P9 (decisão do dono, 22/09/2026, Q1 opção a): é o insumo do `encerranteMensal`
     * de `@posto/utils` para os litros do rateio; o servidor não calcula o salto do encerrante.
     */
    leituras: z.array(
        z.object({
            bico_id: z.number().int(),
            data: dataIso,
            leitura_inicial: decimalEmString,
            leitura_final: decimalEmString,
        }),
    ),
});

export type DashboardDaApi = z.infer<typeof dashboardDaApi>;

/** O que o dashboard precisa saber de um combustível vendido: nome para o gráfico, código para a cor. */
export interface CombustivelDaVenda {
    readonly id: number;
    readonly nome: string;
    /** `undefined` quando o combustível não está no cadastro lido — a cor cai no cinza neutro. */
    readonly codigo: string | undefined;
}

/** Venda de um combustível no período, já somada. */
export interface VendaPorCombustivel {
    readonly combustivel: CombustivelDaVenda;
    readonly litros: number;
    readonly valor: number;
}

/** Janela do mês civil que a compra e o rateio de despesa cobrem. */
export interface JanelaDoRateio {
    readonly inicio: string;
    readonly fim: string;
}

/**
 * Insumos brutos do dashboard vindos da API, no formato que `aggregator.service.ts` consome.
 * Nada aqui é conta de dinheiro: custo médio, despesa por litro e lucro são de `@posto/utils`.
 */
export interface InsumosBrutosDaApi {
    /** Só produtos com venda no período — o gráfico "Volume Vendido" nunca mostrou produto sem venda. */
    readonly porCombustivel: readonly VendaPorCombustivel[];
    readonly totalLitros: number;
    readonly totalVendas: number;
    /** Um item por produto, inclusive os sem compra (`0/0`), que `custoMedioCompra` devolve como `null`. */
    readonly compras: readonly CompraParaCusto[];
    readonly rateio: { readonly despesasTotal: number; readonly litros: number };
    readonly janelaDoRateio: JanelaDoRateio;
}

/**
 * Reshape puro da resposta da API para os insumos do dashboard: só `Number()` e agrupamento.
 *
 * @param lido - Resposta já validada pelo schema.
 * @param codigoPorCombustivelId - `Combustivel.id → codigo`, para a cor da planilha; a API não
 *        devolve o código (`ProdutoAgregadoResource`), então ele vem do cadastro.
 *
 * @remarks
 * Produto que só teve compra na janela chega com `litros_vendidos = "0.000"` e fica fora de
 * `porCombustivel` (o caminho Supabase monta a lista só das leituras), mas a compra dele entra
 * em `compras` — não muda nada, porque sem litros não há lucro a custear.
 */
export function paraInsumosDeAgregacao(
    lido: DashboardDaApi,
    codigoPorCombustivelId: ReadonlyMap<number, string>,
): InsumosBrutosDaApi {
    const porCombustivel: VendaPorCombustivel[] = [];
    const compras: CompraParaCusto[] = [];
    let totalLitros = 0;
    let totalVendas = 0;

    for (const produto of lido.produtos) {
        const litros = Number(produto.litros_vendidos);
        const valor = Number(produto.receita);

        compras.push({
            combustivel_id: produto.combustivel_id,
            quantidade_litros: Number(produto.compras.litros),
            valor_total: Number(produto.compras.valor_total),
        });

        if (litros === 0 && valor === 0) continue;

        porCombustivel.push({
            combustivel: {
                id: produto.combustivel_id,
                nome: produto.produto,
                codigo: codigoPorCombustivelId.get(produto.combustivel_id),
            },
            litros,
            valor,
        });
        totalLitros += litros;
        totalVendas += valor;
    }

    return {
        porCombustivel,
        totalLitros,
        totalVendas,
        compras,
        rateio: {
            despesasTotal: Number(lido.rateio.despesas_total),
            litros: Number(lido.rateio.litros_vendidos),
        },
        janelaDoRateio: { inicio: lido.rateio.mes_civil.inicio, fim: lido.rateio.mes_civil.fim },
    };
}

/** Dado bruto do dashboard do posto no período `[inicio, fim]` (ISO local `aaaa-mm-dd`), lido da API Laravel. */
export function lerDashboardDaApi(postoId: number, inicio: string, fim: string): ResultAsync<DashboardDaApi, ErroDaApi> {
    const consulta = new URLSearchParams({ inicio, fim }).toString();
    return buscarNaApi(`/api/postos/${postoId}/dashboard?${consulta}`, dashboardDaApi);
}
