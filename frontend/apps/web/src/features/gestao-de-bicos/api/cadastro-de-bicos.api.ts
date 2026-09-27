import { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, corteDaTelaLigado, enviarParaApi, type ErroDaApi } from '@/services/api/base';

/**
 * A pista do posto pela API Laravel (#153, #157): o catálogo que a tela mostra e as escritas
 * (`POST`/`PUT` de `/bombas`, `/bicos`, `/combustiveis` e `/tanques`). O posto vai na ROTA, nunca no corpo; se bomba,
 * combustível e tanque são do posto e casam entre si é o servidor quem decide (recusa com código).
 */

/** `true` quando a gestão de bicos fala com a API. Flag `VITE_API_BICOS`; ausente, vale o `VITE_API_URL`. */
export function bicosPelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_BICOS);
}

/** Espelha `BombaResource.php`. */
const bomba = z.object({
    id: z.number().int(),
    nome: z.string(),
    localizacao: z.string().nullable(),
    ativo: z.boolean(),
});

/** Decimal do Postgres serializado pelo Laravel (`decimal:2`): string, nunca float. */
const decimalEmString = z.string().regex(/^\d+(\.\d+)?$/, 'decimal fora de string');

/** Espelha `CombustivelResource.php` — só o que a tela usa. */
const combustivel = z.object({
    id: z.number().int(),
    nome: z.string(),
    codigo: z.string(),
    cor: z.string().nullable(),
    ativo: z.boolean(),
    preco_venda: decimalEmString,
});

/** Espelha `TanqueResource.php` — só o que a tela usa. */
const tanque = z.object({
    id: z.number().int(),
    nome: z.string(),
    combustivel_id: z.number().int(),
    capacidade: decimalEmString,
    ativo: z.boolean().nullable(),
});

/** Espelha `BicoResource.php` com as três relações carregadas. */
const bico = z.object({
    id: z.number().int(),
    numero: z.number().int(),
    ativo: z.boolean(),
    bomba: z.object({ id: z.number().int() }),
    combustivel: z.object({ id: z.number().int() }),
    tanque: z.object({ id: z.number().int() }).nullable(),
});

export type BombaDaApi = z.infer<typeof bomba>;
export type CombustivelDaApi = z.infer<typeof combustivel>;
export type TanqueDaApi = z.infer<typeof tanque>;
export type BicoDaApi = z.infer<typeof bico>;

/** Corpo de `POST /bombas` e `PUT /bombas/{bomba}` — espelha `BombaDoPainelRequest.php`. */
export interface BombaDeclarada {
    readonly nome: string;
    readonly localizacao: string | null;
    readonly ativo: boolean;
}

/** Corpo de `POST /bicos` e `PUT /bicos/{bico}` — espelha `BicoDoPainelRequest.php`. */
export interface BicoDeclarado {
    readonly numero: number;
    readonly bomba_id: number;
    readonly combustivel_id: number;
    readonly tanque_id: number;
    readonly ativo: boolean;
}

/** Corpo de `POST /combustiveis` e `PUT /combustiveis/{id}` — espelha `CombustivelDoPainelRequest.php`. */
export interface CombustivelDeclarado {
    readonly nome: string;
    readonly codigo: string;
    readonly cor: string | null;
    /** String decimal com ponto e até 2 casas ("6.89"): dinheiro não passa por float. */
    readonly preco_venda: string;
    readonly ativo: boolean;
}

/** Corpo de `POST /tanques` e `PUT /tanques/{id}` — espelha `TanqueDoPainelRequest.php`. Sem estoque. */
export interface TanqueDeclarado {
    readonly nome: string;
    readonly combustivel_id: number;
    /** Litros, string decimal ("20000"). */
    readonly capacidade: string;
    readonly ativo: boolean;
}

export interface PistaDaApi {
    readonly bombas: readonly BombaDaApi[];
    readonly bicos: readonly BicoDaApi[];
    readonly combustiveis: readonly CombustivelDaApi[];
    readonly tanques: readonly TanqueDaApi[];
}

const lista = <T>(item: z.ZodType<T>) => z.object({ data: z.array(item) });

/** O catálogo inteiro da pista do posto — ativos e inativos. */
export function lerPistaDaApi(postoId: number): ResultAsync<PistaDaApi, ErroDaApi> {
    const base = `/api/postos/${postoId}`;
    return ResultAsync.combine([
        buscarNaApi(`${base}/bombas`, lista(bomba)),
        buscarNaApi(`${base}/bicos`, lista(bico)),
        buscarNaApi(`${base}/combustiveis`, lista(combustivel)),
        buscarNaApi(`${base}/tanques`, lista(tanque)),
    ] as const).map(([b, bi, c, t]) => ({ bombas: b.data, bicos: bi.data, combustiveis: c.data, tanques: t.data }));
}

/** Cria (`id` nulo) ou edita a bomba. */
export function gravarBombaNaApi(postoId: number, id: number | null, corpo: BombaDeclarada): ResultAsync<BombaDaApi, ErroDaApi> {
    const caminho = id === null ? `/api/postos/${postoId}/bombas` : `/api/postos/${postoId}/bombas/${id}`;
    return enviarParaApi(caminho, id === null ? 'POST' : 'PUT', corpo, z.object({ data: bomba })).map((r) => r.data);
}

/** Cria (`id` nulo) ou edita o bico. */
export function gravarBicoNaApi(postoId: number, id: number | null, corpo: BicoDeclarado): ResultAsync<BicoDaApi, ErroDaApi> {
    const caminho = id === null ? `/api/postos/${postoId}/bicos` : `/api/postos/${postoId}/bicos/${id}`;
    return enviarParaApi(caminho, id === null ? 'POST' : 'PUT', corpo, z.object({ data: bico })).map((r) => r.data);
}

/** Cria (`id` nulo) ou edita o combustível. */
export function gravarCombustivelNaApi(postoId: number, id: number | null, corpo: CombustivelDeclarado): ResultAsync<CombustivelDaApi, ErroDaApi> {
    const caminho = id === null ? `/api/postos/${postoId}/combustiveis` : `/api/postos/${postoId}/combustiveis/${id}`;
    return enviarParaApi(caminho, id === null ? 'POST' : 'PUT', corpo, z.object({ data: combustivel })).map((r) => r.data);
}

/** Cria (`id` nulo) ou edita o tanque. */
export function gravarTanqueNaApi(postoId: number, id: number | null, corpo: TanqueDeclarado): ResultAsync<TanqueDaApi, ErroDaApi> {
    const caminho = id === null ? `/api/postos/${postoId}/tanques` : `/api/postos/${postoId}/tanques/${id}`;
    return enviarParaApi(caminho, id === null ? 'POST' : 'PUT', corpo, z.object({ data: tanque })).map((r) => r.data);
}
