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

    /** Busca bicos ativos do posto com preço do combustível (para o encerrante) */
    async getBicos(postoId: number) {
        const { data, error } = await supabase
            .from('Bico')
            .select('id, numero, combustivel_id, combustivel:Combustivel(nome, preco_venda)')
            .eq('posto_id', postoId)
            .eq('ativo', true)
            .order('numero');
        if (error) throw new Error(error.message);
        return data || [];
    },

    /** OCR do papel de encerrantes via Edge Function (Gemini). Devolve [{ bico, numero }]. */
    async lerEncerrante(imagemBase64: string, mimeType: string) {
        const { data, error } = await supabase.functions.invoke('ler-encerrante', {
            body: { imagemBase64, mimeType },
        });
        if (error) throw new Error(error.message);
        if (data?.erro) throw new Error(String(data.erro));
        return (data?.leituras || []) as { bico: number; numero: string | null }[];
    },

    /** Mapa bico_id -> última leitura_final registrada (vira a leitura_inicial do dia). */
    async getUltimasLeiturasPorBico(postoId: number): Promise<Map<number, number>> {
        const { data, error } = await supabase
            .from('Leitura')
            .select('bico_id, leitura_final, data, id')
            .eq('posto_id', postoId)
            .order('data', { ascending: false })
            .order('id', { ascending: false })
            .limit(200);
        if (error) throw new Error(error.message);
        const ultimas = new Map<number, number>();
        (data || []).forEach((l: any) => {
            if (!ultimas.has(l.bico_id)) ultimas.set(l.bico_id, Number(l.leitura_final));
        });
        return ultimas;
    },

    /**
     * Grava as leituras do dia no turno canônico 1, substituindo as existentes
     * (mesmo modelo delete-por-dia + insert usado pela web). Calcula litros e valor.
     */
    async salvarLeituras(params: {
        postoId: number;
        data: string;
        usuarioId?: number;
        linhas: {
            bico_id: number;
            combustivel_id: number;
            leitura_inicial: number;
            leitura_final: number;
            preco_litro: number;
        }[];
    }) {
        const { postoId, data: dataStr, usuarioId = 1, linhas } = params;
        const turnoId = 1;

        const { error: delError } = await supabase
            .from('Leitura')
            .delete()
            .eq('data', dataStr)
            .eq('turno_id', turnoId)
            .eq('posto_id', postoId);
        if (delError) throw new Error(delError.message);

        const rows = linhas.map(l => {
            const litros = Math.max(0, l.leitura_final - l.leitura_inicial);
            return {
                data: dataStr,
                bico_id: l.bico_id,
                combustivel_id: l.combustivel_id,
                leitura_inicial: l.leitura_inicial,
                leitura_final: l.leitura_final,
                litros_vendidos: litros,
                preco_litro: l.preco_litro,
                valor_total: litros * l.preco_litro,
                usuario_id: usuarioId,
                turno_id: turnoId,
                posto_id: postoId,
            };
        });

        const { data: inserted, error } = await supabase.from('Leitura').insert(rows).select();
        if (error) throw new Error(error.message);
        return inserted;
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
