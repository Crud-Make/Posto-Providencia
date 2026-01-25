import React from 'react';
// [09/01] Adição de colunas financeiras e totalizador geral - Restauração funcionalidade Tabela Escura
// [20/01 10:00] Implementação de edição de preço inline
// Motivo: Permitir ajuste rápido sem alterar cadastro global
import { BicoComDetalhes } from '../../../types/fechamento';
import { paraReais } from '../../../utils/formatters';

interface TabelaLeiturasProps {
  bicos: BicoComDetalhes[];
  leituras: Record<number, { inicial: string; fechamento: string }>;
  onLeituraInicialChange: (bicoId: number, valor: string) => void;
  onLeituraFechamentoChange: (bicoId: number, valor: string) => void;
  onLeituraInicialBlur: (bicoId: number) => void;
  onLeituraFechamentoBlur: (bicoId: number) => void;
  calcLitros: (bicoId: number) => { value: number; display: string };
  isLoading?: boolean;
  onUpdatePrice?: (bicoId: number, newPrice: number) => void;
}

export const TabelaLeituras: React.FC<TabelaLeiturasProps> = ({
  bicos,
  leituras,
  onLeituraInicialChange,
  onLeituraFechamentoChange,
  onLeituraInicialBlur,
  onLeituraFechamentoBlur,
  calcLitros,
  isLoading,
  onUpdatePrice
}) => {
  const [editingPriceBicoId, setEditingPriceBicoId] = React.useState<number | null>(null);
  const [tempPrice, setTempPrice] = React.useState<string>('');

  /**
   * Inicia a edição do preço ao clicar no valor
   */
  const handlePriceClick = (bico: BicoComDetalhes) => {
    if (!onUpdatePrice) return;
    setEditingPriceBicoId(bico.id);
    setTempPrice(bico.combustivel.preco_venda.toString().replace('.', ','));
  };

  /**
   * Finaliza a edição do preço e aplica a alteração
   */
  const handlePriceBlur = (bicoId: number) => {
    if (editingPriceBicoId === bicoId && onUpdatePrice) {
      const numericPrice = parseFloat(tempPrice.replace(',', '.'));
      if (!isNaN(numericPrice) && numericPrice > 0) {
        onUpdatePrice(bicoId, numericPrice);
      }
      setEditingPriceBicoId(null);
    }
  };

  /**
   * Gerencia teclas especiais durante a edição (Enter/Escape)
   */
  const handlePriceKeyDown = (e: React.KeyboardEvent, bicoId: number) => {
    if (e.key === 'Enter') {
      handlePriceBlur(bicoId);
    } else if (e.key === 'Escape') {
      setEditingPriceBicoId(null);
    }
  };

  // Calcula o total geral de vendas (Litros * Preço)
  const totalGeralVendas = bicos.reduce((acc, bico) => {
    const litros = calcLitros(bico.id).value;
    const valor = litros * bico.combustivel.preco_venda;
    return acc + valor;
  }, 0);

  return (
    <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 p-6 mb-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-100 font-display uppercase tracking-wider">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <span className="text-xl">📊</span>
        </div>
        Leituras dos Encerrantes
      </h2>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-900/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider rounded-tl-lg font-display">
                Bico / Combustível
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-display">
                Leitura Inicial
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-display">
                Leitura Final
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-display">
                Litros (L)
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider font-display">
                Valor Lt $
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider rounded-tr-lg font-display">
                Venda Bico R$
              </th>
            </tr>
          </thead>
          <tbody className="bg-slate-800 divide-y divide-slate-700/50">
            {bicos.map((bico) => {
              const leitura = leituras[bico.id] || { inicial: '', fechamento: '' };
              const litros = calcLitros(bico.id);
              const totalVenda = litros.value * bico.combustivel.preco_venda;

              // Adaptação de cores para dark mode baseado no combustível
              let corBadge = { bg: 'bg-slate-700', text: 'text-slate-300', border: 'border-slate-600' };
              const nomeCombustivel = bico.combustivel.nome.toLowerCase();

              if (nomeCombustivel.includes('gasolina')) corBadge = { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' };
              else if (nomeCombustivel.includes('etanol')) corBadge = { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' };
              else if (nomeCombustivel.includes('diesel')) corBadge = { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' };

              return (
                <tr key={bico.id} className="hover:bg-slate-700/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-xl ${corBadge.bg} ${corBadge.text} border ${corBadge.border} font-bold shadow-sm`}>
                        {bico.numero}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-bold text-slate-200">{bico.combustivel.nome}</div>
                        <div className="text-xs text-slate-500 uppercase tracking-wide">{bico.bomba.nome}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={leitura.inicial}
                      onChange={(e) => onLeituraInicialChange(bico.id, e.target.value)}
                      onBlur={() => onLeituraInicialBlur(bico.id)}
                      disabled={isLoading}
                      className="shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-lg bg-slate-900 border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 font-finance tracking-wider transition-all hover:border-slate-600"
                      placeholder="0,000"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={leitura.fechamento}
                      onChange={(e) => onLeituraFechamentoChange(bico.id, e.target.value)}
                      onBlur={() => onLeituraFechamentoBlur(bico.id)}
                      disabled={isLoading}
                      className="shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-lg bg-slate-900 border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 font-finance tracking-wider transition-all hover:border-slate-600"
                      placeholder="0,000"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-lg font-bold font-finance tracking-tight ${litros.value > 0 ? 'text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20' : 'text-slate-500'}`}>
                      {litros.display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingPriceBicoId === bico.id ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        onBlur={() => handlePriceBlur(bico.id)}
                        onKeyDown={(e) => handlePriceKeyDown(e, bico.id)}
                        autoFocus
                        className="w-24 text-sm font-medium text-slate-100 bg-slate-900 border border-slate-700 rounded p-1 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    ) : (
                      <span
                        className={`text-sm font-medium font-finance ${onUpdatePrice ? 'cursor-pointer hover:text-blue-400 border-b border-dashed border-transparent hover:border-blue-400 transition-colors' : ''} text-slate-400`}
                        onClick={() => handlePriceClick(bico)}
                        title={onUpdatePrice ? "Clique para editar o preço" : undefined}
                      >
                        {paraReais(bico.combustivel.preco_venda)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-lg font-bold font-finance tracking-tight ${totalVenda > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                      {paraReais(totalVenda)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-900/50 font-bold border-t border-slate-700/50">
            <tr>
              <td colSpan={5} className="px-6 py-4 text-right text-slate-400 uppercase tracking-wider text-xs font-display">
                Total Geral Vendas
              </td>
              <td className="px-6 py-4 text-left text-emerald-400 text-xl font-bold font-finance tracking-tight">
                {paraReais(totalGeralVendas)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div >
  );
};
