import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { paraReais, parseValue } from '../../utils/formatters';
import type { Leitura } from '../../hooks/useLeituras';
import type { BicoComDetalhes, Frentista, SessaoFrentista } from '../../types/fechamento';

interface SecaoResumoProps {
  totalLitros: number;
  totalSessoes: number;
  totalPagamentos: number;
  leituras: Record<number, Leitura>;
  bicos: BicoComDetalhes[];
  sessoes: SessaoFrentista[];
  frentistas: Frentista[];
  isLoading?: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const SecaoResumo: React.FC<SecaoResumoProps> = ({
  totalLitros,
  totalSessoes,
  totalPagamentos,
  leituras,
  bicos,
  sessoes,
  frentistas,
  isLoading = false
}) => {
  // --- Processamento de Dados para Gráficos ---

  // 1. Dados por Combustível (Volume e Faturamento)
  const dadosCombustivel = useMemo(() => {
    const dados: Record<string, { nome: string, litros: number, valor: number }> = {};

    bicos.forEach(bico => {
      const leitura = leituras[bico.id];
      if (leitura) {
        const litros = (parseValue(leitura.fechamento) - parseValue(leitura.inicial));
        if (litros > 0) {
          const nomeCombustivel = bico.combustivel.nome;
          if (!dados[nomeCombustivel]) {
            dados[nomeCombustivel] = { nome: nomeCombustivel, litros: 0, valor: 0 };
          }
          dados[nomeCombustivel].litros += litros;
          dados[nomeCombustivel].valor += litros * bico.combustivel.preco_venda;
        }
      }
    });

    return Object.values(dados);
  }, [bicos, leituras]);

  // 2. Dados de Pagamento (Pie Chart)
  const dadosPagamentos = useMemo(() => {
    const totais = {
      'Dinheiro': 0,
      'Cartão Débito': 0,
      'Cartão Crédito': 0,
      'Pix': 0,
      'Nota a Prazo': 0,
      'Outros': 0
    };

    sessoes.forEach(sessao => {
      totais['Dinheiro'] += parseValue(sessao.valor_dinheiro);
      totais['Cartão Débito'] += parseValue(sessao.valor_cartao_debito);
      totais['Cartão Crédito'] += parseValue(sessao.valor_cartao_credito);
      totais['Pix'] += parseValue(sessao.valor_pix);
      totais['Nota a Prazo'] += parseValue(sessao.valor_nota);
      totais['Outros'] += parseValue(sessao.valor_baratao); // Considerando Baratão como Outros/Desconto
    });

    return Object.entries(totais)
      .filter(([_, valor]) => valor > 0)
      .map(([name, value]) => ({ name, value }));
  }, [sessoes]);

  // 3. Tabela Pivô (Frentistas x Meios de Pagamento)
  const tabelaDetalhamento = useMemo(() => {
    const frentistasAtivos = sessoes
      .filter(s => s.frentistaId)
      .map(s => {
        const f = frentistas.find(f => f.id === s.frentistaId);
        return { id: s.frentistaId!, nome: f ? f.nome.split(' ')[0] : 'Desc.', sessao: s };
      });

    const linhas = [
      { id: 'pix', label: 'Pix', key: 'valor_pix' },
      { id: 'debito', label: 'Cartão Débito', key: 'valor_cartao_debito' },
      { id: 'credito', label: 'Cartão Crédito', key: 'valor_cartao_credito' },
      { id: 'nota', label: 'Nota a Prazo', key: 'valor_nota' },
      { id: 'dinheiro', label: 'Dinheiro', key: 'valor_dinheiro' },
      { id: 'outros', label: 'Outros', key: 'valor_baratao' },
    ];

    return linhas.map(linha => {
      const rowData: any = { meio: linha.label };
      let totalLinha = 0;

      frentistasAtivos.forEach(f => {
        const valor = parseValue((f.sessao as any)[linha.key]);
        rowData[f.nome] = valor;
        totalLinha += valor;
      });

      rowData['total'] = totalLinha;
      return rowData;
    });
  }, [sessoes, frentistas]);

  // Diferença Geral
  const diferenca = totalSessoes - totalPagamentos;
  const temDiferenca = Math.abs(diferenca) > 0.01;
  const corDiferenca = temDiferenca
    ? (diferenca > 0 ? 'text-orange-600' : 'text-red-600')
    : 'text-green-600';
  const textoDiferenca = temDiferenca
    ? (diferenca > 0 ? 'Sobra de Caixa' : 'Falta no Caixa')
    : 'Caixa Fechado';

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando visualizações...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-blue-500 border-y border-r border-slate-700/50">
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total Litros</p>
          <p className="text-3xl font-black text-slate-100 mt-2">{totalLitros.toFixed(2)} <span className="text-lg text-slate-500">L</span></p>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-purple-500 border-y border-r border-slate-700/50">
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total Vendas (Frentistas)</p>
          <p className="text-3xl font-black text-slate-100 mt-2">{paraReais(totalSessoes)}</p>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-emerald-500 border-y border-r border-slate-700/50">
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total Pagamentos (Caixa)</p>
          <p className="text-3xl font-black text-slate-100 mt-2">{paraReais(totalPagamentos)}</p>
        </div>
        <div className={`bg-slate-800 p-6 rounded-2xl shadow-lg border-l-4 border-y border-r border-slate-700/50 ${temDiferenca ? (diferenca > 0 ? 'border-l-orange-500' : 'border-l-red-500') : 'border-l-green-500'}`}>
          <p className="text-sm text-slate-400 font-medium uppercase tracking-wider">{textoDiferenca}</p>
          <p className={`text-3xl font-black mt-2 ${corDiferenca}`}>{paraReais(Math.abs(diferenca))}</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Volume */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700/50 lg:col-span-1">
          <h3 className="text-lg font-bold mb-6 text-slate-200 flex items-center gap-2"><span className="text-blue-500">●</span> Volume por Combustível (L)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosCombustivel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="nome" tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#4B5563" />
                <YAxis tick={{ fill: '#9CA3AF' }} stroke="#4B5563" />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)} L`, 'Litros']}
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                  itemStyle={{ color: '#93C5FD' }}
                />
                <Bar dataKey="litros" fill="#3b82f6" name="Litros" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Faturamento */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700/50 lg:col-span-1">
          <h3 className="text-lg font-bold mb-6 text-slate-200 flex items-center gap-2"><span className="text-emerald-500">●</span> Faturamento (R$)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosCombustivel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="nome" tick={{ fontSize: 12, fill: '#9CA3AF' }} stroke="#4B5563" />
                <YAxis tick={{ fill: '#9CA3AF' }} stroke="#4B5563" />
                <Tooltip
                  formatter={(value) => [paraReais(Number(value)), 'Valor']}
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                  itemStyle={{ color: '#6EE7B7' }}
                />
                <Bar dataKey="valor" fill="#10b981" name="Valor" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Pagamentos */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-700/50 lg:col-span-1">
          <h3 className="text-lg font-bold mb-6 text-slate-200 flex items-center gap-2"><span className="text-purple-500">●</span> Pagamentos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosPagamentos}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dadosPagamentos.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0)" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => paraReais(Number(value))}
                  contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#F3F4F6' }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ fontSize: '12px', color: '#9CA3AF', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela Detalhada */}
      <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h3 className="text-lg font-bold text-slate-100">Detalhamento por Frentista</h3>
          <span className="text-xs font-bold px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">
            {sessoes.filter(s => s.frentistaId).length} Ativos
          </span>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-slate-700/50">
            <thead className="bg-slate-900/80">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Meio de Pagamento
                </th>
                {sessoes.filter(s => s.frentistaId).map((s, idx) => {
                  const nome = frentistas.find(f => f.id === s.frentistaId)?.nome.split(' ')[0] || 'Frentista';
                  return (
                    <th key={idx} scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {nome}
                    </th>
                  );
                })}
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-100 uppercase tracking-wider bg-slate-900">
                  Total Caixa
                </th>
              </tr>
            </thead>
            <tbody className="bg-slate-800 divide-y divide-slate-700/50">
              {tabelaDetalhamento.map((linha, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-slate-800' : 'bg-slate-700/20'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-300 flex items-center">
                    {linha.meio}
                  </td>
                  {sessoes.filter(s => s.frentistaId).map((s, colIdx) => {
                    const nome = frentistas.find(f => f.id === s.frentistaId)?.nome.split(' ')[0] || 'Desc.';
                    const valor = linha[nome];
                    return (
                      <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 text-right font-mono">
                        {valor > 0 ? paraReais(valor) : <span className="text-slate-600">-</span>}
                      </td>
                    );
                  })}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-100 text-right bg-slate-700/30 font-mono">
                    {paraReais(linha.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Linha de Totais Gerais */}
            <tfoot className="bg-slate-900 font-bold border-t border-slate-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-100">Total Geral</td>
                {sessoes.filter(s => s.frentistaId).map((s, idx) => {
                  const totalFrentista =
                    parseValue(s.valor_dinheiro) +
                    parseValue(s.valor_cartao_debito) +
                    parseValue(s.valor_cartao_credito) +
                    parseValue(s.valor_pix) +
                    parseValue(s.valor_nota) +
                    parseValue(s.valor_baratao);
                  return (
                    <td key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-right text-emerald-400">
                      {paraReais(totalFrentista)}
                    </td>
                  );
                })}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-100 bg-slate-800 border-l border-slate-700">
                  {paraReais(totalSessoes)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
