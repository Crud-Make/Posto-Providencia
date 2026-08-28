import { useMemo } from 'react';
import type { CombustivelHibrido } from './useCombustiveisHibridos';
import { parseBRFloat } from '../../../utils/formatters';

/**
 * Interface que define os resultados dos cálculos de registro de compras e estoque.
 */
export interface CalculosRegistro {
    calcLitrosVendidos: (c: CombustivelHibrido) => number;
    calcValorPorBico: (c: CombustivelHibrido) => number;
    calcMediaLtRs: (c: CombustivelHibrido) => number;
    calcDespesaPorLitro: () => number;
    calcValorParaVenda: (c: CombustivelHibrido) => number;
    calcLucroLt: (c: CombustivelHibrido) => number;
    calcLucroBico: (c: CombustivelHibrido) => number;
    calcMargemPct: (c: CombustivelHibrido) => number;
    calcProdutoPct: (c: CombustivelHibrido) => number;
    calcCompraEEstoque: (c: CombustivelHibrido) => number;
    calcEstoqueHoje: (c: CombustivelHibrido) => number;
    calcPercaSobra: (c: CombustivelHibrido) => number;
    totais: {
        totalLitros: number;
        totalValorBico: number;
        totalLucroBico: number;
        totalCompraLt: number;
        totalCompraRs: number;
        despesaDoMesTotal: number;
        mediaTotal: number;
        margemMedia: number;
        totalCustoEstoque: number;
        totalLucroEstoque: number;
        totalPercaSobra: number;
    };
}

// === FUNÇÕES PURAS DE MÓDULO (fórmulas da planilha) ===
//
// [2026-07-26] Movidas para fora do hook (eram recriadas a cada render) para
// resolver os warnings de `react-hooks/preserve-manual-memoization` e
// `react-hooks/exhaustive-deps` no `useMemo` de `totais` abaixo: como funções
// de módulo, o linter não exige (nem deveria) que entrem no array de deps —
// elas não capturam nenhum estado/prop do componente, só recebem tudo por
// parâmetro. Nenhuma fórmula foi alterada, apenas o escopo onde vivem.
//
// [2026-08-28] Exportadas (sem mudar corpo) para o golden ao lado
// (`useCalculosRegistro.golden.spec.ts`) exercitar a conta REAL contra a
// canônica de @posto/utils — §7: divergência se documenta em teste.

/** Calcula os litros vendidos com base em leitura inicial e fechamento */
export function calcLitrosVendidosPura(c: CombustivelHibrido): number {
    const inicial = parseBRFloat(c.inicial);
    const fechamento = parseBRFloat(c.fechamento);
    if (fechamento <= inicial) return 0;
    return fechamento - inicial;
}

/**
 * Faturamento do produto no mês.
 *
 * @remarks É o bruto REAL das leituras (Σ `valor_total` diário), não
 *          `litros × preço de hoje`: o preço muda dentro do mês, e avaliar
 *          janeiro a preço de agosto foi o bug que inflou a venda histórica
 *          em 8–11%. Sem leitura no mês, cai para litros × preço, que aí é
 *          tudo do mesmo dia.
 */
export function calcValorPorBicoPura(c: CombustivelHibrido): number {
    if (c.venda_mes_rs > 0) return c.venda_mes_rs;
    const litros = calcLitrosVendidosPura(c);
    const preco = parseBRFloat(c.preco_venda_atual);
    return litros * preco;
}

/**
 * Custo médio do litro no MÊS — planilha `F16 = E16/D16`.
 *
 * @remarks Soma o que já foi comprado no mês com o que está sendo digitado:
 *          a compra de hoje entra no custo do mês inteiro, não substitui as
 *          anteriores. Sem compra no mês devolve 0 e a tela mostra "-":
 *          custo desconhecido aparece como desconhecido, nunca como o
 *          `preco_custo` do cadastro (um preço só, o de hoje).
 */
export function calcMediaLtRsPura(c: CombustivelHibrido): number {
    const litros = c.compra_mes_lt + parseBRFloat(c.compra_lt);
    const reais = c.compra_mes_rs + parseBRFloat(c.compra_rs);
    return litros > 0 ? reais / litros : 0;
}

