import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { FormaPagamento } from '../../types/database/index';
import { buscarNaApi, type ErroDaApi } from './base';

/**
 * Decimal em string, como o PDO entrega `numeric` — o backend nunca manda float (mesmo contrato
 * de `dashboard.api.ts`; `CatalogoTest` prova a escala 2 da `taxa`). Número cru aqui é resposta
 * fora do contrato, não dado a converter.
 */
const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/**
 * Contrato de `GET /api/postos/{posto}/formas-pagamento` — espelha
 * `backend/app/Cadastro/Http/Resources/FormaPagamentoResource.php`.
 */
const formaPagamentoDaApi = z.object({
    id: z.number().int(),
    nome: z.string(),
    tipo: z.string(),
    ativo: z.boolean(),
    taxa: decimalEmString.nullable(),
});

const respostaDeFormasDePagamento = z.object({ data: z.array(formaPagamentoDaApi) });

export type FormaPagamentoDaApi = z.infer<typeof formaPagamentoDaApi>;

/**
 * Converte a resposta da API na mesma lista que o Supabase devolve em `formaPagamentoService.getAll`.
 *
 * @remarks
 * Paridade com a query antiga (`.eq('ativo', true)`, `.order('nome')`): a API não filtra `ativo`
 * (`CatalogoDoPosto::formasPagamento`) e já ordena por `nome`, então o filtro fica aqui e a ordem
 * é mantida. `posto_id` não sai no Resource; vem do posto pedido, escopo da própria rota.
 *
 * `taxa` chega como string decimal (`"1.90"`) ou `null` e vira `number | null` por `Number()` —
 * o mesmo valor que o PostgREST serializa do `numeric(5,2)`. A conta da taxa continua onde
 * estava (`usePagamentos.ts`, `useFechamento.ts`); aqui não há fórmula.
 */
export function paraFormasDePagamentoAtivas(
    lidos: readonly FormaPagamentoDaApi[],
    postoId: number,
): FormaPagamento[] {
    return lidos
        .filter((forma) => forma.ativo)
        .map((forma) => ({
            id: forma.id,
            nome: forma.nome,
            tipo: forma.tipo,
            ativo: forma.ativo,
            taxa: forma.taxa === null ? null : Number(forma.taxa),
            posto_id: postoId,
        }));
}

/** Formas de pagamento ativas do posto, lidas da API Laravel. */
export function lerFormasDePagamentoDaApi(postoId: number): ResultAsync<FormaPagamento[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/formas-pagamento`, respostaDeFormasDePagamento)
        .map((resposta) => paraFormasDePagamentoAtivas(resposta.data, postoId));
}
