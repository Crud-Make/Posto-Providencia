import { supabase } from '../lib/supabase';
import { criarAcessoEncerrante } from '@posto/api-core';
import { hojeIso } from '@posto/utils';

/**
 * Acesso ao encerrante compartilhado com o PWA do dono.
 *
 * @remarks Estas seis operações escrevem `Leitura` e reconsolidam
 *          `Fechamento.total_vendas`/`diferenca`. Os dois apps precisam do
 *          MESMO comportamento — inclusive das correções que custaram caro (o
 *          recorte `data < hoje`, a conferência anti-RLS-silenciosa, "ausência
 *          de leitura não é venda zero") —, então elas vivem em
 *          `packages/api-core` e aqui só se delega.
 */
const encerrante = criarAcessoEncerrante(supabase);

/** Payload enviado por App.tsx ao fechar o turno do frentista (shape de FechamentoFrentista.Insert). */
interface FechamentoFrentistaPayload {
    fechamento_id: number;
    frentista_id: number;
    posto_id: number;
    encerrante: number;
    valor_pix: number;
    valor_dinheiro: number;
    valor_moedas: number;
    baratao: number;
    valor_nota: number;
    valor_cartao_debito: number;
    valor_cartao_credito: number;
    valor_cartao: number;
    valor_conferido: number;
    diferenca_calculada: number;
    observacoes: string;
}

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
    async submitFrentistaClosing(payload: FechamentoFrentistaPayload) {
        const { data, error } = await supabase
            .from('FechamentoFrentista')
            .insert(payload)
            .select()
            .single();
        if (error) throw new Error(error.message);

        // O pai nascia zerado e ficava assim até alguém abrir o painel — é a
        // origem dos 12 dias que nunca fecharam. Agora todo filho gravado
        // reconsolida o pai a partir do banco.
        await api.consolidarFechamento(payload.fechamento_id);

        return data;
    },

    /** Delegado a `@posto/api-core` — ver o porquê em `encerrante.ts`. */
    consolidarFechamento(fechamentoId: number) {
        return encerrante.consolidarFechamento(fechamentoId);
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

    /** Delegado a `@posto/api-core`. */
    getBicos(postoId: number) {
        return encerrante.getBicos(postoId);
    },

    /** Delegado a `@posto/api-core`. */
    aquecerEncerrante() {
        encerrante.aquecerEncerrante();
    },

    /**
     * Sinal de vida: registra que o app está aberto com este frentista selecionado.
     *
     * @remarks
     * `visto_em` **não** é enviado de propósito — um trigger no banco carimba com
     * o relógio do servidor. O celular do frentista com a hora errada colocaria
     * ele no futuro e o painel o mostraria online para sempre.
     *
     * Falha em silêncio: presença é conveniência, e um erro de rede aqui não pode
     * atrapalhar o frentista que está tentando fechar o caixa.
     */
    async marcarPresenca(frentistaId: number, postoId: number): Promise<void> {
        const { error } = await supabase
            .from('PresencaFrentista')
            .upsert({ frentista_id: frentistaId, posto_id: postoId }, { onConflict: 'frentista_id' });

        if (error) console.warn('[presenca] sinal não registrado:', error.message);
    },

    /** Delegado a `@posto/api-core`. */
    lerEncerrante(imagemBase64: string, mimeType: string) {
        return encerrante.lerEncerrante(imagemBase64, mimeType);
    },

    /** Delegado a `@posto/api-core` — o recorte `data < hoje` mora lá. */
    getUltimasLeiturasPorBico(postoId: number) {
        return encerrante.getUltimasLeiturasPorBico(postoId);
    },

    /** Delegado a `@posto/api-core` — delete-por-dia e consolidação moram lá. */
    salvarLeituras(params: Parameters<typeof encerrante.salvarLeituras>[0]) {
        return encerrante.salvarLeituras(params);
    },

    /** Busca vendas de produtos do dia por frentista */
    async getVendasProdutoHoje(frentistaId: number) {
        const hoje = hojeIso();
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
