/**
 * Presença do frentista: traduz "visto pela última vez em X" no que o dono lê
 * no painel.
 *
 * @module @posto/utils/presenca
 *
 * @remarks
 * **Por que "visto por último" e não presença ao vivo.** O frentista trabalha
 * com o celular no bolso: assim que a tela bloqueia, o Safari suspende a aba e
 * qualquer websocket cai em segundos. Uma presença ao vivo mostraria o frentista
 * *offline* às 23h, com ele em pé na bomba — mentiria justo na hora que o dono
 * pergunta. Um carimbo de tempo sobrevive à tela bloqueada e diz exatamente o
 * que se sabe: quando o app dele deu sinal pela última vez.
 *
 * **O que isto NÃO é.** O PWA não tem autenticação (decisão do dono, 29/07):
 * quem abre o link escolhe o nome que quiser. Presença aqui é coordenação
 * ("alguém abriu o app como Paulo agora há pouco"), nunca controle de ponto.
 */

export const STATUS_PRESENCA = ['online', 'ausente', 'offline'] as const;
export type StatusPresenca = (typeof STATUS_PRESENCA)[number];

/** De quanto em quanto tempo o PWA manda sinal de vida. */
export const INTERVALO_SINAL_MS = 2 * 60 * 1000;

/**
 * Até aqui conta como `online`.
 *
 * @remarks São 3 intervalos de sinal. Tolerar menos que isso faria o frentista
 *          piscar entre online e ausente a cada engasgo de rede do posto —
 *          e status que pisca o dono aprende a ignorar.
 */
export const LIMITE_ONLINE_MS = 3 * INTERVALO_SINAL_MS;

/** Até aqui conta como `ausente`; além disso, `offline`. */
export const LIMITE_AUSENTE_MS = 30 * 60 * 1000;

/**
 * Além disso a presença nem aparece na lista.
 *
 * @remarks 12h cobre um dia de trabalho inteiro sem arrastar o turno de ontem
 *          para a tela de hoje.
 */
export const LIMITE_LISTAGEM_MS = 12 * 60 * 60 * 1000;

/**
 * Quanto tempo se passou desde o último sinal, em ms.
 *
 * @remarks Nunca negativo. O carimbo vem do relógio do **servidor**, mas o
 *          `agora` é o do navegador do dono — se ele estiver alguns segundos
 *          atrasado, a subtração daria negativo e o frentista apareceria no
 *          futuro. Zero é a leitura honesta desse caso.
 */
export function msDesde(vistoEm: Date, agora: Date): number {
    return Math.max(0, agora.getTime() - vistoEm.getTime());
}

/**
 * Classifica a presença a partir do último sinal.
 *
 * @param vistoEm - Instante do último sinal de vida.
 * @param agora - Instante da leitura.
 */
export function statusPresenca(vistoEm: Date, agora: Date): StatusPresenca {
    const decorrido = msDesde(vistoEm, agora);

    if (decorrido <= LIMITE_ONLINE_MS) return 'online';
    if (decorrido <= LIMITE_AUSENTE_MS) return 'ausente';

    return 'offline';
}

/**
 * Texto curto para o painel: "agora mesmo", "há 12 min", "há 3 h".
 *
 * @remarks Arredonda para baixo de propósito. "Há 3 h" quando faz 3h59 é menos
 *          ruim que "há 4 h" quando faz 3h01: o dono usa isso para decidir se
 *          liga para o frentista, e superestimar o sumiço gera ligação à toa.
 */
export function descreverPresenca(vistoEm: Date, agora: Date): string {
    const decorrido = msDesde(vistoEm, agora);
    const minutos = Math.floor(decorrido / 60_000);

    if (minutos < 1) return 'agora mesmo';
    if (minutos < 60) return `há ${minutos} min`;

    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `há ${horas} h`;

    const dias = Math.floor(horas / 24);
    return dias === 1 ? 'há 1 dia' : `há ${dias} dias`;
}

/** O mínimo que a lista precisa saber de cada frentista. */
export interface PresencaFrentista {
    readonly frentistaId: number;
    readonly nome: string;
    readonly vistoEm: Date;
}

/**
 * Quem entra na lista "Trabalhando agora", do mais recente para o mais antigo.
 *
 * @remarks A ordenação é o produto: o dono olha a primeira linha e já sabe
 *          quem está no posto. Filtra o que passou de {@link LIMITE_LISTAGEM_MS}
 *          para o turno de ontem não poluir a tela de hoje.
 */
export function presencasRelevantes<T extends PresencaFrentista>(
    presencas: readonly T[],
    agora: Date,
): T[] {
    return presencas
        .filter(p => msDesde(p.vistoEm, agora) <= LIMITE_LISTAGEM_MS)
        .sort((a, b) => b.vistoEm.getTime() - a.vistoEm.getTime());
}
