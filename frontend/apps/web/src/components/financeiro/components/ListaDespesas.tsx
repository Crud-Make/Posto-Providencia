import React, { useMemo } from 'react';
import { DadosFinanceiros } from '../hooks/useFinanceiro';
import { paraReais } from '../../../utils/formatters';

/**
 * Props do componente ListaDespesas.
 */
interface ListaDespesasProps {
  /** Dados financeiros do período; usa `dados.transacoes`, já filtrado por período/categoria. */
  dados: DadosFinanceiros;
}

interface GrupoCategoria {
  categoria: string;
  itens: { id: string; descricao: string; valor: number; data: string }[];
  subtotal: number;
}

/**
 * Lista das DESPESAS OPERACIONAIS do período, agrupadas por categoria.
 *
 * @remarks
 * [21/08] Reintroduz a listagem que a aba "Receitas e Despesas" tinha perdido quando virou
 *          aba do Fechamento (ver `PainelReceitasDespesas`). O dono lançava despesa e não via
 *          onde ela aparecia — só o total e a pizza por categoria. A fonte (`dados.transacoes`)
 *          nunca deixou de existir: já alimentava o gráfico de fluxo e a pizza; aqui vira lista.
 *          Não calcula dinheiro novo — só exibe o que o `useFinanceiro` já consolidou.
 *
 *          Duas decisões do dono (21/08): (1) só despesas, sem receitas, que poluíam a leitura;
 *          (2) só as **operacionais** (`origem === 'despesa'`) — as compras de combustível
 *          (`origem === 'compra'`) têm a tela Compras e, 10x maiores, dominariam a lista.
 *          (3) agrupadas por categoria (Folha de Pagamento, Impostos…), com subtotal em cada,
 *          maior primeiro.
 *
 *          A data vem como `aaaa-mm-dd` (ou ISO); formata para `dd/mm/aaaa` fatiando a string,
 *          sem `new Date()`, que na virada UTC escorregaria um dia (ver `@posto/utils/data-local`).
 */
export const ListaDespesas: React.FC<ListaDespesasProps> = ({ dados }) => {
  const { grupos, total, qtd } = useMemo(() => {
    const operacionais = dados.transacoes.filter(t => t.origem === 'despesa');

    const mapa = new Map<string, GrupoCategoria>();
    for (const t of operacionais) {
      const categoria = t.categoria || 'Outros';
      const grupo = mapa.get(categoria) ?? { categoria, itens: [], subtotal: 0 };
      grupo.itens.push({ id: t.id, descricao: t.descricao, valor: t.valor, data: t.data });
      grupo.subtotal += t.valor;
      mapa.set(categoria, grupo);
    }

    // Dentro do grupo: maior valor primeiro. Entre grupos: maior subtotal primeiro.
    const grupos = [...mapa.values()]
      .map(g => ({ ...g, itens: [...g.itens].sort((a, b) => b.valor - a.valor) }))
      .sort((a, b) => b.subtotal - a.subtotal);

    return {
      grupos,
      total: operacionais.reduce((acc, t) => acc + t.valor, 0),
      qtd: operacionais.length,
    };
  }, [dados.transacoes]);

  const formatarData = (iso: string): string => {
    const so = iso.slice(0, 10);
    const [ano, mes, dia] = so.split('-');
    return dia && mes && ano ? `${dia}/${mes}/${ano}` : so;
  };

  return (
    <div className="bg-slate-900/40 rounded-2xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Despesas do período</h3>
        <span className="text-sm text-slate-400">
          {qtd} {qtd === 1 ? 'lançamento' : 'lançamentos'} · {grupos.length}{' '}
          {grupos.length === 1 ? 'categoria' : 'categorias'}
        </span>
      </div>

      {qtd === 0 ? (
        <div className="py-12 text-center text-slate-500">
          Nenhuma despesa no período selecionado.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-700/50">
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 font-medium">Descrição</th>
                <th className="py-2 pl-3 font-medium text-right">Valor</th>
              </tr>
            </thead>
            {grupos.map(grupo => (
              <tbody key={grupo.categoria}>
                <tr className="bg-slate-800/40">
                  <td className="py-2 px-3 font-bold text-slate-200" colSpan={2}>
                    {grupo.categoria}
                    <span className="ml-2 font-normal text-slate-400">
                      ({grupo.itens.length})
                    </span>
                  </td>
                  <td className="py-2 pl-3 text-right font-bold text-slate-200 whitespace-nowrap">
                    - {paraReais(grupo.subtotal)}
                  </td>
                </tr>
                {grupo.itens.map(item => (
                  <tr key={item.id} className="border-b border-slate-800/60 hover:bg-slate-800/30">
                    <td className="py-2 pr-3 pl-3 whitespace-nowrap text-slate-300">
                      {formatarData(item.data)}
                    </td>
                    <td className="py-2 pr-3 text-slate-100">{item.descricao}</td>
                    <td className="py-2 pl-3 text-right whitespace-nowrap text-red-400">
                      - {paraReais(item.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            ))}
            <tfoot>
              <tr className="border-t-2 border-slate-600 font-bold">
                <td className="py-3 pr-3 text-slate-200" colSpan={2}>
                  Total do período ({qtd})
                </td>
                <td className="py-3 pl-3 text-right whitespace-nowrap text-red-400">
                  - {paraReais(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
