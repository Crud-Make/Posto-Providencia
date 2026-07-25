import { supabase } from '../lib/supabase';

export const api = {
    /** Busca Frentistas ativos do Posto */
    async getFrentistas(postoId: number) {
        const { data, error } = await supabase
            .from('Frentista')
            .select('id, nome')
            .eq('posto_id', postoId)
            .eq('ativo', true)
            .order('nome');
        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Deriva o turno atual do posto a partir do horário de agora.
     * Consulta a tabela Turno (data-driven) e casa o horário corrente com a
     * faixa horario_inicio..horario_fim, tratando turnos que viram a meia-noite.
     * Faz fallback para o primeiro turno ativo (ou 1) se nada casar.
     */
    async getTurnoAtual(postoId: number): Promise<number> {
        const { data, error } = await supabase
            .from('Turno')
            .select('id, horario_inicio, horario_fim')
            .eq('posto_id', postoId)
            .eq('ativo', true)
            .order('horario_inicio');
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) return 1;

        const agora = new Date();
        const hhmmss = agora.toTimeString().slice(0, 8); // "HH:MM:SS" no fuso local

        const normaliza = (h: string) => h.slice(0, 8);
        for (const t of data) {
            const inicio = normaliza(t.horario_inicio);
            const fim = normaliza(t.horario_fim);
            const viraMeiaNoite = inicio > fim;
            const dentro = viraMeiaNoite
                ? (hhmmss >= inicio || hhmmss < fim)   // ex.: 22:00 -> 06:00
                : (hhmmss >= inicio && hhmmss < fim);  // ex.: 06:00 -> 14:00
            if (dentro) return t.id;
        }
        return data[0].id;
    },

    /** Busca ou cria o Fechamento consolidado do dia/turno */
    async getOrCreateFechamento(postoId: number, dataStr: string, turnoId: number, usuarioId: number = 1) {
        const { data: fechamentos, error: fetchError } = await supabase
            .from('Fechamento')
            .select('id')
            .eq('posto_id', postoId)
            .eq('data', dataStr)
            .eq('turno_id', turnoId);
        if (fetchError) throw new Error(fetchError.message);
        if (fechamentos && fechamentos.length > 0) return fechamentos[0].id;

        const { data: novoFechamento, error: insertError } = await supabase
            .from('Fechamento')
            .insert({
                posto_id: postoId,
                data: dataStr,
                turno_id: turnoId,
                total_vendas: 0,
                total_recebido: 0,
                diferenca: 0,
                status: 'ABERTO',
                usuario_id: usuarioId
            })
            .select()
            .single();
        if (insertError) throw new Error(insertError.message);
        return novoFechamento.id;
    },

    /** Envia o fechamento individual do frentista */
    async submitFrentistaClosing(payload: any) {
        const { data, error } = await supabase
            .from('FechamentoFrentista')
            .insert(payload)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    /** Busca histórico de fechamentos de um frentista */
    async getHistoricoFrentista(frentistaId: number) {
        const { data, error } = await supabase
            .from('FechamentoFrentista')
            .select(`
        id, encerrante, valor_pix, valor_dinheiro, valor_moedas,
        valor_cartao_debito, valor_cartao_credito, valor_nota, baratao, diferenca_calculada,
        valor_conferido, observacoes, data_hora_envio,
        fechamento:Fechamento(data, turno_id)
      `)
            .eq('frentista_id', frentistaId)
            .order('id', { ascending: false })
            .limit(20);
        if (error) throw new Error(error.message);
        return data || [];
    },

    /** Busca produtos ativos do posto */
    async getProdutos(postoId: number) {
        const { data, error } = await supabase
            .from('Produto')
            .select('id, nome, preco_venda, estoque_atual, categoria, unidade_medida')
            .eq('posto_id', postoId)
            .eq('ativo', true)
            .order('nome');
        if (error) throw new Error(error.message);
        return data || [];
    },

    /** Registra uma venda de produto pelo frentista */
    async registrarVendaProduto(payload: {
        frentista_id: number;
        produto_id: number;
        quantidade: number;
        valor_unitario: number;
        valor_total: number;
    }) {
        const { data, error } = await supabase
            .from('VendaProduto')
            .insert({
                ...payload,
                data: new Date().toISOString()
            })
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    /** Busca vendas de produtos do dia por frentista */
    async getVendasProdutoHoje(frentistaId: number) {
        const hoje = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('VendaProduto')
            .select(`
        id, quantidade, valor_unitario, valor_total, data,
        produto:Produto(nome, categoria)
      `)
            .eq('frentista_id', frentistaId)
            .gte('data', `${hoje}T00:00:00`)
            .lte('data', `${hoje}T23:59:59`)
            .order('data', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }
};
