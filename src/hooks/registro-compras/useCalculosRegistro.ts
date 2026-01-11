import { useMemo } from 'react';
import { CombustivelHibrido } from './useCombustiveisHibridos';
import { analisarValor, parseBRFloat } from '../../utils/formatters';

export const useCalculosRegistro = (
    combustiveis: CombustivelHibrido[],
    despesasMes: string
) => {
    // Helper para parsear valores - Usando parseBRFloat para garantir consistência
    // com inputs formatados (1.000 = 1000, 1,000 = 1)
    const parseValue = parseBRFloat;

    // === CÁLCULOS DE VENDA ===
    const calcLitrosVendidos = (c: CombustivelHibrido): number => {
        const inicial = parseValue(c.inicial);
        const fechamento = parseValue(c.fechamento);
        if (fechamento <= inicial) return 0;
        return fechamento - inicial;
    };

    const calcValorPorBico = (c: CombustivelHibrido): number => {
        const litros = calcLitrosVendidos(c);
        const preco = parseValue(c.preco_venda_atual);
        return litros * preco;
    };

    // === CÁLCULOS DE COMPRA ===
    const calcMediaLtRs = (c: CombustivelHibrido): number => {
        const compra_lt = parseValue(c.compra_lt);
        const compra_rs = parseValue(c.compra_rs);
        if (compra_lt > 0) {
            return compra_rs / compra_lt;
        }
        return c.preco_custo_cadastro || 0;
    };

    const calcDespesaPorLitro = (): number => {
        const despesasTotal = parseValue(despesasMes);
        if (despesasTotal === 0) return 0;

        const totalLitrosVendidos = combustiveis.reduce((acc, c) => acc + calcLitrosVendidos(c), 0);
        const totalLitrosComprados = combustiveis.reduce((acc, c) => acc + parseValue(c.compra_lt), 0);
        const litrosBase = totalLitrosVendidos > 0 ? totalLitrosVendidos : totalLitrosComprados;

        if (litrosBase === 0) return 0;
        return despesasTotal / litrosBase;
    };

    const calcValorParaVenda = (c: CombustivelHibrido): number => {
        const custoMedio = calcMediaLtRs(c);
        const despesaLt = calcDespesaPorLitro();
        if (custoMedio === 0) return 0;
        return custoMedio + despesaLt;
    };

    const calcLucroLt = (c: CombustivelHibrido): number => {
        const precoVenda = parseValue(c.preco_venda_atual);
        const custoVenda = calcValorParaVenda(c);
        if (custoVenda === 0) return 0;
        return precoVenda - custoVenda;
    };

    const calcLucroBico = (c: CombustivelHibrido): number => {
        const litros = calcLitrosVendidos(c);
        const lucroLt = calcLucroLt(c);
        return litros * lucroLt;
    };

    const calcMargemPct = (c: CombustivelHibrido): number => {
        const lucroBico = calcLucroBico(c);
        const valorBico = calcValorPorBico(c);
        if (valorBico === 0) return 0;
        return (lucroBico / valorBico) * 100;
    };

    const calcProdutoPct = (c: CombustivelHibrido): number => {
        const totalLitros = combustiveis.reduce((acc, item) => acc + calcLitrosVendidos(item), 0);
        if (totalLitros === 0) return 0;
        const litros = calcLitrosVendidos(c);
        return (litros / totalLitros) * 100;
    };

    // === CÁLCULOS DE ESTOQUE ===
    const calcCompraEEstoque = (c: CombustivelHibrido): number => {
        const compra = parseValue(c.compra_lt);
        const estoqueAnt = parseValue(c.estoque_anterior);
        return compra + estoqueAnt;
    };

    const calcEstoqueHoje = (c: CombustivelHibrido): number => {
        const compraEstoque = calcCompraEEstoque(c);
        const vendas = calcLitrosVendidos(c);
        return compraEstoque - vendas;
    };

    const calcPercaSobra = (c: CombustivelHibrido): number => {
        const fisico = parseValue(c.estoque_tanque);
        if (fisico === 0) return 0;
        const livro = calcEstoqueHoje(c);
        return fisico - livro;
    };

    // === TOTAIS ===
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
