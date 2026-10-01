/**
 * Os envios de fechamento dos frentistas pela API Laravel (#102) — a tela Envios do dono.
 *
 * @remarks Duas rotas: `GET /sessoes?data=` (o que cada frentista mandou, ordenado por
 *          `frentista_id`) e `GET /equipe` (nome e foto). O Supabase fazia isso num join só; aqui
 *          o join é no cliente, e a ordem por hora de envio também.
 *
 *          **`null` continua `null`** (invariante I8 do backend): diferença não apurada não é
 *          zero, e chamá-la de "bateu" afirmaria sobre dinheiro o que ninguém conferiu.
 *
 *          A equipe é `gerir` no servidor. Se a conta não puder lê-la (403), os envios aparecem
 *          mesmo assim, com "Frentista" no lugar do nome — o dinheiro é o que importa nesta tela.
 *          401 não é engolido: é sessão perdida, e o cliente já mandou o App para a entrada.
 */
import { okAsync, ResultAsync, errAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, decimalEmString, type ErroDaApi } from './cliente';

const envioDaApi = z.object({
    id: z.number().int(),
    fechamento_id: z.number().int(),
    frentista_id: z.number().int(),
    valor_conferido: decimalEmString.nullable(),
    encerrante: decimalEmString.nullable(),
    diferenca_calculada: decimalEmString.nullable(),
    data_hora_envio: z.string().nullable(),
});
export type EnvioDaApi = z.infer<typeof envioDaApi>;

const frentistaDaEquipe = z.object({
    id: z.number().int(),
    nome: z.string(),
    foto: z.string().nullable(),
});
export type FrentistaDaEquipe = z.infer<typeof frentistaDaEquipe>;

/** Uma linha da tela: o envio com o nome do frentista resolvido. Mesma forma do `api-core`. */
export interface EnvioDeFechamento {
    readonly id: number;
    readonly frentista_id: number;
    readonly frentista: { readonly nome: string; readonly foto: string | null } | null;
    readonly valor_conferido: number | null;
    readonly encerrante: number | null;
    /** Positivo = FALTA, negativo = SOBRA. `null` = não apurada. */
    readonly diferenca_calculada: number | null;
    readonly data_hora_envio: string | null;
}

const numeroOuNulo = (valor: string | null): number | null => (valor === null ? null : Number(valor));

/** Instante para ordenar; envio sem hora vai para o fim. */
const instante = (iso: string | null): number => (iso === null ? Number.POSITIVE_INFINITY : Date.parse(iso));

/**
 * Junta envios e equipe e ordena do envio mais antigo para o mais recente (no empate, pelo `id`).
 */
export function juntarEnvios(envios: readonly EnvioDaApi[], equipe: readonly FrentistaDaEquipe[]): EnvioDeFechamento[] {
    const porId = new Map(equipe.map((f) => [f.id, f] as const));
    return [...envios]
        .sort((a, b) => {
            const ia = instante(a.data_hora_envio);
            const ib = instante(b.data_hora_envio);
            // Comparação, e não subtração: dois envios sem hora dariam `Infinity − Infinity = NaN`.
            if (ia !== ib) return ia < ib ? -1 : 1;
            return a.id - b.id;
        })
        .map((e) => {
            const frentista = porId.get(e.frentista_id);
            return {
                id: e.id,
                frentista_id: e.frentista_id,
                frentista: frentista === undefined ? null : { nome: frentista.nome, foto: frentista.foto },
                valor_conferido: numeroOuNulo(e.valor_conferido),
                encerrante: numeroOuNulo(e.encerrante),
                diferenca_calculada: numeroOuNulo(e.diferenca_calculada),
                data_hora_envio: e.data_hora_envio,
            };
        });
}

/** A equipe, ou lista vazia quando a conta não pode lê-la (403). Outros erros passam. */
function equipeOuVazia(postoId: number): ResultAsync<FrentistaDaEquipe[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/equipe`, z.object({ data: z.array(frentistaDaEquipe) }))
        .map((r) => r.data)
        .orElse((erro) => (erro.tipo === 'http' && erro.status === 403 ? okAsync([]) : errAsync(erro)));
}

/** Os envios de um dia, com nome e foto, do mais antigo para o mais recente. */
export function lerEnviosDoDia(postoId: number, dia: string): ResultAsync<EnvioDeFechamento[], ErroDaApi> {
    const consulta = new URLSearchParams({ data: dia }).toString();
    return ResultAsync.combine([
        buscarNaApi(`/api/postos/${postoId}/sessoes?${consulta}`, z.object({ data: z.array(envioDaApi) })),
        equipeOuVazia(postoId),
    ] as const).map(([envios, equipe]) => juntarEnvios(envios.data, equipe));
}
