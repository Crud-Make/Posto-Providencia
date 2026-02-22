import { supabase } from '../supabase';
import type { Database } from '../../types/database/index';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

type TableName = keyof Database['public']['Tables'];

interface ResetResult {
  message: string;
  deletedCounts: Record<string, number>;
}

/**
 * Serviço de Reset do Sistema
 * 
 * @remarks
 * ATENÇÃO: Serviço destrutivo! Permite resetar dados transacionais do sistema
 */
export const resetService = {
  /**
   * Reseta TODOS os dados transacionais do sistema
   * @param postoId - ID do posto (opcional, se não informado reseta tudo)
   * @remarks
   * **ATENÇÃO: Esta ação é IRREVERSÍVEL!**
   * 
   * Mantém apenas:
   * - Tabelas de configuração (Posto, Combustivel, Bomba, Bico, Turno, FormaPagamento, etc)
   * 
   * Remove:
   * - Leituras
   * - Fechamentos
   * - Notas de frentista
   * - Compras
   * - Despesas
   * - Dívidas
   * - Empréstimos e Parcelas
   * - Histórico de tanques
   * - Reseta estoque para zero
   */
  async resetAllData(postoId?: number): Promise<ApiResponse<ResetResult>> {
    try {
      const deletedCounts: Record<string, number> = {};

      // Helper para deletar com filtro opcional de posto
      const deleteTable = async (tableName: TableName, postoFilter: boolean = true) => {
        let query = supabase.from(tableName).delete();

        if (postoFilter && postoId) {
          if (tableName === 'Leitura' ||
            tableName === 'FechamentoFrentista' ||
            tableName === 'Fechamento' ||
            tableName === 'NotaFrentista' ||
            tableName === 'Emprestimo' ||
            tableName === 'Divida' ||
            tableName === 'Despesa' ||
            tableName === 'Receita' ||
            tableName === 'Compra' ||
            tableName === 'MovimentacaoEstoque' ||
            tableName === 'Notificacao') {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore - Garantimos que essas tabelas têm posto_id
            query = query.eq('posto_id', postoId);
          }
        } else if (!postoFilter) {
          query = query.neq('id', 0);
        }

        const { data, error } = await query.select();
        if (error) throw error;
        deletedCounts[tableName] = data?.length || 0;
      };

      // 1. Deletar Vendas de Produtos (refere-se a FechamentoFrentista)
      await deleteTable('VendaProduto', false);

      // Deletar VendaProduto (sem posto_id na tabela)
      if (postoId) {
        const { data: frentistas } = await supabase.from('Frentista').select('id').eq('posto_id', postoId);
        if (frentistas && frentistas.length > 0) {
          await supabase.from('VendaProduto').delete().in('frentista_id', frentistas.map(f => f.id));
        }
      } else {
        await supabase.from('VendaProduto').delete().neq('id', 0);
      }

      // 2. Deletar Leituras
      await deleteTable('Leitura');

      // 3. Deletar Recebimentos (refere-se a Fechamento)
      await deleteTable('Recebimento', false);
      if (postoId) {
        const { data: fechamentos } = await supabase.from('Fechamento').select('id').eq('posto_id', postoId);
        if (fechamentos && fechamentos.length > 0) {
          await supabase.from('Recebimento').delete().in('fechamento_id', fechamentos.map(f => f.id));
        }
      } else {
        await supabase.from('Recebimento').delete().neq('id', 0);
      }

      // 4. Deletar Notificações
      await deleteTable('Notificacao');

      // 5. Deletar FechamentoFrentista (refere-se a Fechamento)
      await deleteTable('FechamentoFrentista');

      // 6. Deletar Fechamentos
      await deleteTable('Fechamento');

      // 7. Deletar Notas de Frentista
      await deleteTable('NotaFrentista');

      // 8. Deletar Parcelas de Empréstimos
      await deleteTable('Parcela', false);
      if (postoId) {
        const { data: emp } = await supabase.from('Emprestimo').select('id').eq('posto_id', postoId);
        if (emp && emp.length > 0) {
          await supabase.from('Parcela').delete().in('emprestimo_id', emp.map(e => e.id));
        }
      } else {
        await supabase.from('Parcela').delete().neq('id', 0);
      }

      // 9. Deletar Empréstimos
      await deleteTable('Emprestimo');

      // 10. Deletar Dívidas
      await deleteTable('Divida');

      // 11. Deletar Despesas
      await deleteTable('Despesa');

      // 11.1 Deletar Receitas
      await deleteTable('Receita');

      // 12. Deletar Compras
      await deleteTable('Compra');

      // 13. Deletar Movimentação de Estoque
      await deleteTable('MovimentacaoEstoque');

      // 14. Deletar Escala
      if (postoId) {
        const { data: fren } = await supabase.from('Frentista').select('id').eq('posto_id', postoId);
        if (fren && fren.length > 0) {
          await supabase.from('Escala').delete().in('frentista_id', fren.map(f => f.id));
        }
      } else {
        await supabase.from('Escala').delete().neq('id', 0);
      }

      // 15. Deletar Histórico de Tanques
      let queryHist = supabase.from('HistoricoTanque').delete();
      if (postoId) {
        const { data: tanques } = await supabase
          .from('Tanque')
          .select('id')
          .eq('posto_id', postoId);

        if (tanques && tanques.length > 0) {
          const tanqueIds = tanques.map(t => t.id);
          queryHist = queryHist.in('tanque_id', tanqueIds);
        }
      } else {
        queryHist = queryHist.neq('id', 0);
      }
      const { data: histData, error: histError } = await queryHist.select();
      if (histError) throw histError;
      deletedCounts['HistoricoTanque'] = histData?.length || 0;

      // 16. Resetar Estoque para zero
      let queryEstoque = supabase
        .from('Estoque')
        .update({
          quantidade_atual: 0,
          custo_medio: 0
        });

      if (postoId) {
        queryEstoque = queryEstoque.eq('posto_id', postoId);
      } else {
        queryEstoque = queryEstoque.neq('id', 0);
      }

      const { data: estoqueData, error: estoqueError } = await queryEstoque.select();
      if (estoqueError) throw estoqueError;
      deletedCounts['Estoque (resetado)'] = estoqueData?.length || 0;

      // 16.1. Resetar volume atual dos Tanques
      let queryTanqueUpdate = supabase
        .from('Tanque')
        .update({ estoque_atual: 0 });

      if (postoId) {
        queryTanqueUpdate = queryTanqueUpdate.eq('posto_id', postoId);
      } else {
        queryTanqueUpdate = queryTanqueUpdate.neq('id', 0);
      }

      const { data: tanqueData, error: tanqueError } = await queryTanqueUpdate.select();
      if (tanqueError) throw tanqueError;
      deletedCounts['Tanques (resetado)'] = tanqueData?.length || 0;


      // 17. Resetar saldo devedor dos clientes
      let queryClientes = supabase
        .from('Cliente')
        .update({ saldo_devedor: 0 });

      if (postoId) {
        queryClientes = queryClientes.eq('posto_id', postoId);
      } else {
        queryClientes = queryClientes.neq('id', 0);
      }

      const { data: clientesData, error: clientesError } = await queryClientes.select();
      if (clientesError) throw clientesError;
      deletedCounts['Cliente (saldo zerado)'] = clientesData?.length || 0;

      return createSuccessResponse({
        message: postoId
          ? `Sistema resetado com sucesso para o posto ${postoId}!`
          : 'Sistema resetado completamente com sucesso!',
        deletedCounts
      });

    } catch (error: unknown) {
      console.error('Erro ao resetar sistema:', error);
      return createErrorResponse(
        error instanceof Error ? error.message : 'Erro desconhecido',
        'RESET_ERROR'
      );
    }
  }
};

