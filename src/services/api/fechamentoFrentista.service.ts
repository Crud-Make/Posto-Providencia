import { supabase } from '../supabase';
import { FechamentoFrentista, InsertTables, UpdateTables, Frentista, Turno } from '../../types/database';

export const fechamentoFrentistaService = {
  async getByFechamento(fechamentoId: number): Promise<(FechamentoFrentista & { frentista: Frentista | null })[]> {
    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .select(`
        *,
        frentista:Frentista(*)
      `)
      .eq('fechamento_id', fechamentoId);
    if (error) throw error;
    // @ts-ignore
    return data || [];
  },

  async create(fechamentoFrentista: InsertTables<'FechamentoFrentista'>): Promise<FechamentoFrentista> {
    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .insert(fechamentoFrentista)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, updates: UpdateTables<'FechamentoFrentista'>): Promise<FechamentoFrentista> {
    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async bulkCreate(items: InsertTables<'FechamentoFrentista'>[]): Promise<FechamentoFrentista[]> {
    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .insert(items)
      .select();
    if (error) throw error;
    return data || [];
  },

  /**
   * Exclui todos os fechamentos de frentista vinculados a um fechamento principal.
   * 
   * @param fechamentoId - ID do fechamento pai (consolidado)
   * 
   * Importante: Antes da exclusão, o método remove notificações vinculadas e 
   * desvincula notas de frentista e vendas de produtos para evitar violações de integridade
   * (Foreign Key Constraints) e permitir que os registros originais sejam preservados sem o vínculo.
   */
  async deleteByFechamento(fechamentoId: number): Promise<void> {
    console.log('[deleteByFechamento] Iniciando exclusão para fechamento:', fechamentoId);

    // Buscar todos os IDs de FechamentoFrentista deste Fechamento
    const { data: frentistasData, error: fetchError } = await supabase
      .from('FechamentoFrentista')
      .select('id')
      .eq('fechamento_id', fechamentoId);

    if (fetchError) {
      console.error('[deleteByFechamento] Erro ao buscar FechamentoFrentista:', fetchError);
      throw fetchError;
    }

    if (frentistasData && frentistasData.length > 0) {
      const frentistaIds = frentistasData.map(f => f.id);
      console.log('[deleteByFechamento] FechamentoFrentista IDs encontrados:', frentistaIds);

      // 1. Remover Notificações vinculadas (evita violação de FK)
      console.log('[deleteByFechamento] Buscando e removendo notificações vinculadas...');

      // Primeiro, tentamos desvincular (set null) para garantir que mesmo que o delete falhe, o vínculo seja quebrado
      await supabase
        .from('Notificacao')
        .update({ fechamento_frentista_id: null })
        .in('fechamento_frentista_id', frentistaIds);

      // Depois tentamos deletar de fato
      const { error: notifError } = await supabase
        .from('Notificacao')
        .delete()
        .in('fechamento_frentista_id', frentistaIds);

      if (notifError) {
        console.warn('[deleteByFechamento] Aviso ao remover notificações (pode ser ignorado se o vínculo foi quebrado):', notifError);
        // Não lançamos erro aqui pois o update NULL acima já deve ter quebrado o vínculo impeditivo
      }
      console.log('[deleteByFechamento] Notificações processadas');

      // 2. Desvincular Notas de Frentista (para que permaneçam no histórico, mas sem o vínculo do fechamento excluído)
      console.log('[deleteByFechamento] Desvinculando NotaFrentista...');
      const { error: notaError } = await supabase
        .from('NotaFrentista')
        .update({ fechamento_frentista_id: null })
        .in('fechamento_frentista_id', frentistaIds);

      if (notaError) {
        console.error('[deleteByFechamento] Erro ao desvincular NotaFrentista:', notaError);
        throw notaError;
      }
      console.log('[deleteByFechamento] NotaFrentista desvinculadas com sucesso');

      // 3. Desvincular Venda de Produtos
      console.log('[deleteByFechamento] Desvinculando VendaProduto...');
      const { error: vendaError } = await supabase
        .from('VendaProduto')
        .update({ fechamento_frentista_id: null })
        .in('fechamento_frentista_id', frentistaIds);

      if (vendaError) {
        console.error('[deleteByFechamento] Erro ao desvincular VendaProduto:', vendaError);
        throw vendaError;
      }
      console.log('[deleteByFechamento] VendaProduto desvinculadas com sucesso');
    } else {
      console.log('[deleteByFechamento] Nenhum FechamentoFrentista encontrado para este fechamento');
    }

    // 4. Agora sim, deletar os fechamentos de frentista
    console.log('[deleteByFechamento] Deletando FechamentoFrentista...');
    const { error: deleteError } = await supabase
      .from('FechamentoFrentista')
      .delete()
      .eq('fechamento_id', fechamentoId);

    if (deleteError) {
      console.error('[deleteByFechamento] Erro ao deletar FechamentoFrentista:', deleteError);
      throw deleteError;
    }

    console.log('[deleteByFechamento] FechamentoFrentista deletados com sucesso');
  },

  // Histórico de diferenças do frentista
  async getHistoricoDiferencas(frentistaId: number, limit = 30) {
    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .select(`
        *,
        fechamento:Fechamento(data)
      `)
      .eq('frentista_id', frentistaId)
      .order('id', { ascending: false })
      .limit(limit);
    if (error) throw error;
    // @ts-ignore
    return data || [];
  },

  async getByDate(dataStr: string, postoId?: number) {
    // Primeiro, buscar os IDs dos fechamentos para esta data e posto
    let fechamentoQuery = supabase
      .from('Fechamento')
      .select('id')
      .gte('data', `${dataStr}T00:00:00`)
      .lte('data', `${dataStr}T23:59:59`);

    if (postoId) {
      fechamentoQuery = fechamentoQuery.eq('posto_id', postoId);
    }

    const { data: fechamentos, error: fechError } = await fechamentoQuery;
    if (fechError) throw fechError;

    if (!fechamentos || fechamentos.length === 0) {
      return [];
    }

    const fechamentoIds = fechamentos.map(f => f.id);

    // Agora buscar os FechamentoFrentista com esses IDs
    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .select(`
        *,
        frentista:Frentista(*),
        fechamento:Fechamento(data, turno_id, turno:Turno(*), posto_id)
      `)
      .in('fechamento_id', fechamentoIds);

    if (error) throw error;
    // @ts-ignore
    return data || [];
  },

  async getByDateAndTurno(dataStr: string, turnoId: number, postoId?: number) {
    // Busca fechamento específico da data e turno
    let fechamentoQuery = supabase
      .from('Fechamento')
      .select('id')
      .gte('data', `${dataStr}T00:00:00`)
      .lte('data', `${dataStr}T23:59:59`)
      .eq('turno_id', turnoId);

    if (postoId) {
      fechamentoQuery = fechamentoQuery.eq('posto_id', postoId);
    }

    const { data: fechamentos, error: fechError } = await fechamentoQuery;
    if (fechError) throw fechError;

    if (!fechamentos || fechamentos.length === 0) {
      return [];
    }

    const fechamentoId = fechamentos[0].id;

    // Busca os FechamentoFrentista deste fechamento
    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .select(`
        *,
        frentista:Frentista(*),
        fechamento:Fechamento(data, turno_id, turno:Turno(*), posto_id)
      `)
      .eq('fechamento_id', fechamentoId);

    if (error) throw error;
    // @ts-ignore
    return data || [];
  },
};
