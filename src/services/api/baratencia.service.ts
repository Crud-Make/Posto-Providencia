import { supabase } from '../supabase';
import { solvencyService } from './solvency.service';
import type {
  ClienteBaratencia,
  CarteiraBaratencia,
  TransacaoBaratencia,
  TokenAbastecimento,
  PromocaoBaratencia,
  Json
} from '../../types/database/index';

export const baratenciaService = {
  // --- CLIENTES ---
  async getClientes(postoId?: number): Promise<(ClienteBaratencia & { carteira?: CarteiraBaratencia })[]> {
    const { data, error } = await supabase
      .from('ClienteBaratencia')
      .select(`
        *,
        carteira:CarteiraBaratencia(*)
      `)
      .eq('ativo', true)
      .order('nome');

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((c: any) => ({
      ...c,
      carteira: c.carteira?.[0] || null
    }));
  },

  async getClienteById(clienteId: number): Promise<ClienteBaratencia & { carteira: CarteiraBaratencia } | null> {
    const { data, error } = await supabase
      .from('ClienteBaratencia')
      .select(`
        *,
        carteira:CarteiraBaratencia(*)
      `)
      .eq('id', clienteId)
      .single();

    if (error) throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data ? { ...data, carteira: (data as any).carteira?.[0] || null } : null;
  },

  async createCliente(cliente: { nome: string; cpf: string; telefone?: string }): Promise<ClienteBaratencia> {
    // 1. Cria o cliente
    const { data: novoCliente, error: clienteError } = await supabase
      .from('ClienteBaratencia')
      .insert({
        nome: cliente.nome,
        cpf: cliente.cpf,
        telefone: cliente.telefone || null
      })
      .select()
      .single();

    if (clienteError) throw clienteError;

    // 2. Cria a carteira zerada
    const { error: carteiraError } = await supabase
      .from('CarteiraBaratencia')
      .insert({
        cliente_id: novoCliente.id,
        saldo_brl: 0,
        saldo_litros_gc: 0,
        saldo_litros_ga: 0,
        saldo_litros_et: 0,
        saldo_litros_s10: 0,
        saldo_litros_diesel: 0
      });

    if (carteiraError) throw carteiraError;

    return novoCliente;
  },

  async updateCliente(clienteId: number, updates: Partial<ClienteBaratencia>): Promise<ClienteBaratencia> {
    const { data, error } = await supabase
      .from('ClienteBaratencia')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', clienteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCliente(clienteId: number): Promise<void> {
    const { error } = await supabase
      .from('ClienteBaratencia')
      .update({ ativo: false })
      .eq('id', clienteId);

    if (error) throw error;
  },

  // --- CARTEIRA ---
  async getCarteira(clienteId: number): Promise<CarteiraBaratencia | null> {
    const { data, error } = await supabase
      .from('CarteiraBaratencia')
      .select('*')
      .eq('cliente_id', clienteId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async depositar(clienteId: number, valor: number, metadata?: Json): Promise<TransacaoBaratencia> {
    // 1. Busca carteira
    const carteira = await this.getCarteira(clienteId);
    if (!carteira) throw new Error('Carteira não encontrada');

    // 2. Atualiza saldo
    const novoSaldo = carteira.saldo_brl + valor;
    const { error: updateError } = await supabase
      .from('CarteiraBaratencia')
      .update({ saldo_brl: novoSaldo, ultima_atualizacao: new Date().toISOString() })
      .eq('id', carteira.id);

    if (updateError) throw updateError;

    // 3. Registra transação
    const { data: transacao, error: transacaoError } = await supabase
      .from('TransacaoBaratencia')
      .insert({
        carteira_id: carteira.id,
        tipo: 'DEPOSITO',
        valor_brl: valor,
        quantidade_litros: 0,
        status: 'COMPLETO',
        metadata: metadata || null
      })
      .select()
      .single();

    if (transacaoError) throw transacaoError;
    return transacao;
  },

  async converterParaLitros(
    clienteId: number,
    combustivelCodigo: string,
    valorBrl: number,
    precoLitro: number
  ): Promise<TransacaoBaratencia> {
    // 1. Busca carteira
    const carteira = await this.getCarteira(clienteId);
    if (!carteira) throw new Error('Carteira não encontrada');
    if (carteira.saldo_brl < valorBrl) throw new Error('Saldo insuficiente');

    // 2. Calcula litros
    const litros = valorBrl / precoLitro;

    // 3. Determina qual campo de litros atualizar
    const campoLitros = `saldo_litros_${combustivelCodigo.toLowerCase()}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saldoAtualLitros = (carteira as any)[campoLitros] || 0;

    // 4. Atualiza carteira
    const { error: updateError } = await supabase
      .from('CarteiraBaratencia')
      .update({
        saldo_brl: carteira.saldo_brl - valorBrl,
        [campoLitros]: saldoAtualLitros + litros,
        ultima_atualizacao: new Date().toISOString()
      })
      .eq('id', carteira.id);

    if (updateError) throw updateError;

    // 5. Registra transação
    const { data: transacao, error: transacaoError } = await supabase
      .from('TransacaoBaratencia')
      .insert({
        carteira_id: carteira.id,
        tipo: 'CONVERSAO',
        valor_brl: -valorBrl,
        quantidade_litros: litros,
        combustivel_codigo: combustivelCodigo,
        preco_na_hora: precoLitro,
        status: 'COMPLETO'
      })
      .select()
      .single();

    if (transacaoError) throw transacaoError;
    return transacao;
  },

  // --- TOKENS ---
  async gerarToken(
    clienteId: number,
    combustivelId: number,
    combustivelCodigo: string,
    litros: number,
    postoId: number
  ): Promise<TokenAbastecimento> {
    // 1. Verifica saldo
    const carteira = await this.getCarteira(clienteId);
    if (!carteira) throw new Error('Carteira não encontrada');

    const campoLitros = `saldo_litros_${combustivelCodigo.toLowerCase()}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const saldoLitros = (carteira as any)[campoLitros] || 0;

    if (saldoLitros < litros) throw new Error('Saldo de litros insuficiente');

    // 2. Gera PIN de 6 dígitos
    const pin = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Expiração em 5 minutos
    const expiracao = new Date();
    expiracao.setMinutes(expiracao.getMinutes() + 5);

    // 4. Congela litros (debita da carteira)
    const { error: updateError } = await supabase
      .from('CarteiraBaratencia')
      .update({
        [campoLitros]: saldoLitros - litros,
        ultima_atualizacao: new Date().toISOString()
      })
      .eq('id', carteira.id);

    if (updateError) throw updateError;

    // 5. Cria token
    const { data: token, error: tokenError } = await supabase
      .from('TokenAbastecimento')
      .insert({
        cliente_id: clienteId,
        posto_id: postoId,
        combustivel_id: combustivelId,
        quantidade_litros: litros,
        token_pin: pin,
        data_expiracao: expiracao.toISOString(),
        status: 'PENDENTE'
      })
      .select()
      .single();

    if (tokenError) throw tokenError;
    return token;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async validarToken(pin: string, postoId: number): Promise<TokenAbastecimento & { cliente: ClienteBaratencia; combustivel: any } | null> {
    const { data, error } = await supabase
      .from('TokenAbastecimento')
      .select(`
        *,
        cliente:ClienteBaratencia(*),
        combustivel:Combustivel(*)
      `)
      .eq('token_pin', pin)
      .eq('posto_id', postoId)
      .eq('status', 'PENDENTE')
      .gte('data_expiracao', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data as any;
  },

  async resgatarToken(tokenId: number, frentistaId: number): Promise<TokenAbastecimento> {
    const { data, error } = await supabase
      .from('TokenAbastecimento')
      .update({
        status: 'USADO',
        frentista_id_resgatou: frentistaId,
        data_resgate: new Date().toISOString()
      })
      .eq('id', tokenId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // --- MÉTRICAS ---
  async getDashboardMetrics(postoId?: number): Promise<{
    totalClientes: number;
    totalSaldoBrl: number;
    passivoLitros: { gc: number; ga: number; et: number; s10: number; diesel: number };
    transacoesHoje: number;
  }> {
    // Total de clientes
    const { count: totalClientes } = await supabase
      .from('ClienteBaratencia')
      .select('*', { count: 'exact', head: true })
      .eq('ativo', true);

    // Soma de saldos
    const { data: carteiras } = await supabase
      .from('CarteiraBaratencia')
      .select('saldo_brl, saldo_litros_gc, saldo_litros_ga, saldo_litros_et, saldo_litros_s10, saldo_litros_diesel');

    const totais = (carteiras || []).reduce((acc, c) => ({
      saldoBrl: acc.saldoBrl + (c.saldo_brl || 0),
      gc: acc.gc + (c.saldo_litros_gc || 0),
      ga: acc.ga + (c.saldo_litros_ga || 0),
      et: acc.et + (c.saldo_litros_et || 0),
      s10: acc.s10 + (c.saldo_litros_s10 || 0),
      diesel: acc.diesel + (c.saldo_litros_diesel || 0)
    }), { saldoBrl: 0, gc: 0, ga: 0, et: 0, s10: 0, diesel: 0 });

    // Transações de hoje
    const hoje = new Date().toISOString().split('T')[0];
    const { count: transacoesHoje } = await supabase
      .from('TransacaoBaratencia')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${hoje}T00:00:00`)
      .lte('created_at', `${hoje}T23:59:59`);

    return {
      totalClientes: totalClientes || 0,
      totalSaldoBrl: totais.saldoBrl,
      passivoLitros: {
        gc: totais.gc,
        ga: totais.ga,
        et: totais.et,
        s10: totais.s10,
        diesel: totais.diesel
      },
      transacoesHoje: transacoesHoje || 0
    };
  },

  async getTransacoes(clienteId?: number, limit: number = 50): Promise<TransacaoBaratencia[]> {
    let query = supabase
      .from('TransacaoBaratencia')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (clienteId) {
      const carteira = await this.getCarteira(clienteId);
      if (carteira) {
        query = query.eq('carteira_id', carteira.id);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // --- PROMOÇÕES E IA ---
  async getPromocoes(postoId?: number): Promise<PromocaoBaratencia[]> {
    let query = supabase
      .from('PromocaoBaratencia')
      .select('*')
      .eq('ativo', true)
      .order('created_at', { ascending: false });

    if (postoId) {
      query = query.eq('posto_id', postoId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createPromocao(promocao: Omit<PromocaoBaratencia, 'id' | 'created_at'>): Promise<PromocaoBaratencia> {
    const { data, error } = await supabase
      .from('PromocaoBaratencia')
      .insert(promocao)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getAiRecommendation(postoId: number): Promise<{
    title: string;
    message: string;
    type: 'BONUS_DEPOSITO' | 'BONUS_CONVERSAO';
    suggestedValue: number;
    suggestedBonus: number;
    reason: string;
  } | null> {
    try {
      const stats = await this.getDashboardMetrics(postoId);
      const solvency = await solvencyService.getProjection(postoId);

      // Lógica 1: Se o passivo de litros está alto (> 5000L), sugerir promoção de depósito para garantir caixa
      const totalLitros = stats.passivoLitros.gc + stats.passivoLitros.ga + stats.passivoLitros.et + stats.passivoLitros.s10 + stats.passivoLitros.diesel;

      const compromissosProximos = solvency.proximasParcelas.filter(p => p.status === 'vermelho' || p.status === 'amarelo');

      if (compromissosProximos.length > 0) {
        return {
          title: 'IA: Impulso de Liquidez',
          message: 'Detectamos compromissos financeiros próximos com saldo abaixo do ideal. Criar uma promoção de depósito pode atrair capital imediato.',
          type: 'BONUS_DEPOSITO',
          suggestedValue: 500,
          suggestedBonus: 5,
          reason: `Você possui R$ ${compromissosProximos.reduce((a, b) => a + b.valor, 0).toLocaleString('pt-BR')} em pagamentos pendentes nos próximos dias.`
        };
      }

      // Lógica 2: Se o passivo de litros está baixo, incentivar conversão
      if (totalLitros < 1000) {
        return {
          title: 'IA: Fidelização Ativa',
          message: 'O volume de litros pré-pagos está baixo. Oferecer um bônus na conversão incentiva o cliente a travar o preço conosco.',
          type: 'BONUS_CONVERSAO',
          suggestedValue: 100,
          suggestedBonus: 3,
          reason: 'Aumentar o passivo de litros garante que o cliente volte ao posto para resgatar.'
        };
      }

      return null;
    } catch (error) {
      console.error('Erro ao gerar recomendação IA:', error);
      return null;
    }
  }
};
