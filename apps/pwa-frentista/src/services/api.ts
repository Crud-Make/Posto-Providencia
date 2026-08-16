import { supabase } from '../lib/supabase';
import { hojeIso, meiosFromFechamentoRow, totaisDoDia } from '@posto/utils';

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

/** Linha crua devolvida pela query de leituras (select bico_id, leitura_final, data, id). */
interface LeituraRow {
    bico_id: number;
    leitura_final: number;
    data: string;
    id: number;
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

    /**
     * Recalcula os totais do dia a partir das linhas filhas e grava no pai.
     *
     * @remarks Lê do BANCO em vez de somar o que acabou de ser enviado: o
     *          fechamento do dia tem vários frentistas, cada um mandando do seu
     *          celular, e quem envia por último não sabe o que os outros
     *          mandaram. Reler é o que torna o pai correto seja qual for a ordem
     *          — e é o que faz um reenvio corrigir em vez de somar de novo.
     *
     *          A conta é a canônica de `@posto/utils` (`totaisDoDia`), a mesma
     *          que o painel usa: `diferenca = concentrador − conferido`,
     *          positivo = FALTA (§6).
     *
     *          **Não derruba o envio se falhar.** O dinheiro do frentista já está
     *          gravado quando esta função roda; deixar o pai desatualizado é
     *          ruim, perder a submissão por causa dele é pior. A falha é
     *          reportada no console e o pai continua reconciliável pelo painel.
     */
    async consolidarFechamento(fechamentoId: number) {
        try {
            const { data: pai, error: erroPai } = await supabase
                .from('Fechamento')
                .select('id, data, turno_id, posto_id')
                .eq('id', fechamentoId)
                .single();
            if (erroPai || !pai) throw new Error(erroPai?.message ?? 'fechamento não encontrado');

            const [{ data: filhos, error: erroFilhos }, { data: leituras, error: erroLeituras }] =
                await Promise.all([
                    supabase
                        .from('FechamentoFrentista')
                        .select(
                            'valor_dinheiro, valor_moedas, valor_pix, valor_cartao, valor_cartao_debito, valor_cartao_credito, valor_nota, baratao'
                        )
                        .eq('fechamento_id', fechamentoId),
                    supabase
                        .from('Leitura')
                        .select('valor_total')
                        .eq('posto_id', pai.posto_id)
                        .eq('data', pai.data)
                        .eq('turno_id', pai.turno_id),
                ]);
            if (erroFilhos) throw new Error(erroFilhos.message);
            if (erroLeituras) throw new Error(erroLeituras.message);

            // AUSÊNCIA DE LEITURA NÃO É VENDA ZERO. Os frentistas mandam durante
            // o dia; o encerrante das bombas chega à noite. No caminho normal,
            // quando o primeiro frentista envia ainda não há leitura nenhuma — e
            // tratar isso como concentrador = 0 faria a diferença virar
            // `0 − conferido`, uma SOBRA gigante que nunca existiu. Sem
            // encerrante não há o que conferir: grava só o que os frentistas
            // entregaram e deixa venda e diferença intocadas até a noite.
            const semEncerrante = (leituras ?? []).length === 0;
            const vendaConcentrador = (leituras ?? []).reduce(
                (acc, l) => acc + Number(l.valor_total ?? 0),
                0
            );

            const sessoes = (filhos ?? []).map((f) =>
                meiosFromFechamentoRow({
                    valor_dinheiro: Number(f.valor_dinheiro ?? 0),
                    valor_moedas: Number(f.valor_moedas ?? 0),
                    valor_pix: Number(f.valor_pix ?? 0),
                    valor_cartao: Number(f.valor_cartao ?? 0),
                    valor_cartao_debito: Number(f.valor_cartao_debito ?? 0),
                    valor_cartao_credito: Number(f.valor_cartao_credito ?? 0),
                    valor_nota: Number(f.valor_nota ?? 0),
                    valor_baratao: Number(f.baratao ?? 0),
                })
            );

            const totais = totaisDoDia(vendaConcentrador, sessoes);

            const { error: erroUpdate } = await supabase
                .from('Fechamento')
                .update(
                    semEncerrante
                        ? { total_recebido: totais.totalRecebido }
                        : {
                              total_vendas: totais.totalVendas,
                              total_recebido: totais.totalRecebido,
                              diferenca: totais.diferenca,
                          }
                )
                .eq('id', fechamentoId);
            if (erroUpdate) throw new Error(erroUpdate.message);

            return totais;
        } catch (e) {
            // Ver o @remarks: consolidação é acessório do envio, não condição.
            console.error('Falha ao consolidar o fechamento do dia:', e);
            return null;
        }
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

    /** Aquece a Edge Function (evita cold start na hora da foto). Fire-and-forget. */
    aquecerEncerrante() {
        supabase.functions.invoke('ler-encerrante', { body: { ping: true } }).catch(() => { });
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

    /**
     * OCR do papel de encerrantes via Edge Function (Gemini). Devolve [{ bico, numero }].
     * Tenta 2x: se a 1ª cai numa function fria e falha/expira, a 2ª já pega ela quente.
     */
    async lerEncerrante(imagemBase64: string, mimeType: string) {
        let ultimoErro: unknown;
        for (let tentativa = 1; tentativa <= 2; tentativa++) {
            try {
                const { data, error } = await supabase.functions.invoke('ler-encerrante', {
                    body: { imagemBase64, mimeType },
                });
                if (error) throw new Error(error.message);
                if (data?.erro) throw new Error(String(data.erro));
                return (data?.leituras || []) as { bico: number; numero: string | null; confianca: boolean | null }[];
            } catch (e) {
                ultimoErro = e;
                if (tentativa < 2) await new Promise(r => setTimeout(r, 1500));
            }
        }
        throw ultimoErro instanceof Error ? ultimoErro : new Error('Falha ao ler a foto');
    },

    /**
     * Mapa `bico_id` -> última `leitura_final` de ANTES de hoje (vira a
     * `leitura_inicial` do dia).
     *
     * @remarks
     * **O recorte `data < hoje` é o que segura o segundo envio do dia.** O encerrante
     * é o totalizador da bomba, cumulativo, e `salvarLeituras` apaga e regrava o dia
     * inteiro — então o último envio do dia precisa cobrir o dia TODO, partindo do
     * fechamento de ontem.
     *
     * Sem o recorte, esta busca devolvia a leitura do próprio dia como se fosse "a
     * anterior". No 02/08/2026 isso ia custar caro: o turno das 13h às 21h fechou com
     * 9.515,710 L gravados, e o envio das 23h teria partido daí — apagando as linhas
     * do primeiro turno e deixando no dia só o que rodou das 21h às 23h.
     *
     * Vale igual para reenvio de correção: fotografar de novo no mesmo dia partia da
     * própria foto anterior, e o dia encolhia a cada tentativa.
     */
    async getUltimasLeiturasPorBico(postoId: number): Promise<Map<number, number>> {
        const { data, error } = await supabase
            .from('Leitura')
            .select('bico_id, leitura_final, data, id')
            .eq('posto_id', postoId)
            .lt('data', hojeIso())
            .order('data', { ascending: false })
            .order('id', { ascending: false })
            .limit(200);
        if (error) throw new Error(error.message);
        const ultimas = new Map<number, number>();
        (data || []).forEach((l: LeituraRow) => {
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

        // Um DELETE barrado pela RLS (dia fora da janela de 7 dias) devolve 204 sem erro.
        // Seguir daqui reinseriria as leituras por cima das antigas e dobraria o dia.
        const { count: sobraram, error: erroConferencia } = await supabase
            .from('Leitura')
            .select('id', { count: 'exact', head: true })
            .eq('data', dataStr)
            .eq('turno_id', turnoId)
            .eq('posto_id', postoId);
        if (erroConferencia) throw new Error(erroConferencia.message);
        if ((sobraram ?? 0) > 0) {
            throw new Error(
                'Não foi possível regravar as leituras deste dia: só é permitido alterar os últimos 7 dias.'
            );
        }

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

        // O encerrante é a OUTRA metade do dia: sem isto, o dono manda a leitura
        // à noite e o `total_vendas` do pai continua com o valor de antes — ou em
        // zero, se nenhum frentista tiver enviado depois dele. Consolida só se o
        // pai já existe; criar um a partir do encerrante é decisão de produto, e
        // quando o primeiro frentista enviar ele nasce já com estas leituras no
        // banco, então a ordem de chegada não muda o resultado.
        const { data: pai } = await supabase
            .from('Fechamento')
            .select('id')
            .eq('posto_id', postoId)
            .eq('data', dataStr)
            .eq('turno_id', turnoId)
            .maybeSingle();

        if (pai?.id) await api.consolidarFechamento(pai.id);

        return inserted;
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
