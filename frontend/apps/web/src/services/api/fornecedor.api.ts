import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { Fornecedor } from '../../types/database/index';
import { buscarNaApi, corteDaTelaLigado, enviarParaApi, type ErroDaApi } from './base';

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

/**
 * Corpo de `POST /fornecedores` e `PUT /fornecedores/{id}` — espelha
 * `backend/app/Cadastro/Http/Requests/FornecedorDoPainelRequest.php`. O CNPJ vai como digitado: quem
 * confere os DV (numérico ou alfanumérico) e formata é a API, que recusa com `cnpj_invalido`.
 */
export interface FornecedorDeclarado {
    readonly nome: string;
    readonly cnpj: string;
    readonly contato: string | null;
    readonly ativo: boolean;
}

/** Cria (`id === null`) ou edita um fornecedor do posto pela API (#103, ensaio 30/09). */
export function gravarFornecedorNaApi(postoId: number, id: number | null, corpo: FornecedorDeclarado): ResultAsync<Fornecedor, ErroDaApi> {
    const caminho = id === null ? `/api/postos/${postoId}/fornecedores` : `/api/postos/${postoId}/fornecedores/${id}`;
    return enviarParaApi(caminho, id === null ? 'POST' : 'PUT', corpo, z.object({ data: fornecedorDaApi }))
        .map((resposta) => ({ ...resposta.data, posto_id: postoId }));
}

/** Só a API cria fornecedor: no Supabase a tela nunca teve cadastro, e o posto novo não passa por lá. */
export function fornecedorPelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_FORNECEDOR);
}
