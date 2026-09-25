import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { Leitura } from '../../types/database/index';
import { buscarNaApi, type ErroDaApi } from './base';

/**
 * Decimal em string, como o cast `decimal:2`/`decimal:3` do Eloquent entrega — o backend nunca
 * manda float (mesmo contrato de `bico.api.ts` e `dashboard.api.ts`; `LeiturasDoDiaTest` prova
 * as aspas no JSON cru). Número cru aqui é resposta fora do contrato, não dado a converter.
 */
const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/**
 * Contrato de `GET /api/postos/{posto}/leituras?data=AAAA-MM-DD` — espelha
 * `backend/app/Fechamento/Http/Resources/LeituraResource.php`.
 *
 * @remarks
 * `data` chega em ISO 8601 Zulu (`2026-09-20T00:00:00Z`), que é `toIso8601ZuluString()` do
 * Carbon. Não há relação aninhada: bico e combustível são de `Cadastro` (CA-7).
 */
const leituraDaApi = z.object({
    id: z.number().int(),
    data: z.string(),
    bico_id: z.number().int(),
    combustivel_id: z.number().int(),
    turno_id: z.number().int().nullable(),
    leitura_inicial: decimalEmString,
    leitura_final: decimalEmString,
    litros_vendidos: decimalEmString,
    preco_litro: decimalEmString,
    valor_total: decimalEmString,
});

const respostaDeLeituras = z.object({ data: z.array(leituraDaApi) });

export type LeituraDaApi = z.infer<typeof leituraDaApi>;

/**
 * Leitura do dia como o painel a consome: a linha da tabela sem `createdAt` e `usuario_id`, que
 * o Resource não expõe (`LeituraResource.php:29-40`). O fechamento diário lê só `bico_id`,
 * `leitura_inicial`, `leitura_final` e `preco_litro`; quem precisar dos dois campos pela API
 * amplia o Resource, não este tipo.
 */
export type LeituraDoDia = Omit<Leitura, 'createdAt' | 'usuario_id'>;

/** Instante em que o Supabase grava o dia: `data: 'AAAA-MM-DD'` vira meia-noite UTC. */
function meiaNoiteUtc(dia: string): number {
    return Date.parse(`${dia}T00:00:00Z`);
}

/**
 * Converte a resposta da API na mesma lista que o Supabase devolve em `leituraService.getByDate`.
 *
 * @remarks
 * Paridade com a query antiga (`.eq('data', dia)`, `.order('id')`), campo a campo:
 *
 * - **Recorte do dia.** O Supabase compara `data` (timestamptz) com `'AAAA-MM-DD'`, que é
 *   IGUALDADE em meia-noite UTC — o mesmo instante que todo escritor grava
 *   (`useSubmissaoFechamento.ts:145`, `api-core/encerrante.ts:497`) e o mesmo recorte do DELETE
 *   que o Salvar faz antes de regravar (I5, `leitura.service.ts:413-429`). A API devolve a janela
 *   `[00:00Z, +1 dia)` (`LeiturasDoDia.php`), então uma leitura com hora dentro do dia entraria
 *   aqui sem entrar lá — e o Salvar não a apagaria. O recorte fica no cliente, comparando
 *   instantes (nunca convertendo fuso: `Leitura.data` é UTC, e olhar em horário local escorrega
 *   cada leitura um dia para trás).
 * - **Ordem.** A API ordena por `bico_id`; o Supabase por `id`. Reordena-se por `id`.
 * - **Números.** Litros e dinheiro chegam como string decimal e viram `number` por `Number()`,
 *   o mesmo valor que o PostgREST serializa do `numeric` — sem arredondar, sem escala.
 *   `formatarParaBR` chama `toLocaleString` no valor: em string devolveria `"123.456"` cru.
 * - **`data`.** Fica como a API manda (`...T00:00:00Z`); o PostgREST mandava `...T00:00:00+00:00`.
 *   Mesmo instante, forma diferente, e o fechamento diário não lê esse campo.
 * - `posto_id` não sai no Resource; vem do posto pedido, que é o escopo da própria rota.
 */
export function paraLeiturasDoDia(lidas: readonly LeituraDaApi[], postoId: number, dia: string): LeituraDoDia[] {
    const instanteDoDia = meiaNoiteUtc(dia);
    return lidas
        .filter((leitura) => Date.parse(leitura.data) === instanteDoDia)
        .map((leitura) => paraLeitura(leitura, postoId))
        .sort((a, b) => a.id - b.id);
}

