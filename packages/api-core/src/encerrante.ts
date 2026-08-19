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
    deIsoLocal,
    somarDias,
    litrosVendidos,
    valorDaLeitura,
    meiosFromFechamentoRow,
    totaisDoDia,
} from '@posto/utils';

/**
 * Turno usado para achar o `Fechamento` do dia e para carimbar a `Leitura`.
 *
 * @remarks **A `Leitura` NÃO é por turno**, e nada mais a filtra por ele: o
 *          índice único de produção é `leitura_unica_bico_data (bico_id, data)`,
 *          uma leitura por bico por dia. O valor continua sendo gravado só para
 *          não deixar a coluna oscilando entre `1` e `NULL` conforme o app que
 *          escreveu — o painel grava `NULL`, e foi a divergência entre os dois
 *          que produziu `duplicate key` quando o delete filtrado não alcançava
 *          a linha do outro.
 *
 *          Onde o turno ainda VALE é no `Fechamento`, que é por turno de
 *          verdade: é por ele que se acha o pai a consolidar.
 */
const TURNO_CANONICO = 1;

/**
 * Quantos dias para trás vale a pena cobrar o encerrante.
 *
 * @remarks Não é número redondo escolhido a gosto: nasceu como a largura da
 *          janela de escrita da RLS (`dentro_da_janela_de_escrita`, em regime
 *          normal `data >= hoje - 7`). A janela do banco pode estar mais larga
 *          (migration `20260819_janela_escrita_cobre_o_replay`, enquanto o
 *          histórico é reconstruído), mas o aviso continua cobrando só a
 *          semana: aviso que lista meses de dias é aviso que se aprende a
 *          ignorar.
 */
const DIAS_COBRAVEIS = 7;

/** Linha crua da query de leituras (select bico_id, leitura_final, data, id). */
/**
 * A última linha de `Leitura` de cada bico antes de `anteriorA`.
 *
 * @remarks Um lugar só para o recorte, porque encerrante inicial e preço herdado
 *          têm de vir do MESMO dia. Duas consultas separadas poderiam divergir se
 *          uma rodasse antes e a outra depois de uma gravação.
 */
async function ultimaLinhaPorBico(
    supabase: SupabaseClient,
    postoId: number,
    anteriorA?: string
): Promise<Map<number, LinhaLeitura>> {
    const { data, error } = await supabase
        .from('Leitura')
        .select('bico_id, leitura_final, preco_litro, data, id')
        .eq('posto_id', postoId)
        .lt('data', anteriorA ?? hojeIso())
        .order('data', { ascending: false })
        .order('id', { ascending: false })
        .limit(200);
    if (error) throw new Error(error.message);
    const porBico = new Map<number, LinhaLeitura>();
    (data || []).forEach((l: LinhaLeitura) => {
        if (!porBico.has(l.bico_id)) porBico.set(l.bico_id, l);
    });
    return porBico;
}

