import { supabase } from '../supabase';

export const resetService = {
  /**
   * Reseta TODOS os dados transacionais do sistema.
   * ATENÇÃO: Esta ação é IRREVERSÍVEL!
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
  async resetAllData(postoId?: number): Promise<{
    success: boolean;
    message: string;
    deletedCounts: Record<string, number>;
  }> {
    try {
      const deletedCounts: Record<string, number> = {};

      // Helper para deletar com filtro opcional de posto
      const deleteTable = async (tableName: string, postoFilter: boolean = true) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let query = (supabase as any).from(tableName).delete();

        if (postoFilter && postoId) {
          query = query.eq('posto_id', postoId);
        } else if (!postoFilter) {
          // Deleta tudo se não filtrar por posto
          query = query.neq('id', 0); // Trick para deletar tudo
        }

        const { data, error } = await query.select();
        if (error) throw error;
        deletedCounts[tableName] = data?.length || 0;
      };

      // 1. Deletar Vendas de Produtos (refere-se a FechamentoFrentista)
      await deleteTable('VendaProduto', false);

      // Deletar VendaProduto (sem posto_id na tabela)
      if (postoId) {
        // Precisamos buscar as frentistas do posto para deletar as vendas
        const { data: frentistas } = await supabase.from('Frentista').select('id').eq('posto_id', postoId);
        if (frentistas && frentistas.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('VendaProduto').delete().in('frentista_id', frentistas.map(f => f.id));
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('VendaProduto').delete().neq('id', 0);
      }

      // 2. Deletar Leituras
      await deleteTable('Leitura');

      // 3. Deletar Recebimentos (refere-se a Fechamento)
      await deleteTable('Recebimento', false); // Recebimento não tem posto_id direto
      if (postoId) {
        const { data: fechamentos } = await supabase.from('Fechamento').select('id').eq('posto_id', postoId);
        if (fechamentos && fechamentos.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('Recebimento').delete().in('fechamento_id', fechamentos.map(f => f.id));
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('Recebimento').delete().neq('id', 0);
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('Parcela').delete().in('emprestimo_id', emp.map(e => e.id));
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('Parcela').delete().neq('id', 0);
      }

      // 9. Deletar Empréstimos
      await deleteTable('Emprestimo');

      // 10. Deletar Dívidas
      await deleteTable('Divida');

      // 11. Deletar Despesas
      await deleteTable('Despesa');

      // 12. Deletar Compras
      await deleteTable('Compra');

      // 13. Deletar Movimentação de Estoque
      await deleteTable('MovimentacaoEstoque');

      // 14. Deletar Escala
      if (postoId) {
        const { data: fren } = await supabase.from('Frentista').select('id').eq('posto_id', postoId);
        if (fren && fren.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('Escala').delete().in('frentista_id', fren.map(f => f.id));
        }
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('Escala').delete().neq('id', 0);
      }

      // 11. Deletar Histórico de Tanques
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let queryHist = (supabase as any).from('HistoricoTanque').delete();
      if (postoId) {
        // Buscar tanques do posto
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

      // 12. Resetar Estoque para zero
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let queryEstoque = (supabase as any)
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

      // 13. Resetar saldo devedor dos clientes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let queryClientes = (supabase as any)
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

      return {
        success: true,
        message: postoId
          ? `Sistema resetado com sucesso para o posto ${postoId}!`
          : 'Sistema resetado completamente com sucesso!',
        deletedCounts
      };

    } catch (error: unknown) {
      console.error('Erro ao resetar sistema:', error);
      return {
        success: false,
        message: `Erro ao resetar sistema: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        deletedCounts: {}
      };
    }
  }
};
