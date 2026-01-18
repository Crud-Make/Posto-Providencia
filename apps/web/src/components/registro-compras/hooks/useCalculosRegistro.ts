import { useMemo } from 'react';
import { CombustivelHibrido } from './useCombustiveisHibridos';
import { analisarValor, parseBRFloat } from '../../../utils/formatters';

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
        despesasMesTotal: number;
        mediaTotal: number;
        margemMedia: number;
        totalCustoEstoque: number;
        totalLucroEstoque: number;
        totalPercaSobra: number;
    };
}

/**
 * Hook que realiza todos os cálculos financeiros e de estoque para a tela de registro de compras.
 * Segue a lógica da planilha de gestão de combustível.
 * 
 * @param combustiveis - Lista de combustíveis com seus estados atuais.
 * @param despesasMes - String representando o valor total de despesas do mês.
 * @returns Objeto com funções de cálculo e totais consolidados.
 */
export const useCalculosRegistro = (
    combustiveis: CombustivelHibrido[],
    despesasMes: string
): CalculosRegistro => {
    // Helper para parsear valores - Usando parseBRFloat para garantir consistência
    // com inputs formatados (1.000 = 1000, 1,000 = 1)
    const parseValue = parseBRFloat;

    // === CÁLCULOS DE VENDA ===

    /** Calcula os litros vendidos com base em leitura inicial e fechamento */
    const calcLitrosVendidos = (c: CombustivelHibrido): number => {
        const inicial = parseValue(c.inicial);
        const fechamento = parseValue(c.fechamento);
        if (fechamento <= inicial) return 0;
        return fechamento - inicial;
    };

    /** Calcula o valor financeiro total da venda por bico/combustível */
    const calcValorPorBico = (c: CombustivelHibrido): number => {
        const litros = calcLitrosVendidos(c);
        const preco = parseValue(c.preco_venda_atual);
        return litros * preco;
    };

    // === CÁLCULOS DE COMPRA ===

    /** Calcula o custo médio da compra atual ou retorna o custo de cadastro */
    const calcMediaLtRs = (c: CombustivelHibrido): number => {
        const compra_lt = parseValue(c.compra_lt);
        const compra_rs = parseValue(c.compra_rs);
        if (compra_lt > 0) {
            return compra_rs / compra_lt;
        }
        return c.preco_custo_cadastro || 0;
    };

    /** Calcula a despesa operacional rateada por litro */
    const calcDespesaPorLitro = (): number => {
        const despesasTotal = parseValue(despesasMes);
        if (despesasTotal === 0) return 0;

        const totalLitrosVendidos = combustiveis.reduce((acc, c) => acc + calcLitrosVendidos(c), 0);
        const totalLitrosComprados = combustiveis.reduce((acc, c) => acc + parseValue(c.compra_lt), 0);
        const litrosBase = totalLitrosVendidos > 0 ? totalLitrosVendidos : totalLitrosComprados;

        if (litrosBase === 0) return 0;
        return despesasTotal / litrosBase;
    };

    /** Calcula o valor de custo total (produto + despesa) para venda */
    const calcValorParaVenda = (c: CombustivelHibrido): number => {
        const custoMedio = calcMediaLtRs(c);
        const despesaLt = calcDespesaPorLitro();
        if (custoMedio === 0) return 0;
        return custoMedio + despesaLt;
    };

    /** Calcula o lucro por litro (Preço Venda - (Custo + Despesa)) */
    const calcLucroLt = (c: CombustivelHibrido): number => {
        const precoVenda = parseValue(c.preco_venda_atual);
        const custoVenda = calcValorParaVenda(c);
        if (custoVenda === 0) return 0;
        return precoVenda - custoVenda;
    };

    /** Calcula o lucro total do bico/combustível */
    const calcLucroBico = (c: CombustivelHibrido): number => {
        const litros = calcLitrosVendidos(c);
        const lucroLt = calcLucroLt(c);
        return litros * lucroLt;
    };

    /** Calcula a margem de lucro em porcentagem */
    const calcMargemPct = (c: CombustivelHibrido): number => {
        const lucroBico = calcLucroBico(c);
        const valorBico = calcValorPorBico(c);
        if (valorBico === 0) return 0;
        return (lucroBico / valorBico) * 100;
    };

    /** Calcula a participação do produto no volume total vendido */
    const calcProdutoPct = (c: CombustivelHibrido): number => {
        const totalLitros = combustiveis.reduce((acc, item) => acc + calcLitrosVendidos(item), 0);
        if (totalLitros === 0) return 0;
        const litros = calcLitrosVendidos(c);
        return (litros / totalLitros) * 100;
    };

    // === CÁLCULOS DE ESTOQUE ===

    /** Calcula o total disponível (Compra + Estoque Anterior) */
    const calcCompraEEstoque = (c: CombustivelHibrido): number => {
        const compra = parseValue(c.compra_lt);
        const estoqueAnt = parseValue(c.estoque_anterior);
        return compra + estoqueAnt;
    };

    /** Calcula o estoque escritural final (Disponível - Vendas) */
    const calcEstoqueHoje = (c: CombustivelHibrido): number => {
        const compraEstoque = calcCompraEEstoque(c);
        const vendas = calcLitrosVendidos(c);
        return compraEstoque - vendas;
    };

    /** Calcula a diferença entre estoque físico (medição) e escritural */
    const calcPercaSobra = (c: CombustivelHibrido): number => {
        const fisico = parseValue(c.estoque_tanque);
        if (fisico === 0) return 0;
        const livro = calcEstoqueHoje(c);
        return fisico - livro;
    };

    // === TOTAIS CONSOLIDADOS ===
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
            const litros = calcLitrosVendidos(c);
            totalLitros += litros;
            totalValorBico += calcValorPorBico(c);
            totalLucroBico += calcLucroBico(c);

            const compraLt = parseValue(c.compra_lt);
            totalCompraLt += compraLt;
            totalCompraRs += parseValue(c.compra_rs);

            totalCustoEstoque += calcEstoqueHoje(c) * calcMediaLtRs(c);
            totalLucroEstoque += calcEstoqueHoje(c) * calcLucroLt(c);
            totalPercaSobra += calcPercaSobra(c);
        });

        const mediaTotal = totalCompraLt > 0 ? totalCompraRs / totalCompraLt : 0;
        const margemMedia = totalValorBico > 0 ? (totalLucroBico / totalValorBico) * 100 : 0;

        return {
            totalLitros,
            totalValorBico,
            totalLucroBico,
            totalCompraLt,
            totalCompraRs,
            despesasMesTotal: parseValue(despesasMes),
            mediaTotal,
            margemMedia,
            totalCustoEstoque,
            totalLucroEstoque,
            totalPercaSobra
        };
    }, [combustiveis, despesasMes]);

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

