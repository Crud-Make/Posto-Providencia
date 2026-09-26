/**
 * As contas da Análise de Custos sobre os insumos do mês — as MESMAS que moravam em
 * `aggregatorService.fetchProfitabilityData` até 25/09/2026, movidas sem mudar uma linha de conta.
 *
 * @remarks
 * - Custo do litro: a compra do MÊS por produto (`custoMedioCompra`, via `custo-do-mes.ts`), não
 *   o carimbo `Estoque.custo_medio` (03/09/2026).
 * - Despesa operacional: despesas do mês ÷ litros do mês (`despesaOperacionalPorLitro`, planilha
 *   H22 = H19/F11). Mês sem despesa lançada rateia 0 — nunca o fallback fixo de 0,45 (§6).
 * - Produto vendido sem compra fica FORA dos itens e é nomeado em `produtosSemCompra`: com custo 0
 *   ele apareceria como o mais lucrativo da tela.
 * - Lucro: `lucroCombustivel` canônico, quantizado em centavos na saída.
 *
 * Nenhuma leitura de dado aqui: as fontes (`fonte-supabase.ts`, `fonte-da-api.ts`) entregam
 * `InsumosDaAnalise` e este módulo só calcula. Está na trava de fórmula (`so-fable-na-formula.py`).
 */
import { corDoProduto, despesaOperacionalPorLitro, lucroCombustivel } from '@posto/utils';
import { custoMedioPorCombustivel } from '../../../services/custo-do-mes';
import type { ProfitabilityItem } from '../types';
import type { InsumosDaAnalise, ProdutoDaAnalise, VendaDoMes } from './insumos';

/** O que a tela recebe do mês. */
export interface ResultadoDaAnalise {
    /** Produtos com custo apurável no mês (compra lançada). */
    readonly itens: ProfitabilityItem[];
    /** Produtos vendidos no mês sem compra para custear — ficam fora de `itens`. */
    readonly produtosSemCompra: string[];
}

const SEM_VENDA: VendaDoMes = { litros: 0, receita: 0 };

/** Um produto com custo apurado — a linha que o card, o ranking e o CSV mostram. */
function itemDoProduto(
    produto: ProdutoDaAnalise,
    venda: VendaDoMes,
    custoMedio: number,
    despOperacional: number
): ProfitabilityItem {
    const { litros: volumeVendido, receita: receitaBruta } = venda;
    const custoTotalL = custoMedio + despOperacional;

    // [onda 3, grupo A] Era `receitaBruta − volume × custoTotalL` inline — a MESMA conta
    // canônica, à mão. Delega (e quantiza em centavos na saída, como o resto do lucro).
    const lucroTotal = lucroCombustivel({
        litros: volumeVendido,
        precoVenda: volumeVendido > 0 ? receitaBruta / volumeVendido : 0,
        custoMedio,
        despesaOperacionalLitro: despOperacional,
    });

    return {
        id: produto.combustivelId,
        combustivelId: produto.combustivelId,
        nome: produto.nome,
        codigo: produto.codigo,
        custoMedio,
        despOperacional,
        custoTotalL,
        precoVenda: produto.precoVenda,
        volumeVendido,
        receitaBruta,
        lucroTotal,
        margemLiquidaL: volumeVendido > 0 ? lucroTotal / volumeVendido : 0,
        margemBrutaL: produto.precoVenda - custoMedio,
        cor: corDoProduto(produto.codigo).fundo,
    };
}

/** Rentabilidade do mês por produto, mais os produtos vendidos sem compra. */
export function montarAnalise(insumos: InsumosDaAnalise): ResultadoDaAnalise {
    const custoDoMes = custoMedioPorCombustivel(insumos.compras);
    const despOperacional = despesaOperacionalPorLitro(insumos.totalDespesas, insumos.litrosDoMes);

    const itens: ProfitabilityItem[] = [];
    const produtosSemCompra: string[] = [];
    for (const produto of insumos.produtos) {
        const venda = insumos.vendas.get(produto.combustivelId) ?? SEM_VENDA;
        const custoMedio = custoDoMes(produto.combustivelId);
        if (custoMedio === null) {
            if (venda.litros > 0) produtosSemCompra.push(produto.nome);
            continue;
        }
        itens.push(itemDoProduto(produto, venda, custoMedio, despOperacional));
    }

    return { itens, produtosSemCompra };
}
