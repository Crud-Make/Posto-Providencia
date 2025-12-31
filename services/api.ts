import { supabase } from './supabase';
import type {
  Bico,
  Bomba,
  Combustivel,
  Compra,
  Estoque,
  Fechamento,
  FechamentoFrentista,
  FormaPagamento,
  Fornecedor,
  Frentista,
  Leitura,
  Maquininha,
  Recebimento,
  Turno,
  Usuario,
  Emprestimo,
  Parcela,
  Divida as DBDivida,
  Configuracao,
  InsertTables,
  UpdateTables,
  Posto,
  UsuarioPosto,
} from './database.types';

import {
  Divida,
  SolvencyStatus,
  SolvencyProjection
} from '../types';

// Tipo para o resumo de vendas por combustível
interface VendaPorCombustivel {
  combustivel: Combustivel;
  litros: number;
  valor: number;
}

// Tipo para o resumo de vendas
interface SalesSummary {
  data: string;
  totalLitros: number;
  totalVendas: number;
  porCombustivel: VendaPorCombustivel[];
  leituras: (Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[];
}

// ============================================
// POSTOS
// ============================================

export const postoService = {
  async getAll(): Promise<Posto[]> {
    const { data, error } = await supabase
      .from('Posto')
      .select('*')
      .eq('ativo', true)
      .order('id');
    if (error) throw error;
    return data || [];
  },

  async getById(id: number): Promise<Posto | null> {
    const { data, error } = await supabase
      .from('Posto')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getByUser(usuarioId: number): Promise<Posto[]> {
    const { data, error } = await supabase
      .from('UsuarioPosto')
      .select(`
        *,
        posto:Posto(*)
      `)
      .eq('usuario_id', usuarioId)
      .eq('ativo', true);

    if (error) throw error;
    return (data || []).map(up => up.posto).filter(Boolean) as Posto[];
  },

  async getAllIncludingInactive(): Promise<Posto[]> {
    const { data, error } = await supabase
      .from('Posto')
      .select('*')
      .order('id');
    if (error) throw error;
    return data || [];
  },

  async create(posto: Omit<InsertTables<'Posto'>, 'id' | 'created_at'>): Promise<Posto> {
    const { data, error } = await supabase
      .from('Posto')
      .insert(posto)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, posto: UpdateTables<'Posto'>): Promise<Posto> {
    const { data, error } = await supabase
      .from('Posto')
      .update(posto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    // Soft delete - apenas desativa o posto
    const { error } = await supabase
      .from('Posto')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;
  }
};


// ============================================
// COMBUSTÍVEIS
// ============================================

export const combustivelService = {
  // Ordem customizada dos combustíveis
  ORDEM_COMBUSTIVEIS: ['GC', 'GA', 'ET', 'S10', 'DIESEL'] as const,

  async getAll(postoId?: number): Promise<Combustivel[]> {
    let query = (supabase as any)
      .from('Combustivel')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Ordena por ordem customizada
    const ordem = this.ORDEM_COMBUSTIVEIS;
    return (data || []).sort((a, b) => {
      const indexA = ordem.indexOf(a.codigo as any);
      const indexB = ordem.indexOf(b.codigo as any);
      // Itens não encontrados vão para o final
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    });
  },


  async getById(id: number): Promise<Combustivel | null> {
    const { data, error } = await supabase
      .from('Combustivel')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(combustivel: InsertTables<'Combustivel'>): Promise<Combustivel> {
    const { data, error } = await supabase
      .from('Combustivel')
      .insert(combustivel)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, combustivel: UpdateTables<'Combustivel'>): Promise<Combustivel> {
    const { data, error } = await supabase
      .from('Combustivel')
      .update(combustivel)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================
// BOMBAS
// ============================================

export const bombaService = {
  async getAll(postoId?: number): Promise<Bomba[]> {
    let query = (supabase as any)
      .from('Bomba')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getWithBicos(postoId?: number): Promise<(Bomba & { bicos: (Bico & { combustivel: Combustivel })[] })[]> {
    let query = (supabase as any)
      .from('Bomba')
      .select(`
        *,
        bicos:Bico(
          *,
          combustivel:Combustivel(*)
        )
      `)
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async create(bomba: InsertTables<'Bomba'>): Promise<Bomba> {
    const { data, error } = await supabase
      .from('Bomba')
      .insert(bomba)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, bomba: UpdateTables<'Bomba'>): Promise<Bomba> {
    const { data, error } = await supabase
      .from('Bomba')
      .update(bomba)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

};

// ============================================
// DESPESAS
// ============================================

export const despesaService = {
  async getAll(postoId?: number): Promise<any[]> {
    let query = (supabase as any)
      .from('Despesa')
      .select('*');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByMonth(year: number, month: number, postoId?: number): Promise<any[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    let query = (supabase as any)
      .from('Despesa')
      .select('*')
      .gte('data', startDate)
      .lte('data', endDate);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query;

    if (error) {
      // Fail gracefully if table doesn't exist yet (migration pending)
      console.warn('Erro ao buscar despesas (tabela pode não existir):', error);
      return [];
    }
    return data || [];
  },

  async create(despesa: any): Promise<any> {
    const { data, error } = await (supabase as any)
      .from('Despesa')
      .insert(despesa)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, despesa: any): Promise<any> {
    const { data, error } = await (supabase as any)
      .from('Despesa')
      .update(despesa)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await (supabase as any)
      .from('Despesa')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// BICOS
// ============================================

export const bicoService = {
  async getAll(postoId?: number): Promise<Bico[]> {
    let query = (supabase as any)
      .from('Bico')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('numero');
    if (error) throw error;
    return data || [];
  },

  async getWithDetails(postoId?: number): Promise<(Bico & { bomba: Bomba; combustivel: Combustivel })[]> {
    let query = (supabase as any)
      .from('Bico')
      .select(`
        *,
        bomba:Bomba(*),
        combustivel:Combustivel(*)
      `)
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('numero');
    if (error) throw error;
    return data || [];
  },

  async create(bico: InsertTables<'Bico'>): Promise<Bico> {
    const { data, error } = await supabase
      .from('Bico')
      .insert(bico)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, bico: UpdateTables<'Bico'>): Promise<Bico> {
    const { data, error } = await supabase
      .from('Bico')
      .update(bico)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================
// FRENTISTAS
// ============================================

export const frentistaService = {
  async getWithEmail(postoId?: number): Promise<(Frentista & { email: string | null })[]> {
    let query = (supabase as any).rpc('get_frentistas_with_email');

    const { data, error } = await query;
    if (error) throw error;

    if (postoId && data) {
      return data.filter((f: any) => f.posto_id === postoId);
    }

    return data || [];
  },
  async getAll(postoId?: number): Promise<Frentista[]> {
    let query = (supabase as any)
      .from('Frentista')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async getById(id: number): Promise<Frentista | null> {
    const { data, error } = await supabase
      .from('Frentista')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(frentista: InsertTables<'Frentista'>): Promise<Frentista> {
    const { data, error } = await supabase
      .from('Frentista')
      .insert(frentista)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, frentista: UpdateTables<'Frentista'>): Promise<Frentista> {
    const { data, error } = await supabase
      .from('Frentista')
      .update(frentista)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('Frentista')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// LEITURAS
// ============================================

export const leituraService = {
  async getByDate(data: string, postoId?: number): Promise<(Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]> {
    let query = (supabase as any)
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

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data: leituras, error } = await query.order('id');
    if (error) throw error;
    return leituras || [];
  },

  async getByDateRange(startDate: string, endDate: string, postoId?: number): Promise<(Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]> {
    let query = (supabase as any)
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

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data: leituras, error } = await query.order('data', { ascending: true });
    if (error) throw error;
    return leituras || [];
  },

  async getLastReadingByBico(bicoId: number): Promise<Leitura | null> {
    const { data, error } = await supabase
      .from('Leitura')
      .select('*')
      .eq('bico_id', bicoId)
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
    const bicosIds = [...new Set(leituras.map(l => l.bico_id))];
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

// ============================================
// FORMAS DE PAGAMENTO
// ============================================

export const formaPagamentoService = {
  async getAll(postoId?: number): Promise<FormaPagamento[]> {
    let query = (supabase as any)
      .from('FormaPagamento')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async create(forma: InsertTables<'FormaPagamento'>): Promise<FormaPagamento> {
    const { data, error } = await supabase
      .from('FormaPagamento')
      .insert(forma)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, forma: UpdateTables<'FormaPagamento'>): Promise<FormaPagamento> {
    const { data, error } = await supabase
      .from('FormaPagamento')
      .update(forma)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('FormaPagamento')
      .update({ ativo: false }) // Soft delete
      .eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// MAQUININHAS
// ============================================

export const maquininhaService = {
  async getAll(postoId?: number): Promise<Maquininha[]> {
    let query = (supabase as any)
      .from('Maquininha')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async create(maquininha: InsertTables<'Maquininha'>): Promise<Maquininha> {
    const { data, error } = await supabase
      .from('Maquininha')
      .insert(maquininha)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================
// FECHAMENTO DE CAIXA
// ============================================

export const fechamentoService = {
  async getByDateAndTurno(data: string, turnoId: number, postoId?: number): Promise<Fechamento | null> {
    let query = (supabase as any)
      .from('Fechamento')
      .select('*')
      .gte('data', `${data}T00:00:00`)
      .lte('data', `${data}T23:59:59`)
      .eq('turno_id', turnoId);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data: fechamentos, error } = await query.order('id', { ascending: false }).limit(1);
    if (error) throw error;
    return fechamentos && fechamentos.length > 0 ? fechamentos[0] : null;
  },

  async getByDate(data: string, postoId?: number): Promise<any[]> {
    let query = (supabase as any)
      .from('Fechamento')
      .select(`
        *,
        turno:Turno(*),
        usuario:Usuario(id, nome)
      `)
      .gte('data', `${data}T00:00:00`)
      .lte('data', `${data}T23:59:59`);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data: fechamentos, error } = await query;
    if (error) throw error;
    return fechamentos || [];
  },

  async getWithDetails(id: number) {
    const { data, error } = await supabase
      .from('Fechamento')
      .select(`
        *,
        recebimentos:Recebimento(
          *,
          forma_pagamento:FormaPagamento(*),
          maquininha:Maquininha(*)
        ),
        fechamentos_frentista:FechamentoFrentista(
          *,
          frentista:Frentista(*)
        ),
        usuario:Usuario(id, nome)
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getRecent(limit = 10, postoId?: number): Promise<Fechamento[]> {
    let query = (supabase as any)
      .from('Fechamento')
      .select('*');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query
      .order('data', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async create(fechamento: Omit<InsertTables<'Fechamento'>, 'diferenca' | 'total_recebido' | 'total_vendas'> & Partial<Pick<InsertTables<'Fechamento'>, 'diferenca' | 'total_recebido' | 'total_vendas'>>): Promise<Fechamento> {
    const { data, error } = await supabase
      .from('Fechamento')
      .insert({
        ...fechamento,
        diferenca: fechamento.diferenca ?? 0,
        total_recebido: fechamento.total_recebido ?? 0,
        total_vendas: fechamento.total_vendas ?? 0,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, fechamento: UpdateTables<'Fechamento'>): Promise<Fechamento> {
    const { data, error } = await supabase
      .from('Fechamento')
      .update(fechamento)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async finalize(id: number, observacoes?: string): Promise<Fechamento> {
    return this.update(id, {
      status: 'FECHADO',
      observacoes,
    });
  },
};

// ============================================
// RECEBIMENTOS
// ============================================

export const recebimentoService = {
  async getByFechamento(fechamentoId: number): Promise<(Recebimento & { forma_pagamento: FormaPagamento; maquininha: Maquininha | null })[]> {
    const { data, error } = await supabase
      .from('Recebimento')
      .select(`
        *,
        forma_pagamento:FormaPagamento(*),
        maquininha:Maquininha(*)
      `)
      .eq('fechamento_id', fechamentoId);
    if (error) throw error;
    return data || [];
  },

  async create(recebimento: InsertTables<'Recebimento'>): Promise<Recebimento> {
    const { data, error } = await supabase
      .from('Recebimento')
      .insert(recebimento)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async bulkCreate(recebimentos: InsertTables<'Recebimento'>[]): Promise<Recebimento[]> {
    const { data, error } = await supabase
      .from('Recebimento')
      .insert(recebimentos)
      .select();
    if (error) throw error;
    return data || [];
  },

  async deleteByFechamento(fechamentoId: number): Promise<void> {
    const { error } = await supabase
      .from('Recebimento')
      .delete()
      .eq('fechamento_id', fechamentoId);
    if (error) throw error;
  },
};

// ============================================
// FECHAMENTO FRENTISTA
// ============================================

export const fechamentoFrentistaService = {
  async getByFechamento(fechamentoId: number): Promise<(FechamentoFrentista & { frentista: Frentista })[]> {
    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .select(`
        *,
        frentista:Frentista(*)
      `)
      .eq('fechamento_id', fechamentoId);
    if (error) throw error;
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

  async bulkCreate(items: InsertTables<'FechamentoFrentista'>[]): Promise<FechamentoFrentista[]> {
    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .insert(items)
      .select();
    if (error) throw error;
    return data || [];
  },

  async deleteByFechamento(fechamentoId: number): Promise<void> {
    const { error } = await supabase
      .from('FechamentoFrentista')
      .delete()
      .eq('fechamento_id', fechamentoId);
    if (error) throw error;
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
    return data || [];
  },
};

// ============================================
// ESTOQUE
// ============================================

export const estoqueService = {
  async getAll(postoId?: number): Promise<(Estoque & { combustivel: Combustivel })[]> {
    let query = (supabase as any)
      .from('Estoque')
      .select(`
        *,
        combustivel:Combustivel(*)
      `);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getByCombustivel(combustivelId: number): Promise<Estoque | null> {
    const { data, error } = await supabase
      .from('Estoque')
      .select('*')
      .eq('combustivel_id', combustivelId)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
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

// ============================================
// COMPRAS
// ============================================

export const compraService = {
  async getAll(postoId?: number, startDate?: string): Promise<(Compra & { combustivel: Combustivel; fornecedor: Fornecedor })[]> {
    let query = (supabase as any)
      .from('Compra')
      .select(`
        *,
        combustivel:Combustivel(*),
        fornecedor:Fornecedor(*)
      `);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    if (startDate) {
      query = query.gte('data', startDate);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(compra: InsertTables<'Compra'>): Promise<Compra> {
    // Calcula custo por litro
    const custo_por_litro = compra.valor_total / compra.quantidade_litros;

    const { data, error } = await supabase
      .from('Compra')
      .insert({
        ...compra,
        custo_por_litro,
      })
      .select()
      .single();
    if (error) throw error;

    // Atualiza estoque
    const estoque = await estoqueService.getByCombustivel(compra.combustivel_id);
    if (estoque) {
      const estoqueAtual = estoque.quantidade_atual;
      const custoMedioAtual = estoque.custo_medio || 0;
      const novaQuantidade = compra.quantidade_litros;
      const novoCusto = custo_por_litro;

      // Calcula novo custo médio ponderado
      const totalValorAntigo = estoqueAtual * custoMedioAtual;
      const totalValorNovo = totalValorAntigo + (novaQuantidade * novoCusto);
      const quantidadeTotal = estoqueAtual + novaQuantidade;
      const novoCustoMedio = quantidadeTotal > 0 ? totalValorNovo / quantidadeTotal : novoCusto;

      await estoqueService.update(estoque.id, {
        quantidade_atual: quantidadeTotal,
        custo_medio: novoCustoMedio,
      });
    }

    return data;
  },
};

// ============================================
// FORNECEDORES
// ============================================

export const fornecedorService = {
  async getAll(postoId?: number): Promise<Fornecedor[]> {
    let query = (supabase as any)
      .from('Fornecedor')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async create(fornecedor: InsertTables<'Fornecedor'>): Promise<Fornecedor> {
    const { data, error } = await supabase
      .from('Fornecedor')
      .insert(fornecedor)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================
// TURNOS
// ============================================

export const turnoService = {
  async getAll(postoId?: number): Promise<Turno[]> {
    let query: any = supabase
      .from('Turno')
      .select('*');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('horario_inicio');
    if (error) throw error;
    return data || [];
  },

  async create(turno: InsertTables<'Turno'>): Promise<Turno> {
    const { data, error } = await supabase
      .from('Turno')
      .insert(turno)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, turno: UpdateTables<'Turno'>): Promise<Turno> {
    const { data, error } = await supabase
      .from('Turno')
      .update(turno)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

// ============================================
// EMPRÉSTIMOS E PARCELAS
// ============================================

export const emprestimoService = {
  async getAll(postoId?: number): Promise<(Emprestimo & { parcelas: Parcela[] })[]> {
    let query: any = supabase
      .from('Emprestimo')
      .select('*, parcelas:Parcela(*)')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(emprestimo: InsertTables<'Emprestimo'>): Promise<Emprestimo> {
    const { data, error } = await supabase
      .from('Emprestimo')
      .insert(emprestimo)
      .select()
      .single();
    if (error) throw error;

    // Generate installments
    const parcelas: InsertTables<'Parcela'>[] = [];
    const firstDueDate = new Date(emprestimo.data_primeiro_vencimento);

    for (let i = 1; i <= emprestimo.quantidade_parcelas; i++) {
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

    await parcelaService.bulkCreate(parcelas);
    return data;
  },

  async update(id: number, emprestimo: UpdateTables<'Emprestimo'>): Promise<Emprestimo> {
    const { data, error } = await supabase
      .from('Emprestimo')
      .update(emprestimo)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};

export const parcelaService = {
  async bulkCreate(parcelas: InsertTables<'Parcela'>[]): Promise<Parcela[]> {
    const { data, error } = await supabase
      .from('Parcela')
      .insert(parcelas)
      .select();
    if (error) throw error;
    return data || [];
  },

  async update(id: number, parcela: UpdateTables<'Parcela'>): Promise<Parcela> {
    const { data, error } = await supabase
      .from('Parcela')
      .update(parcela)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getByEmprestimo(emprestimoId: number): Promise<Parcela[]> {
    const { data, error } = await supabase
      .from('Parcela')
      .select('*')
      .eq('emprestimo_id', emprestimoId)
      .order('numero_parcela');
    if (error) throw error;
    return data || [];
  }
};

// ============================================
// CONFIGURAÇÕES DO SISTEMA
// ============================================

export const configuracaoService = {
  async getAll(postoId?: number): Promise<Configuracao[]> {
    let query = (supabase as any)
      .from('Configuracao')
      .select('*');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('categoria', { ascending: true });
    if (error) throw error;
    return (data || []) as Configuracao[];
  },

  async getByChave(chave: string, postoId?: number): Promise<Configuracao | null> {
    let query = (supabase as any)
      .from('Configuracao')
      .select('*')
      .eq('chave', chave);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== 'PGRST116') throw error;
    return data as Configuracao | null;
  },

  async getByCategoria(categoria: string, postoId?: number): Promise<Configuracao[]> {
    let query = (supabase as any)
      .from('Configuracao')
      .select('*')
      .eq('categoria', categoria);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as Configuracao[];
  },

  async update(chave: string, valor: string, postoId?: number): Promise<Configuracao> {
    let query = (supabase as any)
      .from('Configuracao')
      .update({ valor, updated_at: new Date().toISOString() })
      .eq('chave', chave);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query
      .select()
      .single();
    if (error) throw error;
    return data as Configuracao;
  },

  async getValorNumerico(chave: string, valorPadrao: number = 0): Promise<number> {
    try {
      const config = await this.getByChave(chave);
      if (!config) return valorPadrao;
      return parseFloat(config.valor) || valorPadrao;
    } catch {
      return valorPadrao;
    }
  },

  async create(config: Omit<Configuracao, 'id' | 'updated_at'>): Promise<Configuracao> {
    const { data, error } = await (supabase as any)
      .from('Configuracao')
      .insert(config)
      .select()
      .single();
    if (error) throw error;
    return data as Configuracao;
  }
};

// ============================================
// DASHBOARD / ESTATÍSTICAS
// ============================================

export const dashboardService = {
  async getResumoHoje(postoId?: number) {
    const hoje = new Date().toISOString().split('T')[0];

    // Vendas do dia
    const vendas = await leituraService.getSalesSummaryByDate(hoje, postoId);

    // Fechamento do dia
    const fechamento = await fechamentoService.getByDate(hoje, postoId);

    // Estoque
    const estoque = await estoqueService.getAll(postoId);

    return {
      data: hoje,
      vendas,
      fechamento,
      estoque: estoque.map(e => ({
        ...e,
        percentual: (e.quantidade_atual / e.capacidade_tanque) * 100,
        status:
          (e.quantidade_atual / e.capacidade_tanque) < 0.1 ? 'CRÍTICO' :
            (e.quantidade_atual / e.capacidade_tanque) < 0.2 ? 'BAIXO' : 'OK',
      })),
    };
  },

  async getVendasPeriodo(dataInicio: string, dataFim: string, postoId?: number) {
    let query = (supabase as any)
      .from('Leitura')
      .select(`
        data,
        litros_vendidos,
        valor_total,
        bico:Bico(
          combustivel:Combustivel(codigo, nome)
        )
      `)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('data');
    if (error) throw error;
    return data || [];
  },
};

// ============================================
// ANÁLISE DE VENDAS MENSAIS
// ============================================

interface SalesAnalysisData {
  products: {
    id: string;
    name: string;
    code: string;
    colorClass: string;
    bicos: string;
    readings: { start: number; end: number };
    volume: number;
    price: number;
    cost: number;
    total: number;
    profit: number;
    margin: number;
  }[];
  profitability: {
    name: string;
    value: number;
    percentage: number;
    margin: number;
    color: string;
  }[];
  totals: {
    volume: number;
    revenue: number;
    profit: number;
    avgMargin: number;
    avgProfitPerLiter: number;
  };
  previousPeriod?: {
    volume: number;
    revenue: number;
    profit: number;
  };
}

export const salesAnalysisService = {
  async getMonthlyAnalysis(year: number, month: number, postoId?: number): Promise<SalesAnalysisData> {
    // Calculate date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

    // 1. Fetch Expenses for the month
    const despesas = await despesaService.getByMonth(year, month, postoId);
    const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0);

    // Fetch all readings for the month with bico and combustivel details
    let query = (supabase as any)
      .from('Leitura')
      .select(`
        *,
        bico:Bico(
          id,
          numero,
          combustivel:Combustivel(*)
        )
      `)
      .gte('data', startDate)
      .lte('data', endDate);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data: leituras, error } = await query.order('data');

    if (error) throw error;

    // Fetch stock data for cost info
    const estoques = await estoqueService.getAll(postoId);
    const custoMedioPorCombustivel: Record<number, number> = {};
    estoques.forEach(e => {
      if (e.combustivel) {
        custoMedioPorCombustivel[e.combustivel.id] = e.custo_medio || 0;
      }
    });

    // 2. Aggregate by combustivel & Calculate Total Sales Volume
    let totalSalesVolume = 0;

    // First pass to sum volume
    (leituras || []).forEach((l: any) => {
      if (l.litros_vendidos) totalSalesVolume += l.litros_vendidos;
    });

    // 3. Calculate Expense Per Liter
    // Se não houver vendas, expensePerLiter seria Infinito, então tratamos como 0 ou baseamos em compras (regra de negócio)
    // Aqui usaremos 0 se não houver vendas.
    const despesaPorLitro = totalSalesVolume > 0 ? totalDespesas / totalSalesVolume : 0;

    const porCombustivel: Record<string, {
      combustivel: any;
      bicoIds: Set<number>;
      litros: number;
      valor: number;
      custoMedio: number;
      leituraInicial: number;
      leituraFinal: number;
    }> = {};

    (leituras || []).forEach((l: any) => {
      if (!l.bico || !l.bico.combustivel) return;

      const codigo = l.bico.combustivel.codigo;
      const combId = l.bico.combustivel.id;
      const custoMedio = custoMedioPorCombustivel[combId] || 0;
      const litrosVendidos = l.litros_vendidos || 0;
      const valorVenda = l.valor_total || 0;

      if (!porCombustivel[codigo]) {
        porCombustivel[codigo] = {
          combustivel: l.bico.combustivel,
          bicoIds: new Set(),
          litros: 0,
          valor: 0,
          custoMedio: custoMedio,
          leituraInicial: l.leitura_inicial,
          leituraFinal: l.leitura_final,
        };
      }

      porCombustivel[codigo].bicoIds.add(l.bico.id);
      porCombustivel[codigo].litros += litrosVendidos;
      porCombustivel[codigo].valor += valorVenda;
      porCombustivel[codigo].leituraFinal = l.leitura_final; // Last reading
    });

    // Calculate totals
    let totalVolume = 0;
    let totalRevenue = 0;
    let totalProfit = 0;

    const products = Object.values(porCombustivel).map(item => {
      // EXCEL LOGIC IMPLEMENTATION:
      // 1. Preço Praticado (Actual Price)
      const precoPraticado = item.litros > 0 ? item.valor / item.litros : (item.combustivel.preco_venda || 0);

      // 2. Valor para Venda Sugerido (Suggested Price) = Custo Médio + Despesa/Litro
      // G19 in Excel: = F19 (AVG Cost) + H22 (Expense/Liter)
      const suggestedPrice = item.custoMedio + despesaPorLitro;

      // 3. Lucro por Litro = Preço Praticado - Valor Sugerido
      // I5 in Excel: = G5 (Actual Price) - G19 (Suggested Price)
      const profitPerLiter = precoPraticado - suggestedPrice;

      // 4. Lucro Total = Lucro por Litro * Volume
      const totalLucroProduto = profitPerLiter * item.litros;

      // 5. Margem = Lucro por Litro / Preço Praticado
      // K5 in Excel: = I5 / G5
      const margin = precoPraticado > 0 ? (profitPerLiter / precoPraticado) * 100 : 0;

      // Custo Total Visualização (Custo Médio * Volume) - NOTA: Isso é apenas o custo da mercadoria, sem despesa.
      // Para fins de "Total Cost" visual no grid, geralmente soma-se despesa também? 
      // Não, geralmente Custo é CMV. Mas o Lucro Liquido desconta despesa.
      // Vamos manter 'cost' como CMV (custo mercadoria) para consistência visual do "custo do produto", 
      // mas o lucro será o Liquido.
      const cmv = item.litros * item.custoMedio;

      totalVolume += item.litros;
      totalRevenue += item.valor;
      totalProfit += totalLucroProduto;

      // Color classes based on fuel type
      const colorClasses: Record<string, string> = {
        'GC': 'bg-green-100 text-green-700',
        'GA': 'bg-blue-100 text-blue-700',
        'ET': 'bg-yellow-100 text-yellow-700',
        'S10': 'bg-red-100 text-red-700',
        'DIESEL': 'bg-amber-100 text-amber-700',
      };

      return {
        id: String(item.combustivel.id),
        name: item.combustivel.nome,
        code: item.combustivel.codigo,
        colorClass: colorClasses[item.combustivel.codigo] || 'bg-gray-100 text-gray-700',
        bicos: `Bicos: ${Array.from(item.bicoIds).sort((a, b) => a - b).map(n => String(n).padStart(2, '0')).join(', ')}`,
        readings: {
          start: item.leituraInicial,
          end: item.leituraFinal,
        },
        volume: item.litros,
        price: precoPraticado,
        cost: cmv, // Exibindo CMV
        total: item.valor,
        profit: totalLucroProduto,
        margin: margin,
        // Added extra fields for UI insights if needed
        suggestedPrice,
        expensePerLiter: despesaPorLitro,
        avgCost: item.custoMedio
      };
    });

    // Profitability data
    const profitColors: Record<string, string> = {
      'GC': '#22c55e',
      'GA': '#3b82f6',
      'ET': '#eab308',
      'S10': '#ef4444',
      'DIESEL': '#f59e0b',
    };

    const profitability = products.map(p => ({
      name: p.name,
      value: p.profit,
      percentage: totalProfit > 0 ? (p.profit / totalProfit) * 100 : 0,
      margin: p.margin,
      color: profitColors[p.code] || '#888888',
    })).sort((a, b) => b.value - a.value);

    // Get previous month for comparison
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
    const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
    const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${prevLastDay}`;

    const { data: prevLeituras } = await supabase
      .from('Leitura')
      .select('litros_vendidos, valor_total')
      .gte('data', prevStartDate)
      .lte('data', prevEndDate);

    const previousPeriod = {
      volume: (prevLeituras || []).reduce((acc: number, l: any) => acc + (l.litros_vendidos || 0), 0),
      revenue: (prevLeituras || []).reduce((acc: number, l: any) => acc + (l.valor_total || 0), 0),
      profit: 0, // Simplification: we don't recalculate full profit for previous month here to save perf
    };

    return {
      products,
      profitability,
      totals: {
        volume: totalVolume,
        revenue: totalRevenue,
        profit: totalProfit,
        avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        avgProfitPerLiter: totalVolume > 0 ? totalProfit / totalVolume : 0,
      },
      previousPeriod,
    };
  },
};

// ============================================
// NOTIFICAÇÕES PUSH
// ============================================

export const notificationService = {
  /**
   * Busca tokens de push ativos para um frentista
   */
  async getTokensByFrentistaId(frentistaId: number): Promise<string[]> {
    const { data, error } = await supabase
      .from('PushToken')
      .select('expo_push_token')
      .eq('frentista_id', frentistaId)
      .eq('ativo', true);

    if (error) {
      console.error('Erro ao buscar tokens:', error);
      return [];
    }

    return data?.map(t => t.expo_push_token) || [];
  },

  /**
   * Cria uma notificação no banco de dados
   */
  async createNotification(data: {
    frentista_id: number;
    fechamento_frentista_id?: number;
    titulo: string;
    mensagem: string;
    tipo: string;
    valor_falta?: number;
  }): Promise<number | null> {
    const { data: notification, error } = await supabase
      .from('Notificacao')
      .insert({
        frentista_id: data.frentista_id,
        fechamento_frentista_id: data.fechamento_frentista_id,
        titulo: data.titulo,
        mensagem: data.mensagem,
        tipo: data.tipo,
        valor_falta: data.valor_falta,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }

    return notification?.id || null;
  },

  /**
   * Envia push notification via Expo Push API
   */
  async sendPushNotification(
    expoPushTokens: string[],
    titulo: string,
    mensagem: string,
    data?: Record<string, any>
  ): Promise<boolean> {
    if (expoPushTokens.length === 0) {
      console.log('Nenhum token disponível para envio');
      return false;
    }

    const messages = expoPushTokens.map(token => ({
      to: token,
      sound: 'default' as const,
      title: titulo,
      body: mensagem,
      data: data || {},
    }));

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log('Push notification enviada:', result);
      return true;
    } catch (error) {
      console.error('Erro ao enviar push notification:', error);
      return false;
    }
  },

  /**
   * Notifica frentista sobre falta de caixa
   */
  async sendFaltaCaixaNotification(
    frentistaId: number,
    fechamentoFrentistaId: number,
    valorFalta: number
  ): Promise<boolean> {
    const titulo = '⚠️ Falta de Caixa';
    const mensagem = `Faltou R$ ${valorFalta.toFixed(2).replace('.', ',')} no seu fechamento de caixa.`;

    // 1. Criar registro no banco
    const notificationId = await this.createNotification({
      frentista_id: frentistaId,
      fechamento_frentista_id: fechamentoFrentistaId,
      titulo,
      mensagem,
      tipo: 'FALTA_CAIXA',
      valor_falta: valorFalta,
    });

    if (!notificationId) {
      console.error('Falha ao criar notificação no banco');
      return false;
    }

    // 2. Buscar tokens do frentista
    const tokens = await this.getTokensByFrentistaId(frentistaId);

    if (tokens.length === 0) {
      console.log('Frentista não possui dispositivos registrados');
      // Atualizar notificação como não enviada (já é o padrão)
      return true; // Notificação criada, mas sem push
    }

    // 3. Enviar push
    const sent = await this.sendPushNotification(tokens, titulo, mensagem, {
      type: 'FALTA_CAIXA',
      fechamentoFrentistaId,
      valorFalta,
    });

    // 4. Atualizar status de envio
    if (sent) {
      await supabase
        .from('Notificacao')
        .update({
          enviada: true,
          data_envio: new Date().toISOString(),
        })
        .eq('id', notificationId);
    }

    return sent;
  },

  /**
   * Busca todas as notificações de um frentista
   */
  async getByFrentistaId(frentistaId: number): Promise<any[]> {
    const { data, error } = await supabase
      .from('Notificacao')
      .select('*')
      .eq('frentista_id', frentistaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Marca notificação como lida
   */
  async markAsRead(notificationId: number): Promise<void> {
    await supabase
      .from('Notificacao')
      .update({ lida: true })
      .eq('id', notificationId);
  },
};

// Export all services
// DÍVIDAS E SOLVÊNCIA
// ============================================

export const dividaService = {
  async getAll(postoId?: number): Promise<Divida[]> {
    let query: any = supabase.from('Divida').select('*');
    if (postoId) query = query.eq('posto_id', postoId);

    const { data, error } = await query.order('data_vencimento', { ascending: true });
    if (error) throw error;
    return data.map((d: any) => ({
      id: String(d.id),
      descricao: d.descricao,
      valor: Number(d.valor),
      data_vencimento: d.data_vencimento,
      status: d.status,
      posto_id: d.posto_id
    }));
  },

  async create(divida: Omit<Divida, 'id'>): Promise<Divida> {
    const { data, error } = await supabase
      .from('Divida')
      .insert(divida)
      .select()
      .single();
    if (error) throw error;
    return {
      id: String(data.id),
      descricao: data.descricao,
      valor: Number(data.valor),
      data_vencimento: data.data_vencimento,
      status: data.status,
      posto_id: data.posto_id
    };
  },

  async update(id: string, updates: Partial<Divida>): Promise<Divida> {
    const { data, error } = await supabase
      .from('Divida')
      .update(updates as any)
      .eq('id', Number(id))
      .select()
      .single();
    if (error) throw error;
    return {
      id: String(data.id),
      descricao: data.descricao,
      valor: Number(data.valor),
      data_vencimento: data.data_vencimento,
      status: data.status,
      posto_id: data.posto_id
    };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('Divida')
      .delete()
      .eq('id', Number(id));
    if (error) throw error;
  }
};

export const solvencyService = {
  async getProjection(postoId?: number): Promise<SolvencyProjection> {
    const today = new Date();
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);
    const last30DaysStr = last30Days.toISOString().split('T')[0];

    // 1. Saldo Real (Vendas Cartão/Pix dos últimos dias)
    // Vamos considerar os últimos 7 dias de vendas não registradas como "em trânsito"
    const last7Days = new Date(today);
    last7Days.setDate(today.getDate() - 7);
    const last7DaysStr = last7Days.toISOString().split('T')[0];

    // Buscamos recebimentos de Cartão (1, 2) e Pix (3) que possuem fechamento vinculado
    let queryRec = supabase
      .from('Recebimento')
      .select('valor, Fechamento!inner(data, posto_id)')
      .in('forma_pagamento_id', [1, 2, 3])
      .gte('Fechamento.data', last7DaysStr);

    if (postoId) {
      queryRec = queryRec.eq('Fechamento.posto_id', postoId);
    }

    const { data: recebimentos, error: recError } = await queryRec;

    if (recError) throw recError;
    const saldoAtual = recebimentos?.reduce((acc, r) => acc + Number(r.valor), 0) || 0;

    // 2. Média Diária (Faturamento Líquido dos últimos 30 dias)
    let queryFech = supabase
      .from('Fechamento')
      .select('total_vendas')
      .gte('data', last30DaysStr);

    if (postoId) {
      queryFech = queryFech.eq('posto_id', postoId);
    }

    const { data: fechamentos, error: fError } = await queryFech;

    if (fError) throw fError;
    const totalVendas30 = fechamentos?.reduce((acc, f) => acc + Number(f.total_vendas), 0) || 0;
    const mediaDiaria = totalVendas30 / 30;

    // 3. Dívidas Pendentes
    const dividas = await dividaService.getAll(postoId);
    const pendentes = dividas.filter(d => d.status === 'pendente');

    const proximasParcelas: SolvencyStatus[] = pendentes.map(d => {
      const vencimento = new Date(d.data_vencimento);
      const diffTime = vencimento.getTime() - today.getTime();
      const diasAteVencimento = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // Saldo Projetado = (Saldo Atual) + (Média Diária * Dias até vencimento)
      const saldoProjetadoNoVencimento = saldoAtual + (mediaDiaria * diasAteVencimento);
      const coberturaPorcentagem = Math.min(100, (saldoProjetadoNoVencimento / d.valor) * 100);

      let status: 'verde' | 'amarelo' | 'vermelho' = 'vermelho';
      let mensagem = '';
      let deficitProjetado = 0;

      if (saldoAtual >= d.valor) {
        status = 'verde';
        mensagem = `Parcela de R$ ${d.valor.toLocaleString('pt-BR')} coberta.`;
      } else if (saldoProjetadoNoVencimento >= d.valor) {
        status = 'amarelo';
        const faltam = d.valor - saldoAtual;
        mensagem = `Faltam R$ ${faltam.toLocaleString('pt-BR')} para cobrir a parcela. Média atual: R$ ${mediaDiaria.toLocaleString('pt-BR')}/dia. Status: No caminho.`;
      } else {
        status = 'vermelho';
        deficitProjetado = d.valor - saldoProjetadoNoVencimento;
        mensagem = `Atenção: Saldo insuficiente para ${d.descricao}. Déficit projetado: R$ ${deficitProjetado.toLocaleString('pt-BR')}.`;
      }

      return {
        dividaId: d.id,
        descricao: d.descricao,
        valor: d.valor,
        dataVencimento: d.data_vencimento,
        status,
        mensagem,
        deficitProjetado: deficitProjetado > 0 ? deficitProjetado : undefined,
        diasAteVencimento,
        coberturaPorcentagem
      };
    });

    return {
      saldoAtual,
      mediaDiaria,
      proximasParcelas
    };
  }
};
export const api = {
  combustivel: combustivelService,
  bomba: bombaService,
  bico: bicoService,
  frentista: frentistaService,
  leitura: leituraService,
  formaPagamento: formaPagamentoService,
  maquininha: maquininhaService,
  fechamento: fechamentoService,
  recebimento: recebimentoService,
  fechamentoFrentista: fechamentoFrentistaService,
  estoque: estoqueService,
  compra: compraService,
  fornecedor: fornecedorService,
  turno: turnoService,
  emprestimo: emprestimoService,
  parcela: parcelaService,
  dashboard: dashboardService,
  salesAnalysis: salesAnalysisService,
  despesa: despesaService,
  notification: notificationService,
  divida: dividaService,
  solvency: solvencyService,
};

export default api;

// ============================================
// FUNÇÕES DE COMPATIBILIDADE COM COMPONENTES LEGADOS
// ============================================
// Estas funções adaptam os dados do Supabase para o formato
// esperado pelos componentes existentes

export async function fetchSettingsData(postoId?: number) {
  const [combustiveis, bicos, turnos, formasPagamento] = await Promise.all([
    combustivelService.getAll(postoId),
    bicoService.getWithDetails(postoId),
    turnoService.getAll(postoId),
    formaPagamentoService.getAll(postoId),
  ]);

  return {
    products: combustiveis.map(c => ({
      id: String(c.id),
      name: c.nome,
      type: (c.codigo === 'ET' ? 'Biocombustível' : c.codigo === 'S10' ? 'Diesel' : 'Combustível') as 'Combustível' | 'Biocombustível' | 'Diesel',
      price: c.preco_venda,
    })),
    nozzles: bicos.map(b => ({
      id: String(b.id),
      number: String(b.numero),
      productName: b.combustivel?.nome || 'N/A',
      tankSource: b.bomba?.nome || 'N/A',
    })),
    shifts: turnos.map(t => ({
      id: String(t.id),
      name: t.nome,
      start: t.horario_inicio || '06:00',
      end: t.horario_fim || '14:00',
      iconType: (t.nome.toLowerCase().includes('manhã') ? 'sun' :
        t.nome.toLowerCase().includes('tarde') ? 'sunset' : 'moon') as 'sun' | 'sunset' | 'moon',
    })),
    paymentMethods: formasPagamento.map(fp => ({
      id: String(fp.id),
      name: fp.nome,
      type: fp.tipo as 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'outros',
      tax: fp.taxa || 0,
      active: fp.ativo
    })),
  };
}

export async function fetchDashboardData(
  dateFilter: string = 'hoje',
  frentistaId: number | null = null,
  turnoId: number | null = null,
  postoId?: number
) {
  const [estoque, frentistas, formasPagamento] = await Promise.all([
    estoqueService.getAll(postoId),
    frentistaService.getAll(postoId),
    formaPagamentoService.getAll(postoId),
  ]);

  // Calcula o range de data baseado no filtro
  const hoje = new Date();
  let dataInicio: string;
  let dataFim: string = hoje.toISOString().split('T')[0];

  switch (dateFilter) {
    case 'ontem':
      const ontem = new Date(hoje);
      ontem.setDate(ontem.getDate() - 1);
      dataInicio = ontem.toISOString().split('T')[0];
      dataFim = dataInicio;
      break;
    case 'semana':
      const semanaAtras = new Date(hoje);
      semanaAtras.setDate(semanaAtras.getDate() - 7);
      dataInicio = semanaAtras.toISOString().split('T')[0];
      break;
    case 'mes':
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      dataInicio = inicioMes.toISOString().split('T')[0];
      break;
    default: // 'hoje'
      dataInicio = hoje.toISOString().split('T')[0];
  }

  // Otimização: Busca dados em paralelo e limita o range de datas
  const [leiturasData, fechamentosFrentistaHoje] = await Promise.all([
    leituraService.getByDateRange(dataInicio, dataFim, postoId),
    fechamentoFrentistaService.getByDate(dataInicio, postoId)
  ]);

  // Agrega as leituras para o formato SalesSummary esperado pelo dashboard antigo (compatibilidade)
  const totalLitrosVendas = leiturasData.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
  const totalValorVendas = leiturasData.reduce((acc, l) => acc + (l.valor_total || 0), 0);

  const porCombustivelVendas = leiturasData.reduce((acc, l) => {
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

  const vendas = {
    data: dataInicio,
    totalLitros: totalLitrosVendas,
    totalVendas: totalValorVendas,
    porCombustivel: Object.values(porCombustivelVendas),
    leituras: leiturasData
  };

  // Cores padrão para combustíveis
  const coresCombs: Record<string, string> = {
    'GC': '#22c55e',
    'GA': '#3b82f6',
    'ET': '#eab308',
    'S10': '#ef4444',
  };

  // Cores padrão para formas de pagamento
  const coresFormas: Record<string, string> = {
    'cartao': '#3b82f6',
    'digital': '#22c55e',
    'fisico': '#eab308',
  };

  // FuelData para gráfico
  const fuelData = estoque.map(e => ({
    name: e.combustivel?.nome || 'N/A',
    volume: e.quantidade_atual,
    maxCapacity: e.capacidade_tanque,
    color: e.combustivel?.cor || coresCombs[e.combustivel?.codigo || ''] || '#888',
  }));

  // PaymentData real (agregado dos fechamentos ou pagamentos do dia)
  // Como simplificação, se não houver registros de recebimento, retornamos vazio/zeros em vez de simulação
  const paymentData = formasPagamento.map((fp, idx) => ({
    name: fp.nome,
    percentage: 0,
    value: 0,
    color: coresFormas[fp.tipo] || ['#3b82f6', '#22c55e', '#eab308', '#f97316'][idx % 4],
  }));

  // ClosingsData - Lista consolidada de status dos frentistas
  // Mapeia os fechamentos por frentista, filtrando pelo turno se necessário
  const fechamentosMap = new Map();
  fechamentosFrentistaHoje.forEach((ff) => {
    const matchesTurno = !turnoId || (ff.fechamento as any)?.turno_id === turnoId;
    if (matchesTurno) {
      fechamentosMap.set(ff.frentista_id, ff);
    }
  });

  // Filtra frentistas se houver filtro específico
  const frentistasToShow = frentistaId
    ? frentistas.filter((f) => f.id === frentistaId)
    : frentistas;

  const closingsData = frentistasToShow.map((f, idx) => {
    const fechamento = fechamentosMap.get(f.id);
    let status: 'OK' | 'Divergente' | 'Aberto' = 'Aberto';
    let totalSales = 0;

    if (fechamento) {
      // Calcula total a partir dos valores de pagamento
      totalSales =
        (fechamento.valor_cartao || 0) +
        (fechamento.valor_nota || 0) +
        (fechamento.valor_pix || 0) +
        (fechamento.valor_dinheiro || 0);

      // Status baseado na diferença (falta de caixa)
      const diferenca = Math.abs(fechamento.diferenca || 0);
      status = diferenca === 0 ? 'OK' : diferenca > 50 ? 'Divergente' : 'OK';
    }

    return {
      id: String(f.id),
      name: f.nome,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(f.nome)}&background=random&size=128`,
      shift:
        (fechamento?.fechamento as any)?.turno?.nome ||
        (turnoId ? 'Aguardando' : 'Pendente'),
      totalSales: totalSales,
      status: status,
    };
  });

  // Calculate estimated profit
  let totalLucroEstimado = 0;
  if (vendas.porCombustivel) {
    totalLucroEstimado = vendas.porCombustivel.reduce((acc, item) => {
      // Find cost in estoque
      const est = estoque.find(e => e.combustivel_id === item.combustivel.id);
      const custoMedio = est?.custo_medio || 0;
      // Using 0.45 as estimated operational cost per liter (simplified for dashboard)
      const despesaOp = 0.45;

      const custoTotal = custoMedio + despesaOp;
      const lucroItem = item.valor - (item.litros * custoTotal);

      return acc + lucroItem;
    }, 0);
  }

  // PerformanceData - Calculado com base no lucro estimado proporcional às vendas
  const totalVendasPeriodo = vendas.totalVendas || 0;
  const margemMedia = totalVendasPeriodo > 0 ? totalLucroEstimado / totalVendasPeriodo : 0;

  const performanceData = closingsData
    .map((c) => {
      const profit = c.totalSales * margemMedia;
      return {
        id: c.id,
        name: c.name,
        avatar: c.avatar,
        metric: 'Lucro Est.',
        value: `R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        subValue: `Vendas: R$ ${c.totalSales.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`,
        type: (c.totalSales > 0 ? 'ticket' : 'volume') as 'ticket' | 'volume' | 'divergence',
        rawProfit: profit
      };
    })
    .sort((a, b) => b.rawProfit - a.rawProfit)
    .slice(0, 5)
    .map(item => ({
      id: item.id,
      name: item.name,
      avatar: item.avatar,
      metric: item.metric,
      value: item.value,
      subValue: item.subValue,
      type: item.type
    }));

  return {
    fuelData,
    paymentData,
    closingsData,
    performanceData,
    kpis: {
      totalSales: vendas.totalVendas || 0,
      avgTicket: vendas.totalLitros > 0 ? vendas.totalVendas / vendas.totalLitros * 30 : 0,
      totalDivergence: 0,
      totalVolume: vendas.totalLitros || 0,
      totalProfit: totalLucroEstimado,
    },
  };
}

export async function fetchClosingData(postoId?: number) {
  const [frentistas, combustiveis, bicos] = await Promise.all([
    frentistaService.getAll(postoId),
    combustivelService.getAll(postoId),
    bicoService.getWithDetails(postoId),
  ]);

  const hoje = new Date().toISOString().split('T')[0];
  const vendas = await leituraService.getSalesSummaryByDate(hoje, postoId);

  // Mapeamento de cores
  const colorClasses: Record<string, string> = {
    'GC': 'bg-green-100 text-green-700',
    'GA': 'bg-blue-100 text-blue-700',
    'ET': 'bg-yellow-100 text-yellow-700',
    'S10': 'bg-red-100 text-red-700',
  };

  const iconTypes: Record<string, 'pump' | 'leaf' | 'truck'> = {
    'GC': 'pump',
    'GA': 'pump',
    'ET': 'leaf',
    'S10': 'truck',
  };

  // summaryData - FuelSummary[]
  const summaryData = vendas.porCombustivel.map(pc => ({
    id: String(pc.combustivel.id),
    name: pc.combustivel.nome,
    code: pc.combustivel.codigo,
    iconType: iconTypes[pc.combustivel.codigo] || 'pump',
    totalValue: pc.valor,
    volume: pc.litros,
    avgPrice: pc.litros > 0 ? pc.valor / pc.litros : pc.combustivel.preco_venda || 0,
    color: pc.combustivel.cor || '#888',
    colorClass: colorClasses[pc.combustivel.codigo] || 'bg-gray-100 text-gray-700',
  }));

  // Se não houver leituras, criar dados zerados
  if (summaryData.length === 0) {
    combustiveis.forEach(c => {
      summaryData.push({
        id: String(c.id),
        name: c.nome,
        code: c.codigo,
        iconType: iconTypes[c.codigo] || 'pump',
        totalValue: 0,
        volume: 0,
        avgPrice: c.preco_venda || 0,
        color: c.cor || '#888',
        colorClass: colorClasses[c.codigo] || 'bg-gray-100 text-gray-700',
      });
    });
  }

  // nozzleData - NozzleData[]
  const nozzleData = bicos.map(b => {
    const leitura = vendas.leituras?.find(l => l.bico_id === b.id);
    const volume = leitura?.litros_vendidos || 0;
    const total = leitura?.valor_total || 0;
    const hasNoSales = !leitura || volume === 0;

    return {
      id: String(b.id),
      bico: b.numero,
      productCode: b.combustivel?.codigo || 'N/A',
      productName: b.combustivel?.nome || 'N/A',
      initialReading: leitura?.leitura_inicial || 0,
      finalReading: leitura?.leitura_final || 0,
      price: leitura?.preco_litro || b.combustivel?.preco_venda || 0,
      volume: volume,
      total: total,
      status: (hasNoSales ? 'NoSales' : 'OK') as 'OK' | 'Alert' | 'NoSales',
    };
  });

  // attendantsData - ClosingAttendant[]
  const totalVendasDia = summaryData.reduce((acc, s) => acc + s.totalValue, 0);
  const valorPorFrentista = frentistas.length > 0 ? totalVendasDia / frentistas.length : 0;

  const attendantsData = frentistas.map((f, idx) => ({
    id: String(f.id),
    name: f.nome,
    avatar: `/avatars/${f.id}.jpg`,
    shift: (['Manhã', 'Tarde', 'Noite'])[idx % 3],
    expectedValue: valorPorFrentista,
    declared: {
      card: 0,
      note: 0,
      pix: 0,
      cash: 0,
    },
    observation: '',
    hasHistory: false,
  }));

  return { summaryData, nozzleData, attendantsData };
}

export async function fetchAttendantsData(postoId?: number) {
  // Query frentistas directly from the table (including inactive for management screen)
  let query = supabase
    .from('Frentista')
    .select('*')
    .order('nome');

  if (postoId) {
    query = query.eq('posto_id', postoId);
  }

  const { data: frentistasData, error: frentistasError } = await query;

  if (frentistasError) {
    console.error('Error fetching frentistas:', frentistasError);
  }

  const frentistas = (frentistasData || []).map((f: any) => ({ ...f, email: null }));

  const turnos = await turnoService.getAll(postoId);

  // Buscar histórico de fechamentos por frentista
  const fechamentos = await Promise.all(
    frentistas.map(f => fechamentoFrentistaService.getHistoricoDiferencas(f.id, 30))
  );

  // Cores para avatares
  const avatarColors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-red-100 text-red-700',
  ];

  // Buscar caixas abertos hoje (Prioridade 1)
  const hojeStr = new Date().toISOString().split('T')[0];
  const { data: caixasAbertos } = await supabase
    .from('FechamentoFrentista')
    .select('frentista_id, fechamento:Fechamento!inner(status, data, turno_id)')
    .eq('fechamento.status', 'ABERTO')
    .gte('fechamento.data', `${hojeStr}T00:00:00`)
    .lte('fechamento.data', `${hojeStr}T23:59:59`);

  const mapCaixaAberto = new Map();
  if (caixasAbertos) {
    caixasAbertos.forEach((c: any) => {
      const turnoId = c.fechamento.turno_id;
      const turnoNome = turnos.find(t => t.id === turnoId)?.nome;
      if (turnoNome) mapCaixaAberto.set(c.frentista_id, turnoNome);
    });
  }

  // Lista de frentistas no formato AttendantProfile
  const list = frentistas.map((f, idx) => {
    const hist = fechamentos[idx] || [];
    const totalDiff = hist.reduce((acc, h) => {
      const diff = ((h.valor_cartao || 0) + (h.valor_nota || 0) + (h.valor_pix || 0) + (h.valor_dinheiro || 0)) - (h.valor_conferido || 0);
      return acc + diff;
    }, 0);
    const divergenceRate = hist.length > 0 ? Math.round((hist.filter(h => {
      const diff = ((h.valor_cartao || 0) + (h.valor_nota || 0) + (h.valor_pix || 0) + (h.valor_dinheiro || 0)) - (h.valor_conferido || 0);
      return diff !== 0;
    }).length / hist.length) * 100) : 0;

    // Pega iniciais do nome
    // Identifica o turno
    const turnoAtualId = (f as any).turno_id;
    const turnoAtualNome = turnoAtualId ? turnos.find(t => t.id === turnoAtualId)?.nome : null;
    const turnoHistorico = (hist[0]?.fechamento as any)?.turno?.nome;

    // Prioridade: 1. Aberto Agora, 2. Fixo no Cadastro, 3. Histórico
    const turnoAberto = mapCaixaAberto.get(f.id);
    const displayShift = turnoAberto || turnoAtualNome || turnoHistorico || 'Indefinido';

    // Pega iniciais do nome
    const nameParts = f.nome.trim().split(/\s+/);
    const initials = nameParts.length >= 2 && nameParts[0] && nameParts[nameParts.length - 1]
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
      : f.nome.trim().substring(0, 2);

    // Data de admissão formatada
    const admDate = f.data_admissao ? new Date(f.data_admissao) : new Date();
    const sinceDate = admDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

    return {
      id: String(f.id),
      name: f.nome,
      initials: initials.toUpperCase(),
      phone: f.telefone || '(00) 00000-0000',
      shift: displayShift,
      status: (f.ativo ? 'Ativo' : 'Inativo') as 'Ativo' | 'Inativo',
      admissionDate: f.data_admissao || 'N/A',
      sinceDate: sinceDate,
      cpf: f.cpf || 'XXX.XXX.XXX-XX',
      divergenceRate: divergenceRate,
      riskLevel: (divergenceRate <= 10 ? 'Baixo Risco' : divergenceRate <= 30 ? 'Médio Risco' : 'Alto Risco') as 'Baixo Risco' | 'Médio Risco' | 'Alto Risco',
      avatarColorClass: avatarColors[idx % avatarColors.length],
      email: f.email || 'Não cadastrado',
      posto_id: f.posto_id,
      turno_id: f.turno_id, // Add this line
    };
  });

  // Histórico geral formatado usando turno real se disponível
  const allHistories = fechamentos.flat();
  const history = allHistories.slice(0, 10).map((h) => ({
    id: String(h.id),
    date: h.fechamento?.data || 'N/A',
    shift: (h.fechamento as any)?.turno?.nome || 'N/A',
    value: ((h.valor_cartao || 0) + (h.valor_nota || 0) + (h.valor_pix || 0) + (h.valor_dinheiro || 0)) - (h.valor_conferido || 0),
    status: ((((h.valor_cartao || 0) + (h.valor_nota || 0) + (h.valor_pix || 0) + (h.valor_dinheiro || 0)) - (h.valor_conferido || 0)) === 0 ? 'OK' : 'Divergente') as 'OK' | 'Divergente',
  }));

  return { list, history };
}

export async function fetchInventoryData(postoId?: number) {
  const dataInicioAnalise = new Date();
  dataInicioAnalise.setDate(dataInicioAnalise.getDate() - 7);

  // Build leituras query with proper posto_id filter
  let leiturasQuery = supabase
    .from('Leitura')
    .select('*, bico:Bico(combustivel_id), combustivel:Bico(Combustivel(nome))')
    .gte('data', dataInicioAnalise.toISOString().split('T')[0])
    .order('data', { ascending: false })
    .limit(100);

  if (postoId) {
    leiturasQuery = leiturasQuery.eq('posto_id', postoId);
  }

  const [estoque, compras, leiturasRecentes] = await Promise.all([
    estoqueService.getAll(postoId),
    compraService.getAll(postoId, dataInicioAnalise.toISOString().split('T')[0]),
    leiturasQuery
  ]);

  const leituras = leiturasRecentes.data || [];

  // Map código para icon e color
  const iconMap: Record<string, 'pump' | 'leaf' | 'truck'> = {
    'GC': 'pump',
    'GA': 'pump',
    'ET': 'leaf',
    'S10': 'truck',
  };

  const colorMap: Record<string, string> = {
    'GC': 'green',
    'GA': 'blue',
    'ET': 'yellow',
    'S10': 'gray',
  };

  // Prepara dados para o gráfico de 7 dias
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short' });

    const salesDay = leituras.filter(l => l.data === dayStr).reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
    const entryDay = compras.filter(c => c.data === dayStr).reduce((acc, c) => acc + c.quantidade_litros, 0);

    return { day: dayLabel, sales: salesDay, entry: entryDay };
  }).reverse();

  // Escala para porcentagem do gráfico (opcional ou usa valores reais e o front escala)
  const maxVal = Math.max(...last7Days.map(d => Math.max(d.sales, d.entry)), 100);
  const chartData = last7Days.map(d => ({
    ...d,
    salesPerc: (d.sales / maxVal) * 100,
    entryPerc: (d.entry / maxVal) * 100
  }));

  // Items - InventoryItem[]
  const items = estoque.map(e => {
    const percentage = Math.round((e.quantidade_atual / e.capacidade_tanque) * 100);
    const status = percentage < 10 ? 'CRÍTICO' : percentage < 20 ? 'BAIXO' : 'OK';
    const code = e.combustivel?.codigo || 'N/A';

    // Filtra dados do período para este combustível
    const vendasComb = leituras.filter(l => (l.bico as any)?.combustivel_id === e.combustivel_id);
    const comprasComb = compras.filter(c => c.combustivel_id === e.combustivel_id);

    const volumeVendido = vendasComb.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
    const volumeComprado = comprasComb.filter(c => c.data >= dataInicioAnalise.toISOString().split('T')[0]).reduce((acc, c) => acc + c.quantidade_litros, 0);

    const mediaDiaria = volumeVendido / 7;
    const custoMedio = e.custo_medio || comprasComb[0]?.custo_por_litro || 0;
    const precoVenda = e.combustivel?.preco_venda || 0;

    return {
      id: String(e.id),
      code: code,
      name: e.combustivel?.nome || 'N/A',
      volume: e.quantidade_atual,
      capacity: e.capacidade_tanque,
      percentage: percentage,
      status: status as 'OK' | 'BAIXO' | 'CRÍTICO',
      daysRemaining: mediaDiaria > 0 ? Math.floor(e.quantidade_atual / mediaDiaria) : 99,
      color: colorMap[code] || 'gray',
      iconType: iconMap[code] || 'pump',
      costPrice: custoMedio,
      sellPrice: precoVenda,
      // Reconciliação
      previousStock: e.quantidade_atual - volumeComprado + volumeVendido,
      totalPurchases: volumeComprado,
      totalSales: volumeVendido,
      lossOrGain: 0, // Por enquanto zero, precisaria de leitura de tanque real
    };
  });

  // Financeiro Global do Estoque
  const totalCost = items.reduce((acc, i) => acc + (i.volume * i.costPrice), 0);
  const totalSell = items.reduce((acc, i) => acc + (i.volume * i.sellPrice), 0);
  const projectedProfit = totalSell - totalCost;

  // Alerts - InventoryAlert[]
  const alerts = estoque
    .filter(e => (e.quantidade_atual / e.capacidade_tanque) < 0.2)
    .map(e => {
      const percentage = (e.quantidade_atual / e.capacidade_tanque) * 100;
      const isCritical = percentage < 10;

      return {
        id: String(e.id),
        type: (isCritical ? 'critical' : 'warning') as 'critical' | 'warning',
        title: isCritical ? 'Nível Crítico!' : 'Estoque Baixo',
        message: `${e.combustivel?.nome || 'Combustível'} está com apenas ${Math.round(percentage)}% da capacidade.`,
        actionPrimary: 'Registrar Compra',
        actionSecondary: isCritical ? 'Ver Fornecedores' : undefined,
      };
    });

  // Transactions - InventoryTransaction[]
  const purchaseTransactions = compras.slice(0, 10).map((c) => ({
    id: `compra-${c.id}`,
    date: new Date(c.data).toLocaleDateString('pt-BR') + ' 08:00',
    type: 'Compra' as const,
    product: c.combustivel?.nome || 'N/A',
    quantity: c.quantidade_litros,
    responsible: c.fornecedor?.nome || 'Distribuidora',
    status: 'Recebido' as const,
  }));

  const salesTransactions = leituras.slice(0, 10).map((l) => ({
    id: `venda-${l.id}`,
    date: new Date(l.data).toLocaleDateString('pt-BR') + ' 22:00',
    type: 'Venda' as const,
    product: (l.combustivel as any)?.Combustivel?.nome || 'N/A',
    quantity: -(l.litros_vendidos || 0),
    responsible: 'Sistema',
    status: 'Concluído' as const,
  }));

  const transactions = [...purchaseTransactions, ...salesTransactions]
    .sort((a, b) => {
      const dateA = a.date.split('/').reverse().join('-');
      const dateB = b.date.split('/').reverse().join('-');
      return dateB.localeCompare(dateA);
    })
    .slice(0, 15);

  return { items, alerts, transactions, chartData, summary: { totalCost, totalSell, projectedProfit } };
}

export async function fetchProfitabilityData(year: number = new Date().getFullYear(), month: number = new Date().getMonth() + 1, postoId?: number) {
  const inicioMesStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const fimMesStr = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

  let queryLeitura = supabase
    .from('Leitura')
    .select('*, bico:Bico(combustivel_id)')
    .gte('data', inicioMesStr);

  if (postoId) queryLeitura = queryLeitura.eq('posto_id', postoId);

  const [estoque, leiturasMes, despesas] = await Promise.all([
    estoqueService.getAll(postoId),
    queryLeitura,
    despesaService.getByMonth(year, month, postoId)
  ]);


  const leituras = leiturasMes.data || [];
  const totalDespesas = despesas.reduce((acc, d) => acc + Number(d.valor), 0);
  const totalVolumeVendido = leituras.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);

  // Cálculo de Despesa Operacional Real por Litro (Fórmula Planilha Posto Jorro 2025: H22 = H19/F11)
  let despOperacional = totalVolumeVendido > 0 ? totalDespesas / totalVolumeVendido : 0;

  // Fallback para configuração se não houver despesas registradas no mês
  if (despOperacional === 0) {
    despOperacional = await configuracaoService.getValorNumerico('despesa_operacional_litro', 0.45);
  }

  return estoque.map(e => {
    const vendasComb = leituras.filter(l => (l.bico as any)?.combustivel_id === e.combustivel_id);
    const volumeVendido = vendasComb.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
    const receitaBruta = vendasComb.reduce((acc, l) => acc + (l.valor_total || 0), 0);

    const custoMedio = e.custo_medio || 0;
    const custoTotalL = custoMedio + despOperacional;

    const lucroTotal = receitaBruta - (volumeVendido * custoTotalL);
    const margemLiquidaL = volumeVendido > 0 ? lucroTotal / volumeVendido : 0;
    const margemBrutaL = (e.combustivel?.preco_venda || 0) - custoMedio;

    return {
      id: e.id,
      combustivelId: e.combustivel_id,
      nome: e.combustivel?.nome || 'N/A',
      codigo: e.combustivel?.codigo || 'N/A',
      custoMedio,
      despOperacional,
      custoTotalL,
      precoVenda: e.combustivel?.preco_venda || 0,
      volumeVendido,
      receitaBruta,
      lucroTotal,
      margemLiquidaL,
      margemBrutaL,
      cor: e.combustivel?.cor || 'gray'
    };
  });
}

// ============================================
// VENDA PRODUTOS
// ============================================

export const vendaProdutoService = {
  async getByFrentistaAndDate(frentistaId: number, date: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('VendaProduto')
      .select('*, Produto(nome)')
      .eq('frentista_id', frentistaId)
      .eq('data', date);
    if (error) throw error;
    return data;
  }
};

// ============================================
// ESCALA / FOLGAS
// ============================================

export const escalaService = {
  async getAll(_postoId?: number): Promise<any[]> {
    // Nota: A tabela Escala não possui campo posto_id
    // Futuramente, filtrar pelo posto_id dos frentistas relacionados
    try {
      const { data, error } = await (supabase as any)
        .from('Escala')
        .select('*, Frentista(nome)')
        .order('data', { ascending: true });

      if (error) {
        console.warn('Erro ao buscar escalas (tabela pode não existir):', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn('Erro ao buscar escalas:', error);
      return [];
    }
  },

  async getByMonth(month: number, year: number, _postoId?: number): Promise<any[]> {
    // Nota: A tabela Escala não possui campo posto_id
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];

    try {
      const { data, error } = await (supabase as any)
        .from('Escala')
        .select('*, Frentista(nome)')
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: true });

      if (error) {
        console.warn('Erro ao buscar escalas por mês (tabela pode não existir):', error);
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn('Erro ao buscar escalas por mês:', error);
      return [];
    }
  },

  async create(escala: { frentista_id: number, data: string, tipo: 'FOLGA' | 'TRABALHO', turno_id?: number, observacao?: string, posto_id?: number }) {
    const { data, error } = await supabase
      .from('Escala')
      .insert(escala)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, updates: any) {
    const { data, error } = await supabase
      .from('Escala')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: number) {
    const { error } = await supabase.from('Escala').delete().eq('id', id);
    if (error) throw error;
  }
};

// ============================================
// CLIENTES (FIADO)
// ============================================

export const clienteService = {
  async getAll(postoId?: number): Promise<any[]> {
    let query = (supabase as any)
      .from('Cliente')
      .select('*')
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async getAllWithSaldo(postoId?: number): Promise<any[]> {
    let query = (supabase as any)
      .from('Cliente')
      .select(`
        *,
        notas:NotaFrentista(id, valor, status, data)
      `)
      .eq('ativo', true);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome');
    if (error) throw error;
    return data || [];
  },

  async getById(id: number): Promise<any | null> {
    const { data, error } = await supabase
      .from('Cliente')
      .select(`
        *,
        notas:NotaFrentista(
          *,
          frentista:Frentista(id, nome)
        )
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async getDevedores(postoId?: number): Promise<any[]> {
    let query = (supabase as any)
      .from('Cliente')
      .select('*')
      .eq('ativo', true)
      .gt('saldo_devedor', 0);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('saldo_devedor', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(cliente: {
    nome: string;
    documento?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    limite_credito?: number;
    posto_id: number;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('Cliente')
      .insert(cliente)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, updates: {
    nome?: string;
    documento?: string;
    telefone?: string;
    email?: string;
    endereco?: string;
    limite_credito?: number;
    ativo?: boolean;
    bloqueado?: boolean;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('Cliente')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    // Soft delete
    const { error } = await supabase
      .from('Cliente')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw error;
  },

  async search(termo: string, postoId?: number): Promise<any[]> {
    let query = (supabase as any)
      .from('Cliente')
      .select('*')
      .eq('ativo', true)
      .or(`nome.ilike.%${termo}%,documento.ilike.%${termo}%,telefone.ilike.%${termo}%`);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('nome').limit(20);
    if (error) throw error;
    return data || [];
  }
};

// ============================================
// NOTAS FRENTISTA (FIADO)
// ============================================

export const notaFrentistaService = {
  async getAll(postoId?: number): Promise<any[]> {
    let query = (supabase as any)
      .from('NotaFrentista')
      .select(`
        *,
        cliente:Cliente(id, nome, documento),
        frentista:Frentista(id, nome)
      `);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getPendentes(postoId?: number): Promise<any[]> {
    let query = (supabase as any)
      .from('NotaFrentista')
      .select(`
        *,
        cliente:Cliente(id, nome, documento, telefone),
        frentista:Frentista(id, nome)
      `)
      .eq('status', 'pendente');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getByCliente(clienteId: number): Promise<any[]> {
    const { data, error } = await (supabase as any)
      .from('NotaFrentista')
      .select(`
        *,
        frentista:Frentista(id, nome)
      `)
      .eq('cliente_id', clienteId)
      .order('data', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getByDateRange(dataInicio: string, dataFim: string, postoId?: number): Promise<any[]> {
    let query = (supabase as any)
      .from('NotaFrentista')
      .select(`
        *,
        cliente:Cliente(id, nome),
        frentista:Frentista(id, nome)
      `)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async create(nota: {
    cliente_id: number;
    frentista_id: number;
    fechamento_frentista_id?: number;
    valor: number;
    descricao?: string;
    data?: string;
    posto_id: number;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .insert({
        ...nota,
        data: nota.data || new Date().toISOString().split('T')[0],
        status: 'pendente'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async registrarPagamento(id: number, formaPagamento: string, observacoes?: string): Promise<any> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .update({
        status: 'pago',
        data_pagamento: new Date().toISOString().split('T')[0],
        forma_pagamento: formaPagamento,
        observacoes
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async cancelar(id: number, observacoes?: string): Promise<any> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .update({
        status: 'cancelado',
        observacoes
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, updates: {
    valor?: number;
    descricao?: string;
    observacoes?: string;
  }): Promise<any> {
    const { data, error } = await supabase
      .from('NotaFrentista')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: number): Promise<void> {
    const { error } = await supabase
      .from('NotaFrentista')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Resumo de fiado
  async getResumo(postoId?: number): Promise<{
    totalPendente: number;
    totalClientes: number;
    notasPendentes: number;
    maiorDevedor: { nome: string; valor: number } | null;
  }> {
    let query = (supabase as any)
      .from('NotaFrentista')
      .select(`
        valor,
        cliente:Cliente(id, nome)
      `)
      .eq('status', 'pendente');

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const notas = data || [];
    const totalPendente = notas.reduce((acc: number, n: any) => acc + n.valor, 0);

    // Agrupa por cliente
    const porCliente: Record<string, { nome: string; valor: number }> = {};
    notas.forEach((n: any) => {
      const clienteId = n.cliente?.id?.toString() || 'unknown';
      const clienteNome = n.cliente?.nome || 'Desconhecido';
      if (!porCliente[clienteId]) {
        porCliente[clienteId] = { nome: clienteNome, valor: 0 };
      }
      porCliente[clienteId].valor += n.valor;
    });

    const clientesUnicos = Object.keys(porCliente).length;
    const maiorDevedor = Object.values(porCliente).sort((a, b) => b.valor - a.valor)[0] || null;

    return {
      totalPendente,
      totalClientes: clientesUnicos,
      notasPendentes: notas.length,
      maiorDevedor
    };
  }
};

// ============================================

