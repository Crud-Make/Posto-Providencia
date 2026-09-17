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
            .select('id, nome, foto')
            .eq('posto_id', postoId)
            .eq('ativo', true)
            .order('nome');
        if (error) throw new Error(error.message);
        return data;
    },

    /**
     * Grava o avatar do frentista.
     *
     * @param foto Data URL JPEG já recortada e reduzida por `reduzirParaAvatar`.
     *             Passe `null` para voltar à inicial do nome.
     * @remarks Só o frentista escolhido no aparelho chega aqui — mas isso é
     *          regra de tela, não do banco: o client é `anon` e a policy
     *          "Enable Update for Anon on Frentista" libera UPDATE em qualquer
     *          linha. A garantia real depende do login por frentista sobre
     *          `Frentista.user_id`, que ainda não foi ligado.
     */
    async salvarFotoFrentista(frentistaId: number, foto: string | null) {
        const { error } = await supabase
            .from('Frentista')
            .update({ foto })
            .eq('id', frentistaId);
        if (error) throw new Error(error.message);
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
                // Venda e diferença nascem NULAS: "não apurado". Nasciam em 0 e o
                // dia sem encerrante tinha a cara do dia que bateu (04/09/2026).
                total_vendas: null,
                total_recebido: 0,
                diferenca: null,
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

    /**
     * Avisa o celular do dono que este fechamento chegou.
     *
     * @remarks **Nunca lança, e isso é o ponto.** O que importa é o fechamento
     *          ter sido gravado; o aviso é cortesia. Se uma falha de
     *          notificação derrubasse o "enviado com sucesso", o frentista
     *          mandaria tudo de novo e criaria envio em dobro — trocando um
     *          aviso perdido por um problema de dinheiro.
     * @remarks Manda só o `id`. A Edge Function monta o texto lendo a linha real
     *          do banco, para ninguém conseguir forjar um aviso.
     */
    async avisarDono(fechamentoFrentistaId: number) {
        try {
            const { error } = await supabase.functions.invoke('notifica-dono', {
                body: { fechamentoFrentistaId },
            });
            if (error) console.error('aviso ao dono não saiu:', error.message);
        } catch (err) {
            console.error('aviso ao dono não saiu:', err);
        }
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

    /**
     * Envios já feitos no dia, de todos os frentistas — o "o que já foi" que o
     * frentista (e o dono, no replay) olha antes de mandar o próximo. Filtra pelo
     * `Fechamento.data` do pai: o envio é por dia, não por turno.
     */
    async getEnviosDoDia(postoId: number, dataStr: string) {
        const { data, error } = await supabase
            .from('FechamentoFrentista')
            .select(`
        id, frentista_id, valor_conferido, encerrante, diferenca_calculada, data_hora_envio,
        frentista:Frentista(nome),
        fechamento:Fechamento!inner(data, posto_id)
      `)
            .eq('fechamento.posto_id', postoId)
            .eq('fechamento.data', dataStr)
            .order('data_hora_envio', { ascending: true });
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

    /** Tanques do posto com o combustível — a lista da tela de régua (#74). */
    async getTanques(postoId: number) {
        const { data, error } = await supabase
            .from('Tanque')
            .select('id, combustivel:Combustivel(nome, codigo)')
            .eq('posto_id', postoId)
            .order('id');
        if (error) throw new Error(error.message);
        return (data ?? []) as unknown as {
            id: number;
            combustivel: { nome: string; codigo: string | null } | null;
        }[];
    },

    /** Medições de régua já gravadas no dia — para avisar que reenvio substitui. */
    async getMedicoesDoDia(dataStr: string) {
        const { data, error } = await supabase
            .from('HistoricoTanque')
            .select('tanque_id, volume_fisico')
            .eq('data', dataStr);
        if (error) throw new Error(error.message);
        return (data ?? []) as { tanque_id: number | null; volume_fisico: number | null }[];
    },

    /**
     * Grava a medição de régua de um tanque (upsert por tanque+dia, #74).
     *
     * @remarks Com o client anon, escrita barrada pela RLS pode voltar SEM
     *          erro — o mesmo silêncio já documentado do reset. Depois de
     *          gravar, reconsulta e confere o valor; se não bateu, erro
     *          explícito (regra herdada de `packages/api-core`).
     */
    async salvarMedicaoTanque(tanqueId: number, dataStr: string, volumeFisico: number) {
        const { error } = await supabase
            .from('HistoricoTanque')
            .upsert(
                { tanque_id: tanqueId, data: dataStr, volume_fisico: volumeFisico },
                { onConflict: 'tanque_id, data' },
            );
        if (error) throw new Error(error.message);

        const { data: gravado, error: erroConfere } = await supabase
            .from('HistoricoTanque')
            .select('volume_fisico')
            .eq('tanque_id', tanqueId)
            .eq('data', dataStr)
            .single();
        if (erroConfere) throw new Error(erroConfere.message);
        if (gravado == null || Number(gravado.volume_fisico) !== volumeFisico) {
            throw new Error('A medição não foi gravada (barrada pela segurança do banco). Avise o gerente.');
        }
    },

    /** Busca vendas de produtos do dia por frentista */
    async getVendasProdutoHoje(frentistaId: number) {
        // `VendaProduto.data` é gravada com `toISOString()` (instante UTC real). O
        // recorte precisa ser a meia-noite LOCAL convertida para UTC: com `T00:00:00Z`
        // sobre a data local, uma venda às 21h30 (00h30Z do dia seguinte) caía fora de "hoje".
        const inicio = new Date(`${hojeIso()}T00:00:00`);
        const fim = new Date(inicio);
        fim.setDate(fim.getDate() + 1);
        const { data, error } = await supabase
            .from('VendaProduto')
            .select(`
        id, quantidade, valor_unitario, valor_total, data,
        produto:Produto(nome, categoria)
      `)
            .eq('frentista_id', frentistaId)
            .gte('data', inicio.toISOString())
            .lt('data', fim.toISOString())
            .order('data', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    }
};
