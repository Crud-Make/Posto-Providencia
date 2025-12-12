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
  InsertTables,
  UpdateTables,
} from './database.types';

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
// COMBUSTÍVEIS
// ============================================

export const combustivelService = {
  async getAll(): Promise<Combustivel[]> {
    const { data, error } = await supabase
      .from('Combustivel')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data || [];
  },

  async getById(id: number): Promise<Combustivel | null> {
    const { data, error } = await supabase
      .from('Combustivel')
      .select('*')
      .eq('id', id)
      .single();
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
  async getAll(): Promise<Bomba[]> {
    const { data, error } = await supabase
      .from('Bomba')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data || [];
  },

  async getWithBicos(): Promise<(Bomba & { bicos: (Bico & { combustivel: Combustivel })[] })[]> {
    const { data, error } = await supabase
      .from('Bomba')
      .select(`
        *,
        bicos:Bico(
          *,
          combustivel:Combustivel(*)
        )
      `)
      .eq('ativo', true)
      .order('nome');
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
// BICOS
// ============================================

export const bicoService = {
  async getAll(): Promise<Bico[]> {
    const { data, error } = await supabase
      .from('Bico')
      .select('*')
      .eq('ativo', true)
      .order('numero');
    if (error) throw error;
    return data || [];
  },

  async getWithDetails(): Promise<(Bico & { bomba: Bomba; combustivel: Combustivel })[]> {
    const { data, error } = await supabase
      .from('Bico')
      .select(`
        *,
        bomba:Bomba(*),
        combustivel:Combustivel(*)
      `)
      .eq('ativo', true)
      .order('numero');
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
  async getAll(): Promise<Frentista[]> {
    const { data, error } = await supabase
      .from('Frentista')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    if (error) throw error;
    return data || [];
  },

  async getById(id: number): Promise<Frentista | null> {
    const { data, error } = await supabase
      .from('Frentista')
      .select('*')
      .eq('id', id)
      .single();
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
};

// ============================================
// LEITURAS
// ============================================

export const leituraService = {
  async getByDate(data: string): Promise<(Leitura & { bico: Bico & { combustivel: Combustivel; bomba: Bomba } })[]> {
    const { data: leituras, error } = await supabase
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
      .order('id');
    if (error) throw error;
    return leituras || [];
  },

  async getLastReadingByBico(bicoId: number): Promise<Leitura | null> {
    const { data, error } = await supabase
      .from('Leitura')
      .select('*')
      .eq('bico_id', bicoId)
      .order('data', { ascending: false })
      .limit(1)
      .single();
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    return data;
  },

  async create(leitura: InsertTables<'Leitura'>): Promise<Leitura> {
    // Calcula litros vendidos e valor venda
    const litros_vendidos = leitura.leitura_final - leitura.leitura_inicial;
    const valor_venda = litros_vendidos * leitura.preco_litro;

    const { data, error } = await supabase
      .from('Leitura')
      .insert({
        ...leitura,
        litros_vendidos,
        valor_venda,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, leitura: UpdateTables<'Leitura'>): Promise<Leitura> {
    // Recalcula se necessário
    let updates = { ...leitura };
    if (leitura.leitura_final !== undefined && leitura.leitura_inicial !== undefined && leitura.preco_litro !== undefined) {
      updates.litros_vendidos = leitura.leitura_final - leitura.leitura_inicial;
      updates.valor_venda = updates.litros_vendidos * leitura.preco_litro;
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

  async bulkCreate(leituras: InsertTables<'Leitura'>[]): Promise<Leitura[]> {
    const leiturasWithCalc = leituras.map(l => ({
      ...l,
      litros_vendidos: l.leitura_final - l.leitura_inicial,
      valor_venda: (l.leitura_final - l.leitura_inicial) * l.preco_litro,
    }));

    const { data, error } = await supabase
      .from('Leitura')
      .insert(leiturasWithCalc)
      .select();
    if (error) throw error;
    return data || [];
  },

  // Resumo de vendas por data
  async getSalesSummaryByDate(data: string): Promise<SalesSummary> {
    const leituras = await this.getByDate(data);

    const totalLitros = leituras.reduce((acc, l) => acc + (l.litros_vendidos || 0), 0);
    const totalVendas = leituras.reduce((acc, l) => acc + (l.valor_venda || 0), 0);

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
      acc[codigo].valor += l.valor_venda || 0;
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
  async getAll(): Promise<FormaPagamento[]> {
    const { data, error } = await supabase
      .from('FormaPagamento')
      .select('*')
      .eq('ativo', true)
      .order('nome');
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
};

// ============================================
// MAQUININHAS
// ============================================

export const maquininhaService = {
  async getAll(): Promise<Maquininha[]> {
    const { data, error } = await supabase
      .from('Maquininha')
      .select('*')
      .eq('ativo', true)
      .order('nome');
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
  async getByDate(data: string): Promise<Fechamento | null> {
    const { data: fechamento, error } = await supabase
      .from('Fechamento')
      .select('*')
      .eq('data', data)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return fechamento;
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

  async getRecent(limit = 10): Promise<Fechamento[]> {
    const { data, error } = await supabase
      .from('Fechamento')
      .select('*')
      .order('data', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  async create(fechamento: InsertTables<'Fechamento'>): Promise<Fechamento> {
    const { data, error } = await supabase
      .from('Fechamento')
      .insert(fechamento)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: number, fechamento: UpdateTables<'Fechamento'>): Promise<Fechamento> {
    const { data, error } = await supabase
      .from('Fechamento')
      .update({
        ...fechamento,
        updated_at: new Date().toISOString(),
      })
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

export const fechamentoFreentistaService = {
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
    // Calcula total e diferença
    const total =
      (fechamentoFrentista.valor_cartao || 0) +
      (fechamentoFrentista.valor_nota || 0) +
      (fechamentoFrentista.valor_pix || 0) +
      (fechamentoFrentista.valor_dinheiro || 0);
    const diferenca = total - (fechamentoFrentista.valor_conferido || 0);

    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .insert({
        ...fechamentoFrentista,
        total,
        diferenca,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async bulkCreate(items: InsertTables<'FechamentoFrentista'>[]): Promise<FechamentoFrentista[]> {
    const itemsWithCalc = items.map(item => {
      const total =
        (item.valor_cartao || 0) +
        (item.valor_nota || 0) +
        (item.valor_pix || 0) +
        (item.valor_dinheiro || 0);
      const diferenca = total - (item.valor_conferido || 0);
      return { ...item, total, diferenca };
    });

    const { data, error } = await supabase
      .from('FechamentoFrentista')
      .insert(itemsWithCalc)
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
};

// ============================================
// ESTOQUE
// ============================================

export const estoqueService = {
  async getAll(): Promise<(Estoque & { combustivel: Combustivel })[]> {
    const { data, error } = await supabase
      .from('Estoque')
      .select(`
        *,
        combustivel:Combustivel(*)
      `);
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
  async getAll(): Promise<(Compra & { combustivel: Combustivel; fornecedor: Fornecedor })[]> {
    const { data, error } = await supabase
      .from('Compra')
      .select(`
        *,
        combustivel:Combustivel(*),
        fornecedor:Fornecedor(*)
      `)
      .order('data', { ascending: false });
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
      await estoqueService.update(estoque.id, {
        quantidade_atual: estoque.quantidade_atual + compra.quantidade_litros,
      });
    }

    return data;
  },
};

// ============================================
// FORNECEDORES
// ============================================

export const fornecedorService = {
  async getAll(): Promise<Fornecedor[]> {
    const { data, error } = await supabase
      .from('Fornecedor')
      .select('*')
      .eq('ativo', true)
      .order('nome');
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
  async getAll(): Promise<Turno[]> {
    const { data, error } = await supabase
      .from('Turno')
      .select('*')
      .order('horario_inicio');
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
};

// ============================================
// DASHBOARD / ESTATÍSTICAS
// ============================================

export const dashboardService = {
  async getResumoHoje() {
    const hoje = new Date().toISOString().split('T')[0];

    // Vendas do dia
    const vendas = await leituraService.getSalesSummaryByDate(hoje);

    // Fechamento do dia
    const fechamento = await fechamentoService.getByDate(hoje);

    // Estoque
    const estoque = await estoqueService.getAll();

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

  async getVendasPeriodo(dataInicio: string, dataFim: string) {
    const { data, error } = await supabase
      .from('Leitura')
      .select(`
        data,
        litros_vendidos,
        valor_venda,
        bico:Bico(
          combustivel:Combustivel(codigo, nome)
        )
      `)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data');
    if (error) throw error;
    return data || [];
  },
};

// Export all services
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
  fechamentoFrentista: fechamentoFreentistaService,
  estoque: estoqueService,
  compra: compraService,
  fornecedor: fornecedorService,
  turno: turnoService,
  dashboard: dashboardService,
};

export default api;

// ============================================
// FUNÇÕES DE COMPATIBILIDADE COM COMPONENTES LEGADOS
// ============================================
// Estas funções adaptam os dados do Supabase para o formato
// esperado pelos componentes existentes

export async function fetchSettingsData() {
  const [combustiveis, bicos, turnos] = await Promise.all([
    combustivelService.getAll(),
    bicoService.getWithDetails(),
    turnoService.getAll(),
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
  };
}

export async function fetchDashboardData() {
  const [estoque, frentistas, formasPagamento] = await Promise.all([
    estoqueService.getAll(),
    frentistaService.getAll(),
    formaPagamentoService.getAll(),
  ]);

  const hoje = new Date().toISOString().split('T')[0];
  const vendas = await leituraService.getSalesSummaryByDate(hoje);

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

  // PaymentData simulado (já que não temos recebimentos do dia)
  const totalVendas = vendas.totalVendas || 1; // Evita divisão por 0
  const paymentData = formasPagamento.map((fp, idx) => ({
    name: fp.nome,
    percentage: 100 / formasPagamento.length, // Distribuição igual se não tiver dados
    value: totalVendas / formasPagamento.length,
    color: coresFormas[fp.tipo] || ['#3b82f6', '#22c55e', '#eab308', '#f97316'][idx % 4],
  }));

  // ClosingsData - Lista de fechamentos por frentista (simulado)
  const closingsData = frentistas.map((f, idx) => ({
    id: String(f.id),
    name: f.nome,
    avatar: `/avatars/${f.id}.jpg`,
    shift: ['Manhã', 'Tarde', 'Noite'][idx % 3],
    totalSales: (vendas.totalVendas || 0) / frentistas.length,
    status: (['OK', 'OK', 'Aberto'] as const)[idx % 3],
  }));

  // PerformanceData
  const performanceData = frentistas.slice(0, 3).map((f, idx) => ({
    id: String(f.id),
    name: f.nome,
    avatar: `/avatars/${f.id}.jpg`,
    metric: ['Maior Ticket', 'Maior Volume', 'Menor Divergência'][idx % 3],
    value: ['R$ 250,00', '1.200 L', 'R$ 0,00'][idx % 3],
    subValue: ['Gasolina Comum', 'Etanol', 'Sem divergência'][idx % 3],
    type: (['ticket', 'volume', 'divergence'] as const)[idx % 3],
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
    },
  };
}

export async function fetchClosingData() {
  const [frentistas, combustiveis, bicos] = await Promise.all([
    frentistaService.getAll(),
    combustivelService.getAll(),
    bicoService.getWithDetails(),
  ]);

  const hoje = new Date().toISOString().split('T')[0];
  const vendas = await leituraService.getSalesSummaryByDate(hoje);

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
    const total = leitura?.valor_venda || 0;
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

export async function fetchAttendantsData() {
  const frentistas = await frentistaService.getAll();
  const turnos = await turnoService.getAll();

  // Buscar histórico de fechamentos por frentista
  const fechamentos = await Promise.all(
    frentistas.map(f => fechamentoFreentistaService.getHistoricoDiferencas(f.id, 30))
  );

  // Cores para avatares
  const avatarColors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-orange-100 text-orange-700',
    'bg-red-100 text-red-700',
  ];

  // Lista de frentistas no formato AttendantProfile
  const list = frentistas.map((f, idx) => {
    const hist = fechamentos[idx] || [];
    const totalDiff = hist.reduce((acc, h) => acc + (h.diferenca || 0), 0);
    const divergenceRate = hist.length > 0 ? Math.round((hist.filter(h => (h.diferenca || 0) !== 0).length / hist.length) * 100) : 0;

    // Pega iniciais do nome
    const nameParts = f.nome.split(' ');
    const initials = nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
      : f.nome.substring(0, 2);

    // Data de admissão formatada
    const admDate = f.data_admissao ? new Date(f.data_admissao) : new Date();
    const sinceDate = admDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

    return {
      id: String(f.id),
      name: f.nome,
      initials: initials.toUpperCase(),
      phone: f.telefone || '(00) 00000-0000',
      shift: (['Manhã', 'Tarde', 'Noite'] as const)[idx % 3],
      status: (f.ativo ? 'Ativo' : 'Inativo') as 'Ativo' | 'Inativo',
      admissionDate: f.data_admissao || 'N/A',
      sinceDate: sinceDate,
      cpf: f.cpf || 'XXX.XXX.XXX-XX',
      divergenceRate: divergenceRate,
      riskLevel: (divergenceRate <= 10 ? 'Baixo Risco' : divergenceRate <= 30 ? 'Médio Risco' : 'Alto Risco') as 'Baixo Risco' | 'Médio Risco' | 'Alto Risco',
      avatarColorClass: avatarColors[idx % avatarColors.length],
    };
  });

  // Histórico geral formatado
  const allHistories = fechamentos.flat();
  const history = allHistories.slice(0, 10).map((h, idx) => ({
    id: String(h.id),
    date: h.fechamento?.data || 'N/A',
    shift: (['Manhã', 'Tarde', 'Noite'])[idx % 3],
    value: h.diferenca || 0,
    status: ((h.diferenca || 0) === 0 ? 'OK' : 'Divergente') as 'OK' | 'Divergente',
  }));

  return { list, history };
}

export async function fetchInventoryData() {
  const [estoque, compras] = await Promise.all([
    estoqueService.getAll(),
    compraService.getAll(),
  ]);

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

  // Items - InventoryItem[]
  const items = estoque.map(e => {
    const percentage = Math.round((e.quantidade_atual / e.capacidade_tanque) * 100);
    const status = percentage < 10 ? 'CRÍTICO' : percentage < 20 ? 'BAIXO' : 'OK';
    const code = e.combustivel?.codigo || 'N/A';

    // Busca última compra do combustível para calcular custo médio
    const comprasCombustivel = compras.filter(c => c.combustivel_id === e.combustivel_id);
    const ultimaCompra = comprasCombustivel[0]; // Já ordenado por data desc
    const custoMedio = ultimaCompra?.custo_por_litro || 0;

    // Preço de venda vem do cadastro do combustível
    const precoVenda = e.combustivel?.preco_venda || 0;

    return {
      id: String(e.id),
      code: code,
      name: e.combustivel?.nome || 'N/A',
      volume: e.quantidade_atual,
      capacity: e.capacidade_tanque,
      percentage: percentage,
      status: status as 'OK' | 'BAIXO' | 'CRÍTICO',
      daysRemaining: Math.floor(e.quantidade_atual / 500), // Assume 500L/dia
      color: colorMap[code] || 'gray',
      iconType: iconMap[code] || 'pump',
      // Preços reais
      costPrice: custoMedio,
      sellPrice: precoVenda,
    };
  });

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
  const transactions = compras.slice(0, 10).map((c, idx) => ({
    id: String(c.id),
    date: new Date(c.data).toLocaleDateString('pt-BR') + ' 08:00',
    type: 'Compra' as const,
    product: c.combustivel?.nome || 'N/A',
    quantity: c.quantidade_litros,
    responsible: c.fornecedor?.nome || 'Distribuidora',
    status: 'Recebido' as const,
  }));

  return { items, alerts, transactions };
}

