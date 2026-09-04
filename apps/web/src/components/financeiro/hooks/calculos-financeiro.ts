/**
 * Composição do card Receitas/Despesas (aba Financeiro do `/fechamento`).
 *
 * Só soma e subtrai o que já veio calculado: o custo dos litros vem de
 * `custoLitrosVendidos` (`@posto/utils`). Nenhuma fórmula de domínio nasce aqui.
 *
 * [03/09/2026] Deixou de ler o carimbo `Fechamento.lucro_*`/`custo_combustiveis`.
 * A UI nunca gravou essas colunas: ficavam em 0, o card somava despesa SEM o
 * combustível e mostrava lucro líquido maior que o bruto — número plausível,
 * incoerente, sem aviso. Agora a receita é a `Leitura`, o custo é o custo médio
 * de compra do período (modelo da planilha) e, sem compra para custear um
 * produto vendido, o resultado é `null` e a tela diz qual produto faltou.
 * **Falta de caixa não entra na conta** — a planilha registra `Falta.` por dia e
 * não a desconta do lucro (`J11 = Σ litros × (preço − custo − despesa/L)`);
 * o card descontava, e o agente `planilha` mostrou em 03/09 que a fórmula só
 * fecha com a dela ao centavo sem essa parcela. Decisão do dono, 03/09/2026.
 *
 * [onda 4.2, 28/08/2026] A taxa de cartão é DESPESA DO MÊS (decisão do dono,
 * 26/08; `packages/utils/src/lucro.ts`): quando lançada, mora na tabela
 * `Despesa` e já entra em `despesasOps`. Nada aqui a soma de novo.
 */
import { emCentavos, margemPercentual } from '@posto/utils';

/** O que o card precisa, já agregado no período. */
export interface EntradaResumoFinanceiro {
    /** Venda dos bicos no período (Σ `Leitura.valor_total`). */
    readonly receitaVendas: number;
    /** Receitas extras lançadas (tabela `Receita`). */
    readonly receitasExtras: number;
    /**
     * Custo dos litros vendidos ao custo médio de compra do período; `null` quando
     * algum produto vendido não tem compra para custear (ver `custoLitrosVendidos`).
     */
    readonly custoLitrosVendidos: number | null;
    /** Despesas lançadas na tabela `Despesa` (inclui a taxa de cartão quando lançada). */
    readonly despesasOps: number;
}

/** Resumo do card. `null` em despesas/lucro = custo não apurável, nunca zero. */
export interface ResumoFinanceiro {
    readonly receitas: { readonly total: number; readonly vendas: number; readonly extras: number };
    readonly despesas: {
        readonly total: number | null;
        readonly operacionais: number;
        /** Custo dos litros vendidos (não é a compra paga no período). */
        readonly compras: number | null;
    };
    readonly lucro: {
        readonly bruto: number | null;
        readonly liquido: number | null;
        readonly margem: number | null;
    };
}

/**
 * Receita, despesa e lucro do período.
 *
 *   bruto   = receita total − custo dos litros vendidos
 *   líquido = bruto − despesas lançadas
 */
export function resumoFinanceiro(e: EntradaResumoFinanceiro): ResumoFinanceiro {
    const receitaTotal = emCentavos(e.receitaVendas + e.receitasExtras);
    const custo = e.custoLitrosVendidos;
    const despesasTotal = custo === null ? null : emCentavos(custo + e.despesasOps);
    const bruto = custo === null ? null : emCentavos(receitaTotal - custo);
    const liquido = despesasTotal === null ? null : emCentavos(receitaTotal - despesasTotal);
    return {
        receitas: { total: receitaTotal, vendas: e.receitaVendas, extras: e.receitasExtras },
        despesas: { total: despesasTotal, operacionais: e.despesasOps, compras: custo },
        lucro: {
            bruto,
            liquido,
            margem: liquido === null ? null : margemPercentual(liquido, receitaTotal),
        },
    };
}
