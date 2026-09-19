import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { BicoComDetalhes } from '../../types/fechamento';
import { buscarNaApi, type ErroDaApi } from './base';

/**
 * Decimal em string, como o PDO entrega `numeric` — o backend nunca manda float (mesmo contrato
 * de `dashboard.api.ts`; `CatalogoTest` prova a escala 2). Número cru aqui é resposta fora do
 * contrato, não dado a converter.
 */
const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

/**
 * Contrato de `GET /api/postos/{posto}/bicos` — espelha
 * `backend/app/Cadastro/Http/Resources/BicoResource.php` com `bomba`, `combustivel` e `tanque`
 * carregados por `CatalogoDoPosto::bicos`. Do `tanque` só o `id` interessa (vira `tanque_id`).
 */
const bicoDaApi = z.object({
    id: z.number().int(),
    numero: z.number().int(),
    ativo: z.boolean(),
    bomba: z.object({
        id: z.number().int(),
        nome: z.string(),
        localizacao: z.string().nullable(),
        ativo: z.boolean(),
    }),
    combustivel: z.object({
        id: z.number().int(),
        nome: z.string(),
        codigo: z.string(),
        cor: z.string().nullable(),
        ativo: z.boolean(),
        preco_venda: decimalEmString,
        preco_custo: decimalEmString.nullable(),
    }),
    tanque: z.object({ id: z.number().int() }).nullable(),
});

const respostaDeBicos = z.object({ data: z.array(bicoDaApi) });

export type BicoDaApi = z.infer<typeof bicoDaApi>;

/**
 * Converte a resposta da API na mesma lista que o Supabase devolve em `bicoService.getWithDetails`.
 *
 * @remarks
 * Paridade com a query antiga (`.eq('ativo', true)` no BICO, `.order('numero')`): a API não filtra
 * `ativo` (`CatalogoDoPosto::bicos`) e já ordena por `numero`, então o filtro fica aqui e a ordem é
 * mantida. Combustível inativo NÃO é filtrado, como não era.
 *
 * `preco_venda` e `preco_custo` chegam como string decimal e viram `number` por `Number()`, o mesmo
 * valor que o PostgREST serializa do `numeric` — sem arredondar, sem escala. Quem faz conta com
 * `preco_venda` (`useLeituras.ts`, `useSubmissaoFechamento.ts`) continua recebendo o que recebia.
 *
 * O Resource não expõe `bomba_id`, `combustivel_id`, `tanque_id` nem `posto_id`: os três primeiros
 * saem dos ids aninhados; `posto_id` é o posto pedido, escopo da própria rota. `preco_custo` nulo
 * vira `0`: a coluna é `numeric DEFAULT 0`, o tipo do painel é `number`, e o fechamento diário não
 * lê esse campo.
 */
export function paraBicosComDetalhes(lidos: readonly BicoDaApi[], postoId: number): BicoComDetalhes[] {
    return lidos
        .filter((bico) => bico.ativo)
        .map((bico) => ({
            id: bico.id,
            numero: bico.numero,
            ativo: bico.ativo,
            bomba_id: bico.bomba.id,
            combustivel_id: bico.combustivel.id,
            tanque_id: bico.tanque === null ? null : bico.tanque.id,
            posto_id: postoId,
            bomba: {
                id: bico.bomba.id,
                nome: bico.bomba.nome,
                localizacao: bico.bomba.localizacao,
                ativo: bico.bomba.ativo,
                posto_id: postoId,
            },
            combustivel: {
                id: bico.combustivel.id,
                nome: bico.combustivel.nome,
                codigo: bico.combustivel.codigo,
                cor: bico.combustivel.cor,
                ativo: bico.combustivel.ativo,
                preco_venda: Number(bico.combustivel.preco_venda),
                preco_custo: bico.combustivel.preco_custo === null ? 0 : Number(bico.combustivel.preco_custo),
                posto_id: postoId,
            },
        }));
}

/** Bicos ativos do posto com bomba e combustível, lidos da API Laravel. */
export function lerBicosComDetalhesDaApi(postoId: number): ResultAsync<BicoComDetalhes[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/bicos`, respostaDeBicos)
        .map((resposta) => paraBicosComDetalhes(resposta.data, postoId));
}
