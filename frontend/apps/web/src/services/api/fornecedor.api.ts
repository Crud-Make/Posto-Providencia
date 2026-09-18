import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { Fornecedor } from '../../types/database/index';
import { buscarNaApi, type ErroDaApi } from './base';

/**
 * Contrato de `GET /api/postos/{posto}/fornecedores` — espelha
 * `backend/app/Cadastro/Http/Resources/FornecedorResource.php`.
 */
const fornecedorDaApi = z.object({
    id: z.number().int(),
    nome: z.string(),
    cnpj: z.string(),
    contato: z.string().nullable(),
    ativo: z.boolean(),
});

const respostaDeFornecedores = z.object({ data: z.array(fornecedorDaApi) });

type FornecedorDaApi = z.infer<typeof fornecedorDaApi>;

/**
 * Converte a resposta da API na mesma lista que o Supabase devolvia em `fornecedorService.getAll`.
 *
 * @remarks
 * Paridade com a query antiga (`.eq('ativo', true)`, `.order('nome')`): a API não filtra `ativo`
 * (`CatalogoDoPosto::fornecedores`) e já ordena por `nome`, então o filtro fica aqui e a ordem é
 * mantida. `posto_id` não sai no Resource; vem do posto pedido, que é o escopo da própria rota.
 */
export function paraFornecedoresAtivos(lidos: readonly FornecedorDaApi[], postoId: number): Fornecedor[] {
    return lidos
        .filter((fornecedor) => fornecedor.ativo)
        .map((fornecedor) => ({ ...fornecedor, posto_id: postoId }));
}

/** Fornecedores ativos do posto, lidos da API Laravel. */
export function lerFornecedoresDaApi(postoId: number): ResultAsync<Fornecedor[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/fornecedores`, respostaDeFornecedores)
        .map((resposta) => paraFornecedoresAtivos(resposta.data, postoId));
}
