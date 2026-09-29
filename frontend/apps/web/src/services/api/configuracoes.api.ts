import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { FormaPagamento, PaymentFormState, PaymentType } from '../../components/configuracoes/types';
import { buscarNaApi, corteDaTelaLigado, enviarParaApi, type ErroDaApi } from './base';

/**
 * A tela Configurações pela API Laravel (#103): formas de pagamento (lista, criar, editar,
 * desativar) e os três parâmetros (tolerância de divergência, dias de estoque crítico/baixo).
 * O posto vai na ROTA. A taxa é percentual e vai em string decimal com 2 casas.
 */

/** `true` quando formas de pagamento e parâmetros falam com a API. Flag `VITE_API_CONFIGURACOES`; ausente, vale o `VITE_API_URL`. */
export function configuracoesPelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_CONFIGURACOES);
}

/** Espelha `FormaPagamentoResource.php`. */
const formaDaApi = z.object({
    id: z.number().int(),
    nome: z.string(),
    tipo: z.string(),
    ativo: z.boolean(),
    taxa: z.string().regex(/^\d+(\.\d+)?$/, 'taxa fora de string decimal').nullable(),
});

export type FormaDaApi = z.infer<typeof formaDaApi>;

/** A forma da API no formato da tela. `tipo` "venda" (o das formas antigas) passa como veio. */
export function paraFormaDaTela(f: FormaDaApi): FormaPagamento {
    return { id: String(f.id), name: f.nome, type: f.tipo as PaymentType, tax: f.taxa === null ? 0 : Number(f.taxa), active: f.ativo };
}

/** Corpo de `POST`/`PUT /formas-pagamento` — espelha `FormaDePagamentoDoPainelRequest.php`. */
export interface FormaDeclarada {
    readonly nome: string;
    readonly tipo: string;
    readonly taxa: string;
    readonly ativo: boolean;
}

/** O formulário vira o corpo: taxa percentual com 2 casas ("3.5" → "3.50"). */
export function corpoDaForma(form: PaymentFormState): FormaDeclarada {
    const taxa = Number.isFinite(form.tax) && form.tax > 0 ? form.tax : 0;
    return { nome: form.name.trim(), tipo: form.type, taxa: taxa.toFixed(2), ativo: form.active };
}

/** As formas do posto (ativas e inativas) — a tela mostra só as ativas, como antes. */
export function lerFormasDaApi(postoId: number): ResultAsync<FormaDaApi[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/formas-pagamento`, z.object({ data: z.array(formaDaApi) })).map((r) => r.data);
}

/** Cria (`id` nulo) ou edita a forma. */
export function gravarFormaNaApi(postoId: number, id: string | null, corpo: FormaDeclarada): ResultAsync<FormaDaApi, ErroDaApi> {
    const caminho = id === null ? `/api/postos/${postoId}/formas-pagamento` : `/api/postos/${postoId}/formas-pagamento/${id}`;
    return enviarParaApi(caminho, id === null ? 'POST' : 'PUT', corpo, z.object({ data: formaDaApi })).map((r) => r.data);
}

const parametros = z.object({
    tolerancia_divergencia: z.string().nullable(),
    dias_estoque_critico: z.string().nullable(),
    dias_estoque_baixo: z.string().nullable(),
});

export type ParametrosDaApi = z.infer<typeof parametros>;

export function lerParametrosDaApi(postoId: number): ResultAsync<ParametrosDaApi, ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/parametros`, z.object({ data: parametros })).map((r) => r.data);
}

/** Os três campos da tela (texto) viram o corpo do `PUT /parametros`: tolerância "50,00" → "50.00", dias inteiros. */
export function corpoDosParametros(tolerancia: string, diasCritico: string, diasBaixo: string): {
    tolerancia_divergencia: string;
    dias_estoque_critico: number;
    dias_estoque_baixo: number;
} {
    return {
        tolerancia_divergencia: tolerancia.trim().replace(',', '.'),
        dias_estoque_critico: Number(diasCritico),
        dias_estoque_baixo: Number(diasBaixo),
    };
}

export function gravarParametrosNaApi(postoId: number, corpo: ReturnType<typeof corpoDosParametros>): ResultAsync<ParametrosDaApi, ErroDaApi> {
    return enviarParaApi(`/api/postos/${postoId}/parametros`, 'PUT', corpo, z.object({ data: parametros })).map((r) => r.data);
}