/** Uma linha da API como o Supabase a entregava: string decimal → `Number()`, sem arredondar. */
function paraLeitura(leitura: LeituraDaApi, postoId: number): LeituraDoDia {
    return {
        id: leitura.id,
        data: leitura.data,
        bico_id: leitura.bico_id,
        combustivel_id: leitura.combustivel_id,
        turno_id: leitura.turno_id,
        leitura_inicial: Number(leitura.leitura_inicial),
        leitura_final: Number(leitura.leitura_final),
        litros_vendidos: Number(leitura.litros_vendidos),
        preco_litro: Number(leitura.preco_litro),
        valor_total: Number(leitura.valor_total),
        posto_id: postoId,
    };
}

/**
 * Converte a resposta de `GET /leituras/ultimas?antes_de=` na lista que `leituraService.getLastReading`
 * devolvia: uma leitura por bico, a mais nova antes do dia.
 *
 * @remarks O servidor já deduplica (`DISTINCT ON (bico_id)`), então aqui só se converte. A única
 *          diferença contra o Supabase é a favor do dado: lá eram as 200 linhas mais novas
 *          deduplicadas no cliente, e o bico cuja última leitura ficasse fora delas sumia — e a
 *          tela o semeava com `0,000`, o odômetro inteiro virando venda (`UltimasLeiturasAntesDe.php`).
 */
export function paraUltimasLeituras(lidas: readonly LeituraDaApi[], postoId: number): LeituraDoDia[] {
    return lidas.map((leitura) => paraLeitura(leitura, postoId));
}

/**
 * Converte a resposta de `GET /leituras?data=&ate=` na lista de `leituraService.getByDateRange`.
 *
 * @remarks Recorte com a mesma borda do Supabase (`.gte('data', inicio).lte('data', fim)`, isto é,
 *          `[inicio 00:00Z, fim 00:00Z]`): a API devolve até o fim do último dia, e uma leitura com
 *          hora dentro dele entraria aqui sem entrar lá. Ordem por `data` e, no empate, por `id`.
 */
export function paraLeiturasDoPeriodo(lidas: readonly LeituraDaApi[], postoId: number, inicio: string, fim: string): LeituraDoDia[] {
    const de = meiaNoiteUtc(inicio);
    const ate = meiaNoiteUtc(fim);
    return lidas
        .filter((leitura) => {
            const instante = Date.parse(leitura.data);
            return instante >= de && instante <= ate;
        })
        .map((leitura) => paraLeitura(leitura, postoId))
        .sort((a, b) => {
            const porData = Date.parse(a.data) - Date.parse(b.data);
            return porData !== 0 ? porData : a.id - b.id;
        });
}

/** Leituras do dia (`AAAA-MM-DD`) do posto, lidas da API Laravel. Rota protegida: leva o Bearer da sessão. */
export function lerLeiturasDoDiaDaApi(postoId: number, dia: string): ResultAsync<LeituraDoDia[], ErroDaApi> {
    const consulta = new URLSearchParams({ data: dia }).toString();
    return buscarNaApi(`/api/postos/${postoId}/leituras?${consulta}`, respostaDeLeituras)
        .map((resposta) => paraLeiturasDoDia(resposta.data, postoId, dia));
}

/**
 * A última leitura de cada bico ANTES do dia (`AAAA-MM-DD`, exclusivo) — o encerrante inicial de um
 * dia novo. Rota protegida: leva o Bearer da sessão.
 */
export function lerUltimasLeiturasDaApi(postoId: number, antesDe: string): ResultAsync<LeituraDoDia[], ErroDaApi> {
    const consulta = new URLSearchParams({ antes_de: antesDe }).toString();
    return buscarNaApi(`/api/postos/${postoId}/leituras/ultimas?${consulta}`, respostaDeLeituras)
        .map((resposta) => paraUltimasLeituras(resposta.data, postoId));
}

/** Leituras de `inicio` a `fim` (inclusive), lidas da API Laravel — o mês da aba Fechamento Mensal. */
export function lerLeiturasDoPeriodoDaApi(postoId: number, inicio: string, fim: string): ResultAsync<LeituraDoDia[], ErroDaApi> {
    const consulta = new URLSearchParams({ data: inicio, ate: fim }).toString();
    return buscarNaApi(`/api/postos/${postoId}/leituras?${consulta}`, respostaDeLeituras)
        .map((resposta) => paraLeiturasDoPeriodo(resposta.data, postoId, inicio, fim));
}
