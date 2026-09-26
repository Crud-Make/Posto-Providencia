import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, corteDaTelaLigado, enviarParaApi, type ErroDaApi } from './base';

/**
 * A tela "Tanques (Combustível)" pela API Laravel (#103, `painel-pela-api.md` §11) — a leitura
 * (`GET /tanques/painel`) e a "Nova Medição (Régua)" (`PUT /tanques/medicoes`).
 *
 * @remarks
 * Nenhuma conta aqui: litros e dinheiro chegam em string decimal, o Zod valida na borda e o
 * `Number()` é o mesmo que o PostgREST fazia. O estoque derivado, o rateio da despesa e o lucro
 * previsto continuam no cliente, nas mesmas funções do caminho do Supabase.
 */

/**
 * `true` quando a tela INTEIRA — leitura e medição — fala com a API. `VITE_API_TANQUES` ausente
 * segue o `VITE_API_URL`; `0` a deixa no Supabase. Uma flag só: a tela nunca fica metade em cada motor.
 */
export function tanquesPelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_TANQUES);
}

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data fora de aaaa-mm-dd');
const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/** Espelha `backend/app/Estoque/Application/PainelDeTanques.php`. */
export const painelDeTanquesDaApi = z.object({
    mes: z.object({ inicio: dataIso, fim: dataIso }),
    movimento_desde: dataIso,
    tanques: z.array(
        z.object({
            id: z.number().int(),
            nome: z.string(),
            combustivel_id: z.number().int(),
            capacidade: decimalEmString,
            combustivel: z.object({
                nome: z.string(),
                codigo: z.string(),
                preco_venda: decimalEmString,
                /** `numeric` anulável no esquema: `null` continua `null`. */
                preco_custo: decimalEmString.nullable(),
            }),
        }),
    ),
    reguas: z.array(z.object({ tanque_id: z.number().int(), data: dataIso, volume_fisico: decimalEmString })),
    compras: z.array(z.object({ combustivel_id: z.number().int(), data: dataIso, quantidade_litros: decimalEmString })),
    vendas: z.array(z.object({ combustivel_id: z.number().int(), data: dataIso, litros_vendidos: decimalEmString })),
    despesas: z.array(z.object({ data: dataIso, valor: decimalEmString })),
    historico: z.array(
        z.object({
            id: z.number().int(),
            tanque_id: z.number().int(),
            data: dataIso,
            volume_livro: decimalEmString.nullable(),
            volume_fisico: decimalEmString.nullable(),
        }),
    ),
});

export type PainelDeTanquesDaApi = z.infer<typeof painelDeTanquesDaApi>;

/**
 * A tela inteira do posto. `mes` (`AAAA-MM`) e `historicoDesde` (`AAAA-MM-DD`) são do relógio LOCAL
 * do painel, como no caminho do Supabase. Rota `posto.acesso:gerir`: quem não gere leva 403.
 */
export function lerPainelDeTanquesDaApi(postoId: number, mes: string, historicoDesde: string): ResultAsync<PainelDeTanquesDaApi, ErroDaApi> {
    const consulta = new URLSearchParams({ mes, historico_desde: historicoDesde }).toString();
    return buscarNaApi(`/api/postos/${postoId}/tanques/painel?${consulta}`, painelDeTanquesDaApi);
}

/**
 * Corpo de `PUT /tanques/medicoes` — espelha `MedicaoDoPainelRequest.php`. O volume vai com as
 * casas do float do modal (`String(numero)`, o mesmo texto que o `JSON.stringify` do supabase-js
 * mandava) e o `numeric(10,2)` arredonda no banco, como antes.
 */
export const medicaoDoPainel = z.object({
    tanque_id: z.number().int().positive(),
    data: dataIso,
    volume_fisico: z.string().regex(/^\d{1,7}(\.\d{1,20})?$/, 'volume fora do contrato'),
});

export type MedicaoDoPainel = z.infer<typeof medicaoDoPainel>;

const medicaoGravada = z.object({
    data: z.object({ tanque_id: z.number().int(), data: dataIso, volume_fisico: decimalEmString }),
});

export type MedicaoGravada = z.infer<typeof medicaoGravada>['data'];

/** Upsert por tanque e dia: gravar de novo é o mesmo 200. */
export function gravarMedicaoNaApi(postoId: number, corpo: MedicaoDoPainel): ResultAsync<MedicaoGravada, ErroDaApi> {
    return enviarParaApi(`/api/postos/${postoId}/tanques/medicoes`, 'PUT', corpo, medicaoGravada).map((resposta) => resposta.data);
}
