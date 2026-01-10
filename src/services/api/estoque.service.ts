/**
 * Service de Estoque
 *
 * @remarks
 * Gerencia operações de estoque e cálculos de previsão
 */

import { supabase, withPostoFilter } from './base';
import type { Estoque, Combustivel, UpdateTables } from '../../types/database';

export const estoqueService = {
  async getAll(postoId?: number): Promise<(Estoque & { combustivel: Combustivel })[]> {
    const baseQuery = supabase
      .from('Estoque')
      .select(`
        *,
        combustivel:Combustivel(*)
      `);

    const query = withPostoFilter(baseQuery, postoId);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as (Estoque & { combustivel: Combustivel })[];
  },

  async getByCombustivel(combustivelId: number): Promise<Estoque | null> {
    const { data, error } = await supabase
      .from('Estoque')
      .select('*')
      .eq('combustivel_id', combustivelId)
      .maybeSingle(); // Usando maybeSingle para evitar erro se não encontrar
      
    if (error) throw error;
    return data;
  },

  async update(id: number, estoque: UpdateTables<'Estoque'>): Promise<Estoque> {
    const { data, error } = await supabase
      .from('Estoque')
      .update({
        ...estoque,
        ultima_atualizacao: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Calcula dias restantes baseado na média de vendas
  async getDiasRestantes(combustivelId: number, diasAnalise = 7) {
    const estoque = await this.getByCombustivel(combustivelId);
    if (!estoque) return null;

    // Busca leituras dos últimos X dias
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - diasAnalise);

    const { data: leituras, error } = await supabase
      .from('Leitura')
      .select(`
        litros_vendidos,
        bico:Bico!inner(combustivel_id)
      `)
      .eq('bico.combustivel_id', combustivelId)
      .gte('data', dataInicio.toISOString().split('T')[0]);

    if (error) throw error;

    const totalVendido = leituras?.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0) || 0;
    const mediadiaria = totalVendido / diasAnalise;

    return {
      estoqueAtual: estoque.quantidade_atual,
      capacidade: estoque.capacidade_tanque,
      percentual: (estoque.quantidade_atual / estoque.capacidade_tanque) * 100,
      mediaDiaria: mediadiaria,
      diasRestantes: mediadiaria > 0 ? Math.floor(estoque.quantidade_atual / mediadiaria) : 999,
    };
  },
};
