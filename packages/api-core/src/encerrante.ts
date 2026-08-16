/**
 * Acesso a dados do ENCERRANTE — leitura das bombas e consolidação do dia.
 *
 * @remarks Mora aqui, e não dentro de um app, porque **dois apps precisam do
 *          mesmo comportamento**: o PWA do frentista (que envia o fechamento)
 *          e o PWA do dono (que envia a leitura das bombas). Duplicar seria
 *          repetir a história dos quatro sites de `litros = final − inicial`,
 *          num código que escreve `Fechamento.total_vendas` e `diferenca`.
 *
 *          O cliente Supabase é **injetado**: cada app tem o seu, com a sua
 *          configuração de auth e o seu `.env`. `packages/*` nunca importa de
 *          app (§2), então não pode criar o cliente por conta própria.
 *
 *          Cada função carrega o porquê que veio de bug real — o recorte
 *          `data < hoje`, a conferência anti-RLS-silenciosa, e "ausência de
 *          leitura não é venda zero". Esses comentários são a parte que não
 *          pode se perder na mudança de casa.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
    hojeIso,
    litrosVendidos,
    valorDaLeitura,
    meiosFromFechamentoRow,
    totaisDoDia,
} from '@posto/utils';

/** Turno canônico das leituras. O encerrante é por DIA e por bico, não por turno. */
const TURNO_CANONICO = 1;

/** Linha crua da query de leituras (select bico_id, leitura_final, data, id). */
interface LinhaLeitura {
    bico_id: number;
    leitura_final: number;
}

/** Uma leitura de bico pronta para gravar, ainda sem litros nem valor. */
export interface LinhaParaGravar {
    bico_id: number;
    combustivel_id: number;
    leitura_inicial: number;
    leitura_final: number;
    preco_litro: number;
}

/** O que o OCR devolve por bico. `confianca: false` = as duas leituras divergiram. */
export interface LeituraOcr {
    bico: number;
    numero: string | null;
    confianca: boolean | null;
}

export interface AcessoEncerrante {
    getBicos(postoId: number): Promise<unknown[]>;
    aquecerEncerrante(): void;
    lerEncerrante(imagemBase64: string, mimeType: string): Promise<LeituraOcr[]>;
    getUltimasLeiturasPorBico(postoId: number): Promise<Map<number, number>>;
    salvarLeituras(params: {
        postoId: number;
        data: string;
        usuarioId?: number;
        linhas: LinhaParaGravar[];
    }): Promise<unknown>;
    consolidarFechamento(fechamentoId: number): Promise<unknown>;
}

/**
 * Monta o acesso ao encerrante sobre um cliente Supabase já configurado.
 *
 * @param supabase Cliente do app chamador. Não é criado aqui de propósito:
 *                 auth e `.env` são responsabilidade de cada app.
 */
