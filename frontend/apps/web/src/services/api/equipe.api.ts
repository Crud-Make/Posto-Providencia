import { errAsync, okAsync, ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, corteDaTelaLigado, enviarParaApi, type ErroDaApi } from './base';

/**
 * A tela Frentistas (gestão de equipe) pela API Laravel (#103, `docs/design/painel-pela-api.md` §10):
 * a lista, o cadastro, a edição, o "Excluir" (que é desativar) e o histórico recente de cada um.
 *
 * @remarks Nenhuma conta aqui: a diferença do histórico chega em string decimal, o Zod valida na
 *          borda e quem converte é a fonte da tela, com o mesmo `Number()` que o PostgREST fazia.
 */

/** `true` quando a tela INTEIRA fala com a API. Flag `VITE_API_FRENTISTAS`; ausente, vale o `VITE_API_URL`. */
export function equipePelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_FRENTISTAS);
}

const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/** Espelha `FrentistaDaEquipeResource.php`: só o que a tela mostra. Sem CPF e sem telefone. */
const frentistaDaEquipe = z.object({
    id: z.number().int(),
    nome: z.string(),
    data_admissao: z.string(),
    ativo: z.boolean(),
    foto: z.string().nullable(),
});

export type FrentistaDaEquipe = z.infer<typeof frentistaDaEquipe>;

const umFrentista = z.object({ data: frentistaDaEquipe });

/** Corpo de `POST /equipe` e `PUT /equipe/{frentista}` — espelha `FrentistaDaEquipeRequest.php`. */
export const frentistaDeclarado = z.object({
    nome: z.string().trim().min(1, 'nome vazio'),
    data_admissao: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'admissão fora de AAAA-MM-DD'),
    ativo: z.boolean(),
});

export type FrentistaDeclarado = z.infer<typeof frentistaDeclarado>;

/** Espelha `ItemDoHistoricoResource.php` — só o que o detalhe usa. */
const itemDoHistorico = z.object({
    id: z.number().int(),
    diferenca_calculada: decimalEmString.nullable(),
    fechamento: z.object({ data: z.string(), turno_id: z.number().int().nullable() }).nullable(),
});

export type ItemDoHistoricoDaApi = z.infer<typeof itemDoHistorico>;

/** Espelha `TurnoResource.php` — o nome do turno, que o histórico traz só pelo id. */
const turnoDaApi = z.object({ id: z.number().int(), nome: z.string() });

export interface HistoricoDaApi {
    readonly itens: readonly ItemDoHistoricoDaApi[];
    readonly nomeDoTurno: ReadonlyMap<number, string>;
}

/** Ativos e inativos do posto, por nome. */
export function lerEquipeDaApi(postoId: number): ResultAsync<FrentistaDaEquipe[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/equipe`, z.object({ data: z.array(frentistaDaEquipe) })).map((r) => r.data);
}

/** O corpo passa pelo schema antes de sair: nome em branco não chega ao servidor. */
function validado(corpo: FrentistaDeclarado): ResultAsync<FrentistaDeclarado, ErroDaApi> {
    const lido = frentistaDeclarado.safeParse(corpo);
    return lido.success ? okAsync(lido.data) : errAsync({ tipo: 'formato', detalhe: lido.error.message });
}

export function cadastrarFrentistaNaApi(postoId: number, corpo: FrentistaDeclarado): ResultAsync<FrentistaDaEquipe, ErroDaApi> {
    return validado(corpo)
        .andThen((limpo) => enviarParaApi(`/api/postos/${postoId}/equipe`, 'POST', limpo, umFrentista))
        .map((r) => r.data);
}

export function editarFrentistaNaApi(postoId: number, frentistaId: number, corpo: FrentistaDeclarado): ResultAsync<FrentistaDaEquipe, ErroDaApi> {
    return validado(corpo)
        .andThen((limpo) => enviarParaApi(`/api/postos/${postoId}/equipe/${frentistaId}`, 'PUT', limpo, umFrentista))
        .map((r) => r.data);
}

/** O "Excluir" da tela: `ativo = false` no servidor, que também derruba as sessões de PIN dele. */
export function desativarFrentistaNaApi(postoId: number, frentistaId: number): ResultAsync<FrentistaDaEquipe, ErroDaApi> {
    return enviarParaApi(`/api/postos/${postoId}/equipe/${frentistaId}/desativar`, 'POST', {}, umFrentista).map((r) => r.data);
}

/** Os 30 envios mais novos do frentista e o nome de cada turno do posto. */
export function lerHistoricoDaEquipeDaApi(postoId: number, frentistaId: number): ResultAsync<HistoricoDaApi, ErroDaApi> {
    return ResultAsync.combine([
        buscarNaApi(`/api/postos/${postoId}/equipe/${frentistaId}/historico`, z.object({ data: z.array(itemDoHistorico) })),
        buscarNaApi(`/api/postos/${postoId}/turnos`, z.object({ data: z.array(turnoDaApi) })),
    ] as const).map(([historico, turnos]) => ({
        itens: historico.data,
        nomeDoTurno: new Map(turnos.data.map((t) => [t.id, t.nome] as const)),
    }));
}
