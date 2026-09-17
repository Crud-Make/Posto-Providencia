/**
 * Abas do Fechamento de Caixa — fonte única da chave, do rótulo e da cor.
 *
 * @remarks Vive fora do `HeaderFechamento.tsx` porque o lint `react-refresh/only-export-components`
 *          proíbe exportar constante/função de arquivo de componente (quebra o Fast Refresh).
 */
export const ABAS = [
    { chave: 'leituras', rotulo: '⛽ Leituras de Bomba', classeAtiva: 'border-blue-500 text-blue-400' },
    { chave: 'detalhamento', rotulo: '👥 Detalhamento Frentistas', classeAtiva: 'border-purple-500 text-purple-400' },
    { chave: 'gestao-bicos', rotulo: '🚀 Gestão de Bicos', classeAtiva: 'border-indigo-500 text-indigo-400' },
    { chave: 'receitas-despesas', rotulo: '💵 Receitas e Despesas', classeAtiva: 'border-cyan-500 text-cyan-400' },
    { chave: 'fechamento-mensal', rotulo: '📅 Fechamento Mensal', classeAtiva: 'border-yellow-500 text-yellow-400' }
] as const;

export type AbaFechamento = (typeof ABAS)[number]['chave'];

/**
 * Narrowing de texto vindo de fora (querystring `?aba=`) para uma aba real.
 *
 * @remarks Permite que outra tela abra o fechamento numa aba específica — a de
 *          Compras leva direto a "Receitas e Despesas" para lançar a despesa do
 *          mês. Valor desconhecido devolve `null`, e a tela fica em Leituras.
 */
export function abaFechamentoDe(valor: string | null): AbaFechamento | null {
    return ABAS.some((a) => a.chave === valor) ? (valor as AbaFechamento) : null;
}