/** Calcula a despesa operacional rateada por litro */
export function calcDespesaPorLitroPura(combustiveis: CombustivelHibrido[], despesaDoMes: number): number {
    const despesasTotal = despesaDoMes;
    if (despesasTotal === 0) return 0;

    const totalLitrosVendidos = combustiveis.reduce((acc, c) => acc + calcLitrosVendidosPura(c), 0);
    const totalLitrosComprados = combustiveis.reduce((acc, c) => acc + parseBRFloat(c.compra_lt), 0);
    const litrosBase = totalLitrosVendidos > 0 ? totalLitrosVendidos : totalLitrosComprados;

    if (litrosBase === 0) return 0;
    return despesasTotal / litrosBase;
}

/** Calcula o valor de custo total (produto + despesa) para venda */
export function calcValorParaVendaPura(c: CombustivelHibrido, combustiveis: CombustivelHibrido[], despesaDoMes: number): number {
    const custoMedio = calcMediaLtRsPura(c);
    const despesaLt = calcDespesaPorLitroPura(combustiveis, despesaDoMes);
    if (custoMedio === 0) return 0;
    return custoMedio + despesaLt;
}

/** Calcula o lucro por litro (Preço Venda - (Custo + Despesa)) */
export function calcLucroLtPura(c: CombustivelHibrido, combustiveis: CombustivelHibrido[], despesaDoMes: number): number {
    const precoVenda = parseBRFloat(c.preco_venda_atual);
    const custoVenda = calcValorParaVendaPura(c, combustiveis, despesaDoMes);
    if (custoVenda === 0) return 0;
    return precoVenda - custoVenda;
}

/** Calcula o lucro total do bico/combustível */
export function calcLucroBicoPura(c: CombustivelHibrido, combustiveis: CombustivelHibrido[], despesaDoMes: number): number {
    const litros = calcLitrosVendidosPura(c);
    const lucroLt = calcLucroLtPura(c, combustiveis, despesaDoMes);
    return litros * lucroLt;
}

/** Calcula a margem de lucro em porcentagem */
function calcMargemPctPura(c: CombustivelHibrido, combustiveis: CombustivelHibrido[], despesaDoMes: number): number {
    const lucroBico = calcLucroBicoPura(c, combustiveis, despesaDoMes);
    const valorBico = calcValorPorBicoPura(c);
    if (valorBico === 0) return 0;
    return (lucroBico / valorBico) * 100;
}

/** Calcula a participação do produto no volume total vendido */
function calcProdutoPctPura(c: CombustivelHibrido, combustiveis: CombustivelHibrido[]): number {
    const totalLitros = combustiveis.reduce((acc, item) => acc + calcLitrosVendidosPura(item), 0);
    if (totalLitros === 0) return 0;
    const litros = calcLitrosVendidosPura(c);
    return (litros / totalLitros) * 100;
}

/** Total disponível no mês — planilha `E24 = D16 + D24` (compra do mês + estoque anterior) */
function calcCompraEEstoquePura(c: CombustivelHibrido): number {
    const compra = c.compra_mes_lt + parseBRFloat(c.compra_lt);
    const estoqueAnt = parseBRFloat(c.estoque_anterior);
    return compra + estoqueAnt;
}

/** Calcula o estoque escritural final (Disponível - Vendas) */
function calcEstoqueHojePura(c: CombustivelHibrido): number {
    const compraEstoque = calcCompraEEstoquePura(c);
    const vendas = calcLitrosVendidosPura(c);
    return compraEstoque - vendas;
}

/** Calcula a diferença entre estoque físico (medição) e escritural */
function calcPercaSobraPura(c: CombustivelHibrido): number {
    const fisico = parseBRFloat(c.estoque_tanque);
    if (fisico === 0) return 0;
    const livro = calcEstoqueHojePura(c);
    return fisico - livro;
}

/**
 * Hook que realiza todos os cálculos financeiros e de estoque para a tela de registro de compras.
 * Segue a lógica da planilha de gestão de combustível.
 *
 * @param combustiveis - Lista de combustíveis com seus estados atuais.
 * @param despesaDoMes - Despesa operacional do mês em reais, lida da tabela `Despesa`.
 * @returns Objeto com funções de cálculo e totais consolidados.
 */
