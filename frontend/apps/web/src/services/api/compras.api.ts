import { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, corteDaTelaLigado, enviarParaApi, type ErroDaApi } from './base';
import { lerMovimentoDaApi, type MovimentoDaApi } from './proprietario.api';

/**
 * O Registro de Compras pela API Laravel (#103) — o catálogo que a tela lê, o movimento do mês
 * (`GET /movimento`, o mesmo da Visão do Proprietário) e o "Salvar" (`POST /compras`).
 *
 * @remarks
 * Nenhuma conta aqui: litros e dinheiro chegam e saem em string decimal, o Zod valida na borda e o
 * `Number()` da leitura é o mesmo que o PostgREST fazia. O custo médio, o estoque escritural e o
 * "Valor p/ Venda" continuam em `@posto/utils` e em `useCalculosRegistro`.
 */

/**
 * `true` quando a tela INTEIRA — fornecedores, vendas, compras, régua, despesa e o "Salvar" — fala
 * com a API. A flag é a `VITE_API_FORNECEDOR`, que já era o corte desta tela (o fornecedor foi a
 * primeira leitura dela a migrar, e `docs/design/producao.md` usa `=0` para deixar o Registro de
 * Compras no Supabase). Uma flag só: a tela nunca fica metade em cada motor.
 */
export function registroDeComprasPelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_FORNECEDOR);
}

const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/** Espelha `CombustivelResource.php` — só o que a tela usa. Inativo vem junto; quem filtra é a tela. */
const combustivelDaApi = z.object({
    id: z.number().int(),
    nome: z.string(),
    codigo: z.string(),
    ativo: z.boolean(),
    preco_venda: decimalEmString,
});

/** Espelha `TanqueResource.php`. `ativo` é `boolean` nullable no esquema. */
const tanqueDaApi = z.object({
    id: z.number().int(),
    nome: z.string(),
    combustivel_id: z.number().int(),
    ativo: z.boolean().nullable(),
});

/** Espelha `BicoResource.php` — o número do bico, que o movimento não traz. */
const bicoDaApi = z.object({ id: z.number().int(), numero: z.number().int() });

export type CombustivelDaApi = z.infer<typeof combustivelDaApi>;
export type TanqueDaApi = z.infer<typeof tanqueDaApi>;
export type BicoDaApi = z.infer<typeof bicoDaApi>;

export interface DadosDoRegistroDaApi {
    readonly combustiveis: readonly CombustivelDaApi[];
    readonly tanques: readonly TanqueDaApi[];
    readonly bicos: readonly BicoDaApi[];
    readonly movimento: MovimentoDaApi;
}

/** O catálogo do posto e o movimento do período `[inicio, fim]`, numa leitura só. */
export function lerRegistroDoPeriodoDaApi(postoId: number, inicio: string, fim: string): ResultAsync<DadosDoRegistroDaApi, ErroDaApi> {
    return ResultAsync.combine([
        buscarNaApi(`/api/postos/${postoId}/combustiveis`, z.object({ data: z.array(combustivelDaApi) })),
        buscarNaApi(`/api/postos/${postoId}/tanques`, z.object({ data: z.array(tanqueDaApi) })),
        buscarNaApi(`/api/postos/${postoId}/bicos`, z.object({ data: z.array(bicoDaApi) })),
        lerMovimentoDaApi(postoId, inicio, fim),
    ] as const).map(([combustiveis, tanques, bicos, movimento]) => ({
        combustiveis: combustiveis.data,
        tanques: tanques.data,
        bicos: bicos.data,
        movimento,
    }));
}

/**
 * Corpo de `POST /api/postos/{posto}/compras` — espelha `RegistraComprasRequest.php`. Litros até 3
 * casas, dinheiro até 2, volume com as casas do float da tela (o `numeric(10,2)` arredonda).
 */
export const registroDeComprasDeclarado = z.object({
    chave: z.string().uuid(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fornecedor_id: z.number().int().positive().nullable(),
    itens: z
        .array(
            z.object({
                combustivel_id: z.number().int().positive(),
                tanque_id: z.number().int().positive().nullable(),
                compra: z
                    .object({
                        quantidade_litros: z.string().regex(/^\d{1,13}(\.\d{1,3})?$/),
                        valor_total: z.string().regex(/^\d{1,13}(\.\d{1,2})?$/),
                    })
                    .nullable(),
                volume_livro: z.string().regex(/^-?\d{1,8}(\.\d{1,20})?$/).nullable(),
                volume_fisico: z.string().regex(/^\d{1,8}(\.\d{1,20})?$/).nullable(),
            }),
        )
        .min(1),
});

export type RegistroDeComprasDeclarado = z.infer<typeof registroDeComprasDeclarado>;

/** Resposta do `POST /compras` — espelha `RespostaDaCompra.php` e `CompraResource.php`. */
const registroGravadoDaApi = z.object({
    data: z.object({
        repetido: z.boolean(),
        compras: z.array(
            z.object({
                id: z.number().int(),
                combustivel_id: z.number().int(),
                fornecedor_id: z.number().int(),
                data: z.string(),
                quantidade_litros: decimalEmString,
                valor_total: decimalEmString,
                custo_por_litro: decimalEmString,
            }),
        ),
        medicoes: z.array(
            z.object({
                tanque_id: z.number().int(),
                data: z.string(),
                volume_livro: decimalEmString.nullable(),
                volume_fisico: decimalEmString.nullable(),
            }),
        ),
    }),
});

export type RegistroGravadoDaApi = z.infer<typeof registroGravadoDaApi>['data'];

/** O "Salvar": uma transação no servidor, idempotente pela `chave`. */
export function gravarRegistroDeComprasNaApi(postoId: number, corpo: RegistroDeComprasDeclarado): ResultAsync<RegistroGravadoDaApi, ErroDaApi> {
    return enviarParaApi(`/api/postos/${postoId}/compras`, 'POST', corpo, registroGravadoDaApi).map((resposta) => resposta.data);
}
