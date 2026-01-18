import { supabase } from '../supabase';
import type { Emprestimo as EmprestimoRow, Parcela as ParcelaRow, InsertTables, UpdateTables } from '../../types/database/index';
import { parcelaService } from './parcela.service';
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse
} from '../../types/ui/response-types';

// [14/01 19:05] Alinhando tipos de Emprestimo/Parcela com aliases e helpers
type Emprestimo = EmprestimoRow;
type EmprestimoInsert = InsertTables<'Emprestimo'>;
type EmprestimoUpdate = UpdateTables<'Emprestimo'>;
type Parcela = ParcelaRow;
type ParcelaInsert = InsertTables<'Parcela'>;

/**
 * Serviço de Empréstimos
 * 
 * @remarks
 * Gerencia empréstimos concedidos a frentistas com geração automática de parcelas
 */
export const emprestimoService = {
  /**
   * Busca todos os empréstimos ativos com suas parcelas
   * @param postoId - ID do posto (opcional)
   */
  async getAll(postoId?: number): Promise<ApiResponse<(Emprestimo & { parcelas: Parcela[] })[]>> {
    try {
      let query = supabase
        .from('Emprestimo')
        .select('*, parcelas:Parcela(*)')
        .eq('ativo', true);

      if (postoId) {
        query = query.eq('posto_id', postoId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return createErrorResponse(error.message, 'FETCH_ERROR');

      return createSuccessResponse((data || []) as (Emprestimo & { parcelas: Parcela[] })[]);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Cria um novo empréstimo e gera parcelas automaticamente
   * @param emprestimo - Dados do empréstimo
   * @remarks Gera parcelas conforme periodicidade e quantidade definidas
   */
  async create(emprestimo: EmprestimoInsert): Promise<ApiResponse<Emprestimo>> {
    try {
      const { data, error } = await supabase
        .from('Emprestimo')
        .insert(emprestimo)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'INSERT_ERROR');

      // Gerar parcelas se os dados necessários estiverem presentes
      const parcelas: ParcelaInsert[] = [];
      if (emprestimo.data_primeiro_vencimento && emprestimo.quantidade_parcelas && emprestimo.valor_parcela && emprestimo.periodicidade) {
        const firstDueDate = new Date(emprestimo.data_primeiro_vencimento);
        const qtd = emprestimo.quantidade_parcelas;

        for (let i = 1; i <= qtd; i++) {
          const dueDate = new Date(firstDueDate);

          if (emprestimo.periodicidade === 'mensal') {
            dueDate.setMonth(dueDate.getMonth() + (i - 1));
          } else if (emprestimo.periodicidade === 'quinzenal') {
            dueDate.setDate(dueDate.getDate() + (i - 1) * 15);
          } else if (emprestimo.periodicidade === 'semanal') {
            dueDate.setDate(dueDate.getDate() + (i - 1) * 7);
          } else if (emprestimo.periodicidade === 'diario') {
            dueDate.setDate(dueDate.getDate() + (i - 1));
          }

          parcelas.push({
            emprestimo_id: data.id,
            numero_parcela: i,
            data_vencimento: dueDate.toISOString().split('T')[0],
            valor: emprestimo.valor_parcela,
            status: 'pendente'
          });
        }

        if (parcelas.length > 0) {
          await parcelaService.bulkCreate(parcelas);
        }
      }

      return createSuccessResponse(data as Emprestimo);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Atualiza um empréstimo
   * @param id - ID do empréstimo
   * @param emprestimo - Dados para atualização
   */
  async update(id: number, emprestimo: EmprestimoUpdate): Promise<ApiResponse<Emprestimo>> {
    try {
      const { data, error } = await supabase
        .from('Emprestimo')
        .update(emprestimo)
        .eq('id', id)
        .select()
        .single();

      if (error) return createErrorResponse(error.message, 'UPDATE_ERROR');
      return createSuccessResponse(data as Emprestimo);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },

  /**
   * Remove um empréstimo e suas parcelas
   * @param id - ID do empréstimo
   */
  async delete(id: number): Promise<ApiResponse<void>> {
    try {
      // Excluir parcelas primeiro
      const { error: parcelaError } = await supabase.from('Parcela').delete().eq('emprestimo_id', id);
      if (parcelaError) return createErrorResponse(parcelaError.message, 'DELETE_ERROR');

      const { error } = await supabase
        .from('Emprestimo')
        .delete()
        .eq('id', id);

      if (error) return createErrorResponse(error.message, 'DELETE_ERROR');
      return createSuccessResponse(undefined);
    } catch (err) {
      return createErrorResponse(err instanceof Error ? err.message : 'Erro desconhecido');
    }
  },
};