interface LinhaLeitura {
    bico_id: number;
    leitura_final: number;
    preco_litro: number | null;
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

/** O que já foi gravado hoje — a prova, na tela, de que o envio aconteceu. */
export interface EncerranteDoDia {
    readonly bicos: number;
    readonly litros: number;
    readonly valor: number;
    /** Momento da gravação mais recente do dia, para a tela dizer "às 21h04". */
    readonly gravadoEm: string | null;
}

/** Um dia passado cujo encerrante não foi enviado, ou foi só em parte. */
export interface DiaEmFalta {
    /** ISO local `aaaa-mm-dd`. */
    readonly data: string;
    /** Quantos bicos têm leitura nesse dia. Zero = ninguém enviou. */
    readonly bicosLancados: number;
    /** Quantos bicos ativos o posto tem hoje. */
    readonly bicosEsperados: number;
}

/**
 * Recusa que não adianta repetir — a tela mostra esta mensagem como está.
 *
 * @remarks Separada de `Error` comum para o retry saber a diferença entre
 *          "tenta de novo" e "não insista". `instanceof` sobrevive porque a
 *          classe é a mesma instância de módulo nos dois apps.
 */
export class RecusaDoOcr extends Error {
    constructor(mensagem: string) {
        super(mensagem);
        this.name = 'RecusaDoOcr';
    }
}

/**
 * Traduz o status HTTP da Edge Function em mensagem para quem está na bomba.
 *
 * @returns A mensagem, ou `null` quando vale tentar de novo.
 * @remarks A proteção de custo da function (limite de taxa e teto de tamanho)
 *          responde 429 e 413. Sem esta tradução, os dois chegariam ao dono
 *          como "Não consegui ler a foto. Tente novamente." — conselho errado
 *          nos dois casos: no 429 tentar de novo é exatamente o que não se
 *          deve fazer, e no 413 a foto não vai encolher sozinha.
 *
 *          O status vive em `error.context`, que o supabase-js preenche com a
 *          `Response` crua. Chega como `unknown` de propósito: `any` está
 *          proibido (§4), e o formato é do cliente, não nosso.
 */
function recusaDefinitiva(erro: unknown): string | null {
    const contexto = (erro as { context?: unknown })?.context;
    const status = (contexto as { status?: unknown })?.status;
    if (typeof status !== 'number') return null;

    if (status === 429) {
        return 'Muitas leituras seguidas. Espere um minuto e fotografe de novo — ou digite as leituras à mão.';
    }
    if (status === 413) {
        return 'A foto ficou grande demais para enviar. Tire outra mais de perto, ou digite as leituras à mão.';
    }
    return null;
}

export interface AcessoEncerrante {
    getBicos(postoId: number): Promise<unknown[]>;
    aquecerEncerrante(): void;
    lerEncerrante(imagemBase64: string, mimeType: string): Promise<LeituraOcr[]>;
    /** `anteriorA` (`YYYY-MM-DD`) recorta o dia que está sendo fechado; padrão hoje. */
    getUltimasLeiturasPorBico(postoId: number, anteriorA?: string): Promise<Map<number, number>>;
    /**
     * Mapa `bico_id` -> `preco_litro` do último dia lançado antes de `anteriorA`.
     * Bico sem dia anterior não entra — quem chama cai no cadastro.
     */
    getUltimosPrecosPorBico(postoId: number, anteriorA?: string): Promise<Map<number, number>>;
    diasEmFalta(postoId: number, bicosEsperados: number): Promise<DiaEmFalta[]>;
    encerranteDeHoje(postoId: number): Promise<EncerranteDoDia | null>;
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
                    if (error) {
                        const recusa = recusaDefinitiva(error);
                        if (recusa) throw new RecusaDoOcr(recusa);
                        throw new Error(error.message);
                    }
                    if (data?.erro) throw new Error(String(data.erro));
                    return (data?.leituras || []) as LeituraOcr[];
                } catch (e) {
                    // Repetir uma recusa definitiva não ajuda e atrapalha: no
                    // 429 a segunda tentativa é mais uma batida na porta que já
                    // disse "devagar", e no 413 a foto continua do mesmo
                    // tamanho. O retry existe para a function FRIA, não para
                    // qualquer erro.
                    if (e instanceof RecusaDoOcr) throw e;
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
        /**
         * Mapa `bico_id` -> última `leitura_final` de ANTES de `anteriorA`.
         *
         * @param anteriorA - Dia que está sendo fechado (`YYYY-MM-DD`). O padrão
         *                    é hoje, que é o caso da operação normal.
         * @remarks O recorte é **estritamente anterior** porque `salvarLeituras`
         *          apaga e regrava o dia inteiro: o envio precisa partir do
         *          fechamento do dia de antes, não do que já foi gravado hoje.
         *          Parametrizado em 19/08/2026 para o app do dono poder lançar
         *          um dia passado — com `hojeIso()` fixo, um dia histórico
         *          herdava o encerrante do dia mais recente do banco e produzia
         *          litragem que não existiu.
         */
        async getUltimasLeiturasPorBico(postoId: number, anteriorA?: string): Promise<Map<number, number>> {
            const ultimas = new Map<number, number>();
            (await ultimaLinhaPorBico(supabase, postoId, anteriorA)).forEach((l, bicoId) => {
                ultimas.set(bicoId, Number(l.leitura_final));
            });
            return ultimas;
        },

        /**
         * Mapa `bico_id` -> `preco_litro` praticado no último dia lançado.
         *
         * @remarks Existe porque o cadastro (`Combustivel.preco_venda`) é o preço de
         *          HOJE, e lançar um dia passado com ele produz o valor errado sem
         *          nenhum aviso: em 19/08/2026, o replay de 01/01 fechou em
         *          R$ 10.503,77 contra R$ 9.430,34 da planilha — R$ 1.073 a mais,
         *          só porque a gasolina valia 6,98 no cadastro e 6,28 naquele dia.
         *          Posto não retabela todo dia: o preço vale até a próxima troca, e
         *          herdá-lo do último dia lançado acerta sozinho o caso comum.
         *          Bico sem dia anterior fica de fora, e quem chama cai no cadastro.
         */
        async getUltimosPrecosPorBico(postoId: number, anteriorA?: string): Promise<Map<number, number>> {
            const precos = new Map<number, number>();
            (await ultimaLinhaPorBico(supabase, postoId, anteriorA)).forEach((l, bicoId) => {
                const preco = Number(l.preco_litro ?? 0);
                if (preco > 0) precos.set(bicoId, preco);
            });
            return precos;
        },

        /**
         * Dias passados, dentro da janela de escrita, sem encerrante ou com
         * encerrante incompleto.
         *
         * @param bicosEsperados Quantos bicos ativos o posto tem — vem de
         *                       `getBicos`, e não de constante, porque bico
         *                       novo muda o que "completo" significa.
         *
         * @remarks Existe porque o encerrante passou a depender de UMA pessoa.
         *          Enquanto ele era enviado pelo PWA do frentista, três turnos
         *          davam três chances por dia de alguém lembrar; com o app do
         *          dono, esquecer um dia não produz nenhum sinal — o
         *          `total_vendas` daquele dia simplesmente fica no que estava,
         *          e o fechamento não concilia sem nada reclamar.
         *
         *          **HOJE NÃO ENTRA NA LISTA.** O dia corrente não está em
         *          falta, está em andamento: é exatamente o que a pessoa abriu
         *          o app para fazer. Cobrá-lo às 10h da manhã transformaria o
         *          aviso em ruído permanente, e aviso que aparece sempre deixa
         *          de ser lido.
         *
         *          Dia INCOMPLETO conta como falta, e não é preciosismo: foi o
         *          estado que derrubava a tela de Leituras do painel, e é o que
         *          faz um dia fechar com parte dos litros faltando.
         */
        async diasEmFalta(postoId: number, bicosEsperados: number): Promise<DiaEmFalta[]> {
            const hoje = hojeIso();
            const primeiro = somarDias(deIsoLocal(hoje), -DIAS_COBRAVEIS);

            const { data, error } = await supabase
                .from('Leitura')
                .select('data')
                .eq('posto_id', postoId)
                .gte('data', primeiro)
                .lt('data', hoje);
            if (error) throw new Error(error.message);

            // A coluna `data` volta como timestamp (`2026-08-16 00:00:00+00`);
            // o recorte em 10 caracteres é o dia como ele foi gravado, sem
            // passar por `new Date()` — que converteria para o fuso local e
            // escorregaria cada leitura um dia para trás.
            const lancadosPorDia = new Map<string, number>();
            for (const linha of (data ?? []) as { data: string }[]) {
                const dia = String(linha.data).slice(0, 10);
                lancadosPorDia.set(dia, (lancadosPorDia.get(dia) ?? 0) + 1);
            }

            const faltas: DiaEmFalta[] = [];
            for (let atras = DIAS_COBRAVEIS; atras >= 1; atras--) {
                const dia = somarDias(deIsoLocal(hoje), -atras);
                const lancados = lancadosPorDia.get(dia) ?? 0;
                if (lancados < bicosEsperados) {
                    faltas.push({ data: dia, bicosLancados: lancados, bicosEsperados });
                }
            }
            return faltas;
        },

        /**
         * O que já foi gravado HOJE, para a tela provar que o envio aconteceu.
         *
         * @returns `null` quando ainda não há nada gravado no dia.
         * @remarks Existe por causa de um susto real do dono no primeiro teste:
         *          ele enviou, mudou de tela, voltou — e os números tinham
         *          sumido. Não era falha de gravação (os valores estavam no
         *          banco), era a tela sem memória. Depois de enviar, ela limpa
         *          os campos e recarrega as leituras anteriores; e
         *          `getUltimasLeiturasPorBico` recorta `data < hoje` de
         *          propósito (a correção do 81a2a38), então exclui justamente o
         *          que acabou de ser gravado. A tela voltava ao estado
         *          anterior ao envio, como se nada tivesse acontecido.
         *
         *          Sem isto, não há como saber pelo app se o dia já foi
         *          enviado — o que convida ao envio duplicado e mantém a
         *          desconfiança que o sistema existe para acabar.
         */
        async encerranteDeHoje(postoId: number): Promise<EncerranteDoDia | null> {
            const { data, error } = await supabase
                .from('Leitura')
                .select('litros_vendidos, valor_total, createdAt')
                .eq('posto_id', postoId)
                .eq('data', hojeIso());
            if (error) throw new Error(error.message);

            const linhas = (data ?? []) as {
                litros_vendidos: number | null;
                valor_total: number | null;
                createdAt: string | null;
            }[];
            if (linhas.length === 0) return null;

            let gravadoEm: string | null = null;
            let litros = 0;
            let valor = 0;
            for (const l of linhas) {
                litros += Number(l.litros_vendidos ?? 0);
                valor += Number(l.valor_total ?? 0);
                if (l.createdAt && (gravadoEm === null || l.createdAt > gravadoEm)) {
                    gravadoEm = l.createdAt;
                }
            }
            return { bicos: linhas.length, litros, valor, gravadoEm };
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

            // SÓ OS BICOS QUE ESTÃO SENDO GRAVADOS, e é correção de bug real.
            //
            // O delete apagava o DIA INTEIRO e o insert repunha só os bicos
            // preenchidos. Mandar os seis, ver um dígito errado num deles e
            // reenviar SÓ aquele para corrigir apagava os outros cinco — um
            // toque, e o `total_vendas` do dia desabava para um bico. Era o
            // caminho mais natural de correção que existe.
            //
            // Sem filtro de TURNO, isso sim: o encerrante é por dia e por bico,
            // e o índice único de produção diz na letra —
            // `leitura_unica_bico_data (bico_id, data)`. O painel grava
            // `turno_id: null` e este caminho grava `1`; como `= 1` não casa
            // com NULL em SQL, filtrar por turno deixava viva a linha do outro
            // app e o insert batia no índice: `duplicate key`.
            const bicosGravados = linhas.map(l => l.bico_id);

            const { error: delError } = await supabase
                .from('Leitura')
                .delete()
                .eq('data', dataStr)
                .eq('posto_id', postoId)
                .in('bico_id', bicosGravados);
            if (delError) throw new Error(delError.message);

            // Um DELETE barrado pela RLS (dia fora da janela de escrita) devolve
            // 204 SEM erro. Seguir daqui reinseriria as leituras por cima das
            // antigas e dobraria o dia — em silêncio.
            //
            // A conferência usa o MESMO recorte do delete, inclusive nos bicos.
            // Recorte diferente já cegou esta guarda uma vez: quando ela
            // filtrava por turno e o delete também, nenhuma das duas enxergava
            // a linha órfã do painel.
            const { count: sobraram, error: erroConferencia } = await supabase
                .from('Leitura')
                .select('id', { count: 'exact', head: true })
                .eq('data', dataStr)
                .eq('posto_id', postoId)
                .in('bico_id', bicosGravados);
            if (erroConferencia) throw new Error(erroConferencia.message);
            if ((sobraram ?? 0) > 0) {
                throw new Error(
                    'Não foi possível regravar as leituras deste dia: está fora da janela de edição do banco — veja com o gerente.'
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
                        // Sem filtro de turno, pelo mesmo motivo do
                        // `salvarLeituras`: a leitura é por dia e por bico. Com
                        // o filtro, o encerrante lançado pelo PAINEL
                        // (`turno_id: null`) nunca chegava a
                        // `Fechamento.total_vendas` — o dia era conferido
                        // contra venda zero, e a diferença virava uma SOBRA que
                        // nunca existiu.
                        supabase
                            .from('Leitura')
                            .select('valor_total')
                            .eq('posto_id', pai.posto_id)
                            .eq('data', pai.data),
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
                //
                // ENCERRANTE PELA METADE TAMBÉM NÃO É VENDA COMPLETA, e esta é
                // a parte que faltava. A checagem era tudo-ou-nada
                // (`length === 0`), então um dia com 2 de 6 bicos caía no ramo
                // do dia fechado e gravava `total_vendas`/`diferenca` como se
                // estivesse completo. A venda dos bicos que faltam vira SOBRA
                // fantasma — cobrada contra o frentista, que entregou dinheiro
                // de combustível que o sistema acha que não foi vendido.
                //
                // O total de bicos vem do cadastro, não de constante: bico novo
                // muda o que "completo" significa, e constante apodreceria em
                // silêncio.
                const { count: bicosAtivos } = await supabase
                    .from('Bico')
                    .select('id', { count: 'exact', head: true })
                    .eq('posto_id', pai.posto_id)
                    .eq('ativo', true);

                const lidos = (leituras ?? []).length;
                const semEncerrante = lidos === 0 || (bicosAtivos != null && lidos < bicosAtivos);
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
