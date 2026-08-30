/**
 * O lucro operacional do mês dos insights de IA — sítio 3.7 do saneamento.
 *
 * [onda 3, grupo B] Consolidado no modelo canônico. A versão legada
 * ("Simplificado") fazia `vendas − despesas`, SEM o custo do produto — que é
 * ~82% da venda de combustível: em julho/2026 mostrava R$ 189.312,05 onde o
 * lucro real é R$ 18.272,31, mais de 10× — sustentando o insight "Saúde
 * Financeira Estável". Agora o serviço busca o `lucro_bruto` da RPC
 * `get_dashboard_proprietario` (custo da época, validado pelo golden
 * `custo-historico`) e desconta as despesas do período — a MESMA fórmula do
 * painel do proprietário (`lucro_real = lucro_bruto − despesas`, validada por
 * `lucro-real.golden.spec.ts`).
 */
import { emCentavos } from '@posto/utils';

/**
 * Lucro operacional do período: `lucro_bruto − despesas`, quantizado.
 *
 * @param lucroBruto - Receita − custo do produto (RPC `get_dashboard_proprietario`).
 * @param totalDespesas - Despesas lançadas do período (tabela `Despesa`).
 */
export function lucroOperacionalDoMes(lucroBruto: number, totalDespesas: number): number {
    return emCentavos(lucroBruto - totalDespesas);
}
