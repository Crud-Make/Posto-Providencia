/**
 * Service de Leituras
 *
 * @remarks
 * Gerencia leituras de encerrantes (bombas)
 */

import { supabase, withPostoFilter } from './base';
import { estoqueService } from './estoque.service';
import type { Leitura, Bico, Combustivel, Bomba, InsertTables, UpdateTables } from '../../types/database';

export interface VendaPorCombustivel {
  combustivel: Combustivel;
  litros: number;
  valor: number;
}

export interface SalesSummary {
  data: string;
  totalLitros: number;
  totalVendas: number;
  porCombustivel: VendaPorCombustivel[];
  leituras: (Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[];
}

export const leituraService = {
  async getByDate(data: string, postoId?: number): Promise<(Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]> {
    const baseQuery = supabase
      .from('Leitura')
      .select(`
        *,
        bico:Bico(
          *,
          combustivel:Combustivel(*),
          bomba:Bomba(*)
        )
      `)
      .eq('data', data);

    const query = withPostoFilter(baseQuery, postoId);

    const { data: leituras, error } = await query.order('id');
    if (error) throw error;
    return (leituras || []) as (Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[];
  },

  async getByDateRange(startDate: string, endDate: string, postoId?: number): Promise<(Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]> {
    const baseQuery = supabase
      .from('Leitura')
      .select(`
        *,
        bico:Bico(
          *,
          combustivel:Combustivel(*),
          bomba:Bomba(*)
        )
      `)
      .gte('data', startDate)
      .lte('data', endDate);

    const query = withPostoFilter(baseQuery, postoId);

    const { data: leituras, error } = await query.order('data', { ascending: true });
    if (error) throw error;
    return (leituras || []) as (Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[];
  },

  async getByDateAndTurno(data: string, turnoId: number, postoId?: number): Promise<(Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]> {
    const baseQuery = supabase
      .from('Leitura')
      .select(`
        *,
        bico:Bico(
          *,
          combustivel:Combustivel(*),
          bomba:Bomba(*)
        )
      `)
      .eq('data', data)
      .eq('turno_id', turnoId);

    const query = withPostoFilter(baseQuery, postoId);

    const { data: leituras, error } = await query.order('id');
    if (error) throw error;
    // Cast seguro pois sabemos a estrutura do retorno do select com joins
    return (leituras as unknown) as (Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[] || [];
  },

  async getLastReading(postoId?: number): Promise<Leitura[]> {
    // Busca a última leitura de cada bico
    // Simplificação: buscar últimas 200 leituras e filtrar no JS a mais recente por bico.

    const baseQuery = supabase
      .from('Leitura')
      .select('*')
      .order('data', { ascending: false })
      .order('id', { ascending: false })
      .limit(200);

    const query = withPostoFilter(baseQuery, postoId);

    const { data, error } = await query;
    if (error) throw error;

    // Filtra apenas a última de cada bico
    const ultimasPorBico = new Map<number, Leitura>();
    if (data) {
      data.forEach((l: Leitura) => {
        if (!ultimasPorBico.has(l.bico_id)) {
          ultimasPorBico.set(l.bico_id, l);
        }
      });
    }

    return Array.from(ultimasPorBico.values());
  },

  async getLastReadingByBico(bicoId: number): Promise<Leitura | null> {
    const { data, error } = await supabase
      .from('Leitura')
      .select('*')
      .eq('bico_id', bicoId)
      .order('data', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(leitura: InsertTables<'Leitura'>): Promise<Leitura> {
    // Calcula litros vendidos e valor venda
    const litros_vendidos = leitura.leitura_final - leitura.leitura_inicial;
    const valor_total = litros_vendidos * leitura.preco_litro;

    const { data, error } = await supabase
      .from('Leitura')
      .insert({
        ...leitura,
        litros_vendidos,
        valor_total,
      })
      .select()
      .single();
    if (error) throw error;

    // Atualiza estoque
    const { data: bico } = await supabase
      .from('Bico')
      .select('combustivel_id')
      .eq('id', leitura.bico_id)
      .single();

    if (bico) {
      const estoque = await estoqueService.getByCombustivel(bico.combustivel_id);
      if (estoque) {
        await estoqueService.update(estoque.id, {
          quantidade_atual: estoque.quantidade_atual - litros_vendidos,
        });
      }
    }

    return data;
  },

  async update(id: number, leitura: UpdateTables<'Leitura'>): Promise<Leitura> {
    // Recalcula se necessário
    let updates = { ...leitura };
    if (leitura.leitura_final !== undefined && leitura.leitura_inicial !== undefined && leitura.preco_litro !== undefined) {
      updates.litros_vendidos = leitura.leitura_final - leitura.leitura_inicial;
      updates.valor_total = updates.litros_vendidos * leitura.preco_litro;
    }

    const { data, error } = await supabase
      .from('Leitura')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async bulkCreate(leituras: Omit<InsertTables<'Leitura'>, 'litros_vendidos' | 'valor_total'>[]): Promise<Leitura[]> {
    const leiturasWithCalc = leituras.map(l => ({
      ...l,
      litros_vendidos: l.leitura_final - l.leitura_inicial,
      valor_total: (l.leitura_final - l.leitura_inicial) * l.preco_litro,
    }));

    const { data, error } = await supabase
      .from('Leitura')
      .insert(leiturasWithCalc)
      .select();
    if (error) throw error;

    // Atualiza estoque para todas as leituras
    const bicosIds = Array.from(new Set(leituras.map(l => l.bico_id)));
    
    // Precisamos buscar os combustíveis dos bicos
    // O Supabase não suporta where in com join facilmente dessa forma direta, então buscamos bicos
    const { data: bicosData } = await supabase
      .from('Bico')
      .select('id, combustivel_id')
      .in('id', bicosIds);

    if (bicosData) {
      const bicoToCombustivel = Object.fromEntries(
        bicosData.map(b => [b.id, b.combustivel_id])
      );

      // Agrupa litros vendidos por combustível
      const vendasPorCombustivel: Record<number, number> = {};
      leiturasWithCalc.forEach(l => {
        const combId = bicoToCombustivel[l.bico_id];
        if (combId) {
          vendasPorCombustivel[combId] = (vendasPorCombustivel[combId] || 0) + l.litros_vendidos;
        }
      });

      // Atualiza o estoque de cada combustível
      for (const [combId, totalLitros] of Object.entries(vendasPorCombustivel)) {
        const estoque = await estoqueService.getByCombustivel(Number(combId));
        if (estoque) {
          await estoqueService.update(estoque.id, {
            quantidade_atual: estoque.quantidade_atual - totalLitros,
          });
        }
      }
    }

    return data || [];
  },

  async deleteByDate(data: string, postoId: number): Promise<void> {
    const { error } = await supabase
      .from('Leitura')
      .delete()
      .gte('data', `${data}T00:00:00`)
      .lte('data', `${data}T23:59:59`)
      .eq('turno_id', 1)
      .eq('posto_id', postoId);
    if (error) throw error;
  },

  async deleteByShift(data: string, turnoId: number, postoId: number): Promise<void> {
    const { error } = await supabase
      .from('Leitura')
      .delete()
      .gte('data', `${data}T00:00:00`)
      .lte('data', `${data}T23:59:59`)
      .eq('turno_id', turnoId)
      .eq('posto_id', postoId);
    if (error) throw error;
  },

  // Resumo de vendas por data
  async getSalesSummaryByDate(data: string, postoId?: number): Promise<SalesSummary> {
    const leituras = await this.getByDate(data, postoId);

    const totalLitros = leituras.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
    const totalVendas = leituras.reduce((acc, l) => acc + (l.valor_total || 0), 0);

    // Agrupa por combustível
    const porCombustivel = leituras.reduce((acc, l) => {
      const codigo = l.bico.combustivel.codigo;
      if (!acc[codigo]) {
        acc[codigo] = {
          combustivel: l.bico.combustivel,
          litros: 0,
          valor: 0,
        };
      }
      acc[codigo].litros += l.litros_vendidos || 0;
      acc[codigo].valor += l.valor_total || 0;
      return acc;
    }, {} as Record<string, { combustivel: Combustivel; litros: number; valor: number }>);

    return {
      data,
      totalLitros,
      totalVendas,
      porCombustivel: Object.values(porCombustivel),
      leituras,
    };
  },
};
