import React from 'react';
// [09/01] Adição de colunas financeiras e totalizador geral - Restauração funcionalidade Tabela Escura
import { BicoComDetalhes } from '../../../types/fechamento';
import { paraReais } from '../../../utils/formatters';

interface TabelaLeiturasProps {
  bicos: BicoComDetalhes[];
  leituras: Record<number, { inicial: string; fechamento: string; preco?: string }>;
  onLeituraInicialChange: (bicoId: number, valor: string) => void;
  onLeituraFechamentoChange: (bicoId: number, valor: string) => void;
  onLeituraInicialBlur: (bicoId: number) => void;
  onLeituraFechamentoBlur: (bicoId: number) => void;
  // [14/01 09:00] Props para edição de preço
  onPrecoChange: (bicoId: number, valor: string) => void;
  onPrecoBlur: (bicoId: number) => void;
  calcLitros: (bicoId: number) => { value: number; display: string };
  calcVenda: (bicoId: number) => { value: number; display: string };
  isLoading?: boolean;
}

// Componente interno para edição de preço com confirmação
const InputPreco: React.FC<{
  valorAtual: string;
  valorOriginal: string;
  onConfirmar: (valor: string) => void;
  isLoading?: boolean;
}> = ({ valorAtual, valorOriginal, onConfirmar, isLoading }) => {
  const [editando, setEditando] = React.useState(false);
  const [valorTemp, setValorTemp] = React.useState(valorAtual);

  // Inicia edição
  const iniciarEdicao = () => {
    setValorTemp(valorAtual);
    setEditando(true);
  };

  // Cancela edição
  const cancelar = () => {
    setValorTemp(valorAtual);
    setEditando(false);
  };

  // Confirma edição
  const confirmar = () => {
    onConfirmar(valorTemp);
    setEditando(false);
  };

  // Se o valor foi alterado externamente (ex: reset), atualiza o temp
  React.useEffect(() => {
    setValorTemp(valorAtual);
  }, [valorAtual]);

  if (editando) {
    return (
      <div className="flex items-center gap-1 min-w-[140px]">
        <input
          type="text"
          inputMode="decimal"
          value={valorTemp}
          onChange={(e) => setValorTemp(e.target.value)}
          className="w-20 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block sm:text-lg bg-slate-900 border-slate-700 rounded-lg p-1.5 text-slate-100 placeholder-slate-600 font-mono text-center"
          autoFocus
        />
        <button
          onClick={confirmar}
          className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
          title="Confirmar (Sim)"
        >
          ✓
        </button>
        <button
          onClick={cancelar}
          className="p-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 border border-red-500/30 transition-colors"
          title="Cancelar (Não)"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="relative group cursor-pointer" onClick={iniciarEdicao} title="Clique para alterar o preço">
      <div className={`
        py-2 px-3 rounded-lg border border-transparent 
        group-hover:border-slate-600 group-hover:bg-slate-800/50 transition-all
        text-center font-mono font-medium text-slate-300
        ${valorAtual !== valorOriginal ? 'text-amber-400 font-bold' : ''}
      `}>
        {valorAtual}
        {valorAtual !== valorOriginal && (
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        )}
      </div>
    </div>
  );
};

export const TabelaLeituras: React.FC<TabelaLeiturasProps> = ({
  bicos,
  leituras,
  onLeituraInicialChange,
  onLeituraFechamentoChange,
  onLeituraInicialBlur,
  onLeituraFechamentoBlur,
  onPrecoChange,
  onPrecoBlur,
  calcLitros,
  calcVenda,
  isLoading
}) => {
  // Calcula o total geral de vendas
  const totalGeralVendas = bicos.reduce((acc, bico) => {
    return acc + calcVenda(bico.id).value;
  }, 0);

  return (
    <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 p-6 mb-6">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-slate-100">
        <div className="p-2 bg-emerald-500/20 rounded-lg">
          <span className="text-xl">⛽</span>
        </div>
        Venda Concentrador
      </h2>

      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-slate-700/50">
          <thead className="bg-slate-900/50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider rounded-tl-lg">
                Bico / Combustível
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Leitura Inicial
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Leitura Final
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                Litros (L)
              </th>
              <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                Valor Lt $
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider rounded-tr-lg">
                Venda Bico R$
              </th>
            </tr>
          </thead>
          <tbody className="bg-slate-800 divide-y divide-slate-700/50">
            {bicos.map((bico) => {
              const leitura = leituras[bico.id] || { inicial: '', fechamento: '' };
              const litros = calcLitros(bico.id);
              const venda = calcVenda(bico.id);

              // Preço a exibir: override ou cadastro
              const precoOriginal = paraReais(bico.combustivel.preco_venda);
              const precoExibicao = leitura.preco || precoOriginal;

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
                      className="shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-lg bg-slate-900 border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 font-mono transition-all hover:border-slate-600"
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
                      className="shadow-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 block w-full sm:text-lg bg-slate-900 border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 font-mono transition-all hover:border-slate-600"
                      placeholder="0,000"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-lg font-bold font-mono ${litros.value > 0 ? 'text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20' : 'text-slate-500'}`}>
                      {litros.display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <InputPreco
                      valorAtual={precoExibicao}
                      valorOriginal={precoOriginal}
                      onConfirmar={(novoValor) => {
                        onPrecoChange(bico.id, novoValor);
                        // onPrecoBlur já formata, se necessário chamar manualmente ou deixar o hook formatar na change se for o caso.
                        // Como a função alterarPreco no hook chama formatarSimples que limpa e formata, está ok.
                        // Mas para garantir formatação final de centavos, podemos chamar o onPrecoBlur.
                        setTimeout(() => onPrecoBlur(bico.id), 100);
                      }}
                      isLoading={isLoading}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-lg font-bold font-mono ${venda.value > 0 ? 'text-blue-400' : 'text-slate-500'}`}>
                      {venda.display}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-900/50 font-bold border-t border-slate-700/50">
            <tr>
              <td colSpan={5} className="px-6 py-4 text-right text-slate-400 uppercase tracking-wider text-xs">
                Total Geral Vendas
              </td>
              <td className="px-6 py-4 text-left text-emerald-400 text-xl font-mono">
                {paraReais(totalGeralVendas)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
