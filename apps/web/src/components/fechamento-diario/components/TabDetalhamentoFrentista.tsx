import React from 'react';
// [20/01 11:45] Refatoração para subcomponentes
// Motivo: Atender regra de limite de 150 linhas e melhorar organização
import { SessaoFrentista, Frentista } from '../../../types/fechamento';
import { DetalhamentoHeader } from './detalhamento/DetalhamentoHeader';
import { DetalhamentoRow } from './detalhamento/DetalhamentoRow';
import { DetalhamentoEncerranteRow } from './detalhamento/DetalhamentoEncerranteRow';
import { DetalhamentoDiferencaRow, DetalhamentoParticipacaoRow } from './detalhamento/DetalhamentoRodapeRows';

/**
 * Props para o componente TabDetalhamentoFrentista
 */
interface TabDetalhamentoFrentistaProps {
  frentistaSessions: SessaoFrentista[]; // Lista de sessões de frentistas
  frentistas: Frentista[]; // Lista de cadastros de frentistas para lookup de nomes
  totalVendasPosto: number; // Total geral de vendas para cálculos
  loading?: boolean; // Estado de carregamento
  onUpdateEncerrante?: (tempId: string, valor: number) => void; // Callback para atualização de valor do encerrante
  onUpdateCampo?: (tempId: string, campo: string, valor: number) => void; // Callback genérico para outros campos
  data?: string; // Data do fechamento para exibição no cabeçalho
}

/**
 * Aba de Detalhamento por Frentista
 * 
 * @remarks
 * Exibe uma tabela pivô onde as colunas são os frentistas e as linhas são os tipos de pagamento.
 * Permite visualizar o desempenho individual e editar o valor do encerrante.
 * 
 * Estrutura:
 * - Header: Títulos das colunas (Nomes dos frentistas)
 * - Rows: Pix, Cartão, Nota, Dinheiro, Baratão, Total
 * - EncerranteRow: Linha editável para valor do concentrador
 * - RodapeRows: Diferença e Participação
 */
export const TabDetalhamentoFrentista: React.FC<TabDetalhamentoFrentistaProps> = ({
  frentistaSessions,
  frentistas,
  totalVendasPosto,
  loading,
  onUpdateEncerrante,
  onUpdateCampo,
  data
}) => {
  /**
   * Helper para obter o nome do frentista pelo ID
   */
  const getFrentistaNome = (id: number | null) => {
    if (!id) return 'Geral';
    const f = frentistas.find(fr => fr.id === id);
    return f ? f.nome.toUpperCase() : 'DESCONHECIDO';
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Carregando dados dos frentistas...</div>;

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-700/50 bg-slate-800/20">
      <DetalhamentoHeader count={frentistaSessions.length} data={data} />

      <table className="w-full text-sm text-left border-collapse">
        <thead className="text-xs uppercase bg-slate-900/50 text-slate-400 font-medium">
          <tr>
            <th className="px-4 py-3 sticky left-0 bg-slate-900 border border-slate-700/50 z-20">
              Meio de Pagamento
            </th>
            {frentistaSessions.map(sessao => (
              <th key={sessao.tempId} className="px-4 py-3 text-center min-w-[140px] border border-slate-700/50 bg-slate-900/50 text-slate-300">
                {getFrentistaNome(sessao.frentistaId)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/30">
          <DetalhamentoRow
            label="Pix"
            colorClass="bg-cyan-500"
            field="pix"
            sessoes={frentistaSessions}
            totalVendasPosto={totalVendasPosto}
            onUpdate={(id, val) => onUpdateCampo && onUpdateCampo(id, 'valor_pix', val)}
          />
          <DetalhamentoRow
            label="Cartão"
            colorClass="bg-blue-500"
            field="cartao"
            sessoes={frentistaSessions}
            totalVendasPosto={totalVendasPosto}
            onUpdate={(id, val) => onUpdateCampo && onUpdateCampo(id, 'valor_cartao', val)}
          />
          <DetalhamentoRow
            label="Notas a Prazo"
            colorClass="bg-yellow-500"
            field="nota"
            sessoes={frentistaSessions}
            totalVendasPosto={totalVendasPosto}
            onUpdate={(id, val) => onUpdateCampo && onUpdateCampo(id, 'valor_nota', val)}
          />
          <DetalhamentoRow
            label="Dinheiro"
            colorClass="bg-emerald-500"
            field="dinheiro"
            sessoes={frentistaSessions}
            totalVendasPosto={totalVendasPosto}
            onUpdate={(id, val) => onUpdateCampo && onUpdateCampo(id, 'valor_dinheiro', val)}
          />
          <DetalhamentoRow
            label="Baratão"
            colorClass="bg-pink-500"
            field="baratao"
            sessoes={frentistaSessions}
            totalVendasPosto={totalVendasPosto}
            onUpdate={(id, val) => onUpdateCampo && onUpdateCampo(id, 'valor_baratao', val)}
          />

          <DetalhamentoRow label="Total Venda Frentista" colorClass="" field="totalVenda" sessoes={frentistaSessions} totalVendasPosto={totalVendasPosto} isTotal />

          <DetalhamentoEncerranteRow sessoes={frentistaSessions} totalVendasPosto={totalVendasPosto} onUpdateEncerrante={onUpdateEncerrante} />
          <DetalhamentoDiferencaRow sessoes={frentistaSessions} totalVendasPosto={totalVendasPosto} />
          <DetalhamentoParticipacaoRow sessoes={frentistaSessions} totalVendasPosto={totalVendasPosto} />
        </tbody>
      </table>
    </div>
  );
};
