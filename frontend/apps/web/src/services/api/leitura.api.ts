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
        .map((leitura) => ({
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
        }))
        .sort((a, b) => a.id - b.id);
}

/** Leituras do dia (`AAAA-MM-DD`) do posto, lidas da API Laravel. Rota protegida: leva o Bearer da sessão. */
export function lerLeiturasDoDiaDaApi(postoId: number, dia: string): ResultAsync<LeituraDoDia[], ErroDaApi> {
    const consulta = new URLSearchParams({ data: dia }).toString();
    return buscarNaApi(`/api/postos/${postoId}/leituras?${consulta}`, respostaDeLeituras)
        .map((resposta) => paraLeiturasDoDia(resposta.data, postoId, dia));
}
