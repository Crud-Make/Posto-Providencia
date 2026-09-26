/**
 * As contas da tela de Tanques — movidas de `useDashboardEstoque` (26/09/2026, #103) SEM mudar
 * fórmula, para que as duas fontes (`fonte-supabase.ts` e `fonte-da-api.ts`) passem pelas mesmas:
 *
 *  - rateio canônico do mês corrente: Σ despesas do mês ÷ Σ litros vendidos no mês
 *    (`despesaOperacionalPorLitro`), a venda do mês pelo prefixo `AAAA-MM` da data;
 *  - estoque atual de cada tanque DERIVADO da régua (`estoqueAtualDerivado`); tanque sem régua
 *    mostra 0 e `medido: false`.
 *
 * O "Valor Bruto" e o "Lucro Previsto" do card seguem em `components/calculos-resumo-financeiro.ts`.
 */
import { despesaOperacionalPorLitro } from '@posto/utils';
import { estoqueAtualDerivado } from '../model/estoque-derivado';
import type { TankHistory, Tanque } from '../types';
import type { InsumosDoPainel } from './insumos';

export interface PainelMontado {
    readonly tanques: Tanque[];
    readonly despesaLitro: number;
    readonly historicos: TankHistory;
}

export function montarPainel(insumos: InsumosDoPainel): PainelMontado {
    const despesaDoMes = insumos.despesasDoMes.reduce((acc, valor) => acc + valor, 0);
    const litrosVendidosMes = insumos.vendas
        .filter((v) => v.data.slice(0, 7) === insumos.mesCorrente)
        .reduce((acc, v) => acc + v.litros, 0);

    const derivado = estoqueAtualDerivado(
        insumos.tanques.map((t) => ({ id: t.id, combustivelId: t.combustivel_id })),
        insumos.reguas,
        insumos.compras,
        insumos.vendas,
    );

    return {
        tanques: insumos.tanques.map((t) => {
            const estoque = derivado.get(t.id) ?? null;
            return { ...t, estoque_atual: estoque ?? 0, medido: estoque !== null };
        }),
        despesaLitro: despesaOperacionalPorLitro(despesaDoMes, litrosVendidosMes),
        historicos: insumos.historicos,
    };
}
