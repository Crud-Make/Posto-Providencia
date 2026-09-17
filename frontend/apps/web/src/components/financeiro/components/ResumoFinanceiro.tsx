import React from 'react';
import { DadosFinanceiros } from '../hooks/useFinanceiro';
import { paraReais } from '../../../utils/formatters';
import { DollarSign, TrendingUp, TrendingDown, Wallet, LucideIcon } from 'lucide-react';

/**
 * Props do componente ResumoFinanceiro.
 */
interface ResumoFinanceiroProps {
  /** Dados financeiros agregados para exibição */
  dados: DadosFinanceiros;
  /** Estado de carregamento para exibir skeletons */
  carregando?: boolean;
}

/**
 * Props de um cartão de indicador do resumo.
 */
interface CartaoIndicadorProps {
  titulo: string;
  valor: string;
  legenda?: string;
  Icone: LucideIcon;
  corIcone: string;
  corFundoIcone: string;
  /** Pinta o valor de vermelho — usado quando o lucro fica negativo */
  negativo?: boolean;
}

/**
 * Cartão de indicador na paleta escura das abas do Fechamento.
 *
 * @remarks [31/07] Local de propósito. O `KPICard` de `dashboard/components` é claro
 *          (`bg-white`) e compartilhado com o Dashboard — reestilizá-lo para caber aqui
 *          mudaria a aparência daquela tela junto.
 */
const CartaoIndicador: React.FC<CartaoIndicadorProps> = ({
  titulo, valor, legenda, Icone, corIcone, corFundoIcone, negativo
}) => (
  <div className="bg-slate-900/40 rounded-2xl border border-slate-700/50 p-5">
    <div className="flex items-start justify-between mb-3">
      <span className="text-sm font-semibold text-slate-400">{titulo}</span>
      <div className={`p-2 rounded-lg ${corFundoIcone}`}>
        <Icone size={18} className={corIcone} />
      </div>
    </div>
    <p className={`text-2xl font-black tracking-tight ${negativo ? 'text-red-400' : 'text-green-400'}`}>
      {valor}
    </p>
    {legenda && <p className="text-xs text-slate-500 mt-1">{legenda}</p>}
  </div>
);

/**
 * Resumo financeiro do período: Receita Total, Despesas Totais, Lucro Líquido e Margem.
 *
 * @remarks Os valores vêm prontos de `useFinanceiro`; este componente só formata e exibe.
 */
export const ResumoFinanceiro: React.FC<ResumoFinanceiroProps> = ({ dados, carregando }) => {
  if (carregando) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-800/40 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  // `paraReais` no lugar de um `Intl.NumberFormat` local: mesma saída para número válido
  // (mesmas opções), e devolve string vazia em vez de "R$ NaN" quando o valor não é número.
  // [03/09] `null` é "custo não apurável" (produto vendido sem compra no período) e sai
  // como traço, com o motivo na legenda — nunca como zero, que leria como lucro.
  const semCusto = dados.produtosSemCompra.length > 0;
  const motivoSemCusto = semCusto
    ? `sem compra de ${dados.produtosSemCompra.join(', ')} no período`
    : undefined;
  const reaisOuTraco = (val: number | null) => (val === null ? '—' : paraReais(val));
  const formatPercent = (val: number | null) => (val === null ? '—' : `${val.toFixed(1)}%`);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* [31/07] As legendas "vs período anterior" saíram: nada era comparado com período */}
      {/* anterior, o cartão só repetia a frase com o valor de comparação sempre vazio. */}
      <CartaoIndicador
        titulo="Receita Total"
        valor={paraReais(dados.receitas.total)}
        Icone={DollarSign}
        corFundoIcone="bg-green-500/15"
        corIcone="text-green-400"
      />

      <CartaoIndicador
        titulo="Despesas Totais"
        valor={reaisOuTraco(dados.despesas.total)}
        legenda={motivoSemCusto}
        Icone={TrendingDown}
        corFundoIcone="bg-red-500/15"
        corIcone="text-red-400"
      />

      <CartaoIndicador
        titulo="Lucro Líquido"
        valor={reaisOuTraco(dados.lucro.liquido)}
        legenda={motivoSemCusto ?? `Margem líquida: ${formatPercent(dados.lucro.margem)}`}
        negativo={dados.lucro.liquido !== null && dados.lucro.liquido < 0}
        Icone={Wallet}
        corFundoIcone="bg-blue-500/15"
        corIcone="text-blue-400"
      />

      <CartaoIndicador
        titulo="Margem de Lucro"
        valor={formatPercent(dados.lucro.margem)}
        legenda={motivoSemCusto ?? 'Eficiência operacional'}
        Icone={TrendingUp}
        corFundoIcone="bg-purple-500/15"
        corIcone="text-purple-400"
      />
    </div>
  );
};