export function criarAcessoEncerrante(supabase: SupabaseClient): AcessoEncerrante {
    const acesso: AcessoEncerrante = {
        /** Bicos ativos do posto com preço do combustível. */
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

        /**
         * Aquece a Edge Function. Fire-and-forget.
         *
         * @remarks A primeira chamada do dia caía num cold start de ~40s e a
         *          foto expirava. Chamar isto ao abrir a tela e a cada 45s
         *          mantém a função quente enquanto alguém está na bomba.
         */
        aquecerEncerrante() {
            supabase.functions.invoke('ler-encerrante', { body: { ping: true } }).catch(() => { });
        },

        /**
         * OCR do papel "IMPRESSÃO DE ENCERRANTES" via Edge Function (Gemini).
         *
         * @remarks Tenta 2x: se a 1ª cai numa function fria e falha, a 2ª já a
         *          pega quente. É correção de bug real, não otimismo.
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
                    return (data?.leituras || []) as LeituraOcr[];
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
         * @remarks **O recorte `data < hoje` é o que segura o segundo envio do
         *          dia.** O encerrante é o totalizador da bomba, cumulativo, e
         *          `salvarLeituras` apaga e regrava o dia inteiro — então o
         *          último envio precisa cobrir o dia TODO, partindo do
         *          fechamento de ontem.
         *
         *          Sem o recorte, esta busca devolvia a leitura do próprio dia
         *          como se fosse "a anterior". Em 02/08/2026 isso custaria
         *          caro: o turno das 13h às 21h fechou com 9.515,710 L
         *          gravados, e o envio das 23h teria partido daí — apagando o
         *          primeiro turno e deixando no dia só o que rodou das 21h às
         *          23h. Vale igual para reenvio de correção: fotografar de novo
         *          no mesmo dia partia da própria foto anterior, e o dia
         *          encolhia a cada tentativa.
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
            (data || []).forEach((l: LinhaLeitura) => {
                if (!ultimas.has(l.bico_id)) ultimas.set(l.bico_id, Number(l.leitura_final));
            });
            return ultimas;
        },

        /**
         * Grava as leituras do dia, substituindo as existentes (delete-por-dia
         * + insert, o mesmo modelo do painel).
         */
        async salvarLeituras(params: {
            postoId: number;
            data: string;
            usuarioId?: number;
            linhas: LinhaParaGravar[];
        }) {
            const { postoId, data: dataStr, usuarioId = 1, linhas } = params;

            const { error: delError } = await supabase
                .from('Leitura')
                .delete()
                .eq('data', dataStr)
                .eq('turno_id', TURNO_CANONICO)
                .eq('posto_id', postoId);
            if (delError) throw new Error(delError.message);

            // Um DELETE barrado pela RLS (dia fora da janela de 7 dias) devolve
            // 204 SEM erro. Seguir daqui reinseriria as leituras por cima das
            // antigas e dobraria o dia — em silêncio.
            const { count: sobraram, error: erroConferencia } = await supabase
                .from('Leitura')
                .select('id', { count: 'exact', head: true })
                .eq('data', dataStr)
                .eq('turno_id', TURNO_CANONICO)
                .eq('posto_id', postoId);
            if (erroConferencia) throw new Error(erroConferencia.message);
            if ((sobraram ?? 0) > 0) {
                throw new Error(
                    'Não foi possível regravar as leituras deste dia: só é permitido alterar os últimos 7 dias.'
                );
            }

            const rows = linhas.map(l => {
                // Fronteira: o banco fala `leitura_*`, o domínio fala
                // `inicial`/`fechamento` (§4).
                const leitura = { inicial: l.leitura_inicial, fechamento: l.leitura_final };
                return {
                    data: dataStr,
                    bico_id: l.bico_id,
                    combustivel_id: l.combustivel_id,
                    leitura_inicial: l.leitura_inicial,
                    leitura_final: l.leitura_final,
                    litros_vendidos: litrosVendidos(leitura),
                    preco_litro: l.preco_litro,
                    valor_total: valorDaLeitura(leitura, l.preco_litro),
                    usuario_id: usuarioId,
                    turno_id: TURNO_CANONICO,
                    posto_id: postoId,
                };
            });

            const { data: inserted, error } = await supabase.from('Leitura').insert(rows).select();
            if (error) throw new Error(error.message);

            // O encerrante é a OUTRA metade do dia: sem isto, o dono manda a
            // leitura à noite e o `total_vendas` do pai continua com o valor de
            // antes — ou em zero, se nenhum frentista tiver enviado depois
            // dele. Consolida só se o pai JÁ EXISTE; criar um a partir do
            // encerrante é decisão de produto, e quando o primeiro frentista
            // enviar ele nasce já com estas leituras no banco, então a ordem de
            // chegada não muda o resultado.
            const { data: pai } = await supabase
                .from('Fechamento')
                .select('id')
                .eq('posto_id', postoId)
                .eq('data', dataStr)
                .eq('turno_id', TURNO_CANONICO)
                .maybeSingle();

            if (pai?.id) await acesso.consolidarFechamento(pai.id);

            return inserted;
        },

        /**
         * Recalcula os totais do dia a partir das linhas filhas e grava no pai.
         *
         * @remarks Lê do BANCO em vez de somar o que acabou de ser enviado: o
         *          dia tem vários frentistas, cada um mandando do seu celular, e
         *          quem envia por último não sabe o que os outros mandaram.
         *          Reler é o que torna o pai correto seja qual for a ordem — e é
         *          o que faz um reenvio corrigir em vez de somar de novo.
         *
         *          A conta é a canônica de `@posto/utils` (`totaisDoDia`), a
         *          mesma do painel: `diferenca = concentrador − conferido`,
         *          positivo = FALTA (§6).
         *
         *          **Não derruba o envio se falhar.** O dinheiro do frentista já
         *          está gravado quando isto roda; deixar o pai desatualizado é
         *          ruim, perder a submissão por causa dele é pior.
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

                // AUSÊNCIA DE LEITURA NÃO É VENDA ZERO. Os frentistas mandam
                // durante o dia; o encerrante chega à noite. No caminho normal,
                // quando o primeiro frentista envia ainda não há leitura nenhuma
                // — e tratar isso como concentrador = 0 faria a diferença virar
                // `0 − conferido`, uma SOBRA gigante que nunca existiu. Sem
                // encerrante grava só o que os frentistas entregaram e deixa
                // venda e diferença intocadas até a noite.
                const semEncerrante = (leituras ?? []).length === 0;
                const vendaConcentrador = (leituras ?? []).reduce(
                    (acc: number, l: { valor_total: number | null }) => acc + Number(l.valor_total ?? 0),
                    0
                );

                const sessoes = (filhos ?? []).map((f: Record<string, number | null>) =>
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
    };

    return acesso;
}