export const useCalculosRegistro = (
    combustiveis: CombustivelHibrido[],
    despesaDoMes: number
): CalculosRegistro => {
    // Funções expostas na API pública do hook: fecham sobre `combustiveis`/`despesaDoMes`
    // (os únicos parâmetros reativos deste hook) só para preservar a assinatura de
    // um argumento (`c`) que os componentes filhos já consomem. A fórmula em si
    // vive nas funções puras de módulo acima.
    const calcLitrosVendidos = (c: CombustivelHibrido): number => calcLitrosVendidosPura(c);
    const calcValorPorBico = (c: CombustivelHibrido): number => calcValorPorBicoPura(c);
    const calcMediaLtRs = (c: CombustivelHibrido): number => calcMediaLtRsPura(c);
    const calcDespesaPorLitro = (): number => calcDespesaPorLitroPura(combustiveis, despesaDoMes);
    const calcValorParaVenda = (c: CombustivelHibrido): number => calcValorParaVendaPura(c, combustiveis, despesaDoMes);
    const calcLucroLt = (c: CombustivelHibrido): number => calcLucroLtPura(c, combustiveis, despesaDoMes);
    const calcLucroBico = (c: CombustivelHibrido): number => calcLucroBicoPura(c, combustiveis, despesaDoMes);
    const calcMargemPct = (c: CombustivelHibrido): number => calcMargemPctPura(c, combustiveis, despesaDoMes);
    const calcProdutoPct = (c: CombustivelHibrido): number => calcProdutoPctPura(c, combustiveis);
    const calcCompraEEstoque = (c: CombustivelHibrido): number => calcCompraEEstoquePura(c);
    const calcEstoqueHoje = (c: CombustivelHibrido): number => calcEstoqueHojePura(c);
    const calcPercaSobra = (c: CombustivelHibrido): number => calcPercaSobraPura(c);

    // === TOTAIS CONSOLIDADOS ===
    // Corpo do useMemo só referencia as funções puras de módulo acima (estáveis,
    // fora do escopo do componente) + `combustiveis`/`despesaDoMes` (já nas deps) +
    // `parseBRFloat` (import estável) — nada mais precisa entrar no array de deps.
    const totais = useMemo(() => {
        let totalLitros = 0;
        let totalValorBico = 0;
        let totalLucroBico = 0;
        let totalCompraLt = 0;
        let totalCompraRs = 0;
        let totalCustoEstoque = 0;
        let totalLucroEstoque = 0;
        let totalPercaSobra = 0;

        combustiveis.forEach(c => {
            const litros = calcLitrosVendidosPura(c);
            totalLitros += litros;
            totalValorBico += calcValorPorBicoPura(c);
            totalLucroBico += calcLucroBicoPura(c, combustiveis, despesaDoMes);

            totalCompraLt += c.compra_mes_lt + parseBRFloat(c.compra_lt);
            totalCompraRs += c.compra_mes_rs + parseBRFloat(c.compra_rs);

            totalCustoEstoque += calcEstoqueHojePura(c) * calcMediaLtRsPura(c);
            totalLucroEstoque += calcEstoqueHojePura(c) * calcLucroLtPura(c, combustiveis, despesaDoMes);
            totalPercaSobra += calcPercaSobraPura(c);
        });

        const mediaTotal = totalCompraLt > 0 ? totalCompraRs / totalCompraLt : 0;
        const margemMedia = totalValorBico > 0 ? (totalLucroBico / totalValorBico) * 100 : 0;

        return {
            totalLitros,
            totalValorBico,
            totalLucroBico,
            totalCompraLt,
            totalCompraRs,
            despesaDoMesTotal: despesaDoMes,
            mediaTotal,
            margemMedia,
            totalCustoEstoque,
            totalLucroEstoque,
            totalPercaSobra
        };
    }, [combustiveis, despesaDoMes]);

    return {
        calcLitrosVendidos,
        calcValorPorBico,
        calcMediaLtRs,
        calcDespesaPorLitro,
        calcValorParaVenda,
        calcLucroLt,
        calcLucroBico,
        calcMargemPct,
        calcProdutoPct,
        calcCompraEEstoque,
        calcEstoqueHoje,
        calcPercaSobra,
        totais
    };
};
