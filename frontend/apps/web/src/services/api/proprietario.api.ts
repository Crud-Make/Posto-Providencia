import { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import type { Posto } from '../../types/database/index';
import { buscarNaApi, corteDaTelaLigado, type ErroDaApi } from './base';
import { perfilDaSessao } from './sessao.api';

/**
 * A Visão do Proprietário pela API Laravel (#100) — os contratos de `GET /proprietario` e
 * `GET /movimento` e o catálogo que os widgets do mês usam.
 *
 * @remarks
 * Nada aqui é conta de dinheiro: a API devolve somas e linhas em decimal-string, o Zod valida na
 * borda, e o `Number()` é o mesmo que o PostgREST fazia no caminho Supabase. Lucro, custo médio,
 * rateio, estoque e impacto de troca continuam em `@posto/utils`.
 *
 * As duas rotas exigem `posto.acesso:gerir` (custo e despesa são dado de proprietário): quem não
 * gere o posto leva 403, e a tela da rede só pergunta pelos postos que o usuário gere.
 */

/**
 * `true` quando a Visão do Proprietário inteira — o resumo da rede, o Centro do Mês e o Impacto da
 * Troca de Preço — lê da API. `VITE_API_PROPRIETARIO` ausente segue `VITE_API_URL`; `0` a deixa no
 * Supabase (mesmo padrão do `VITE_API_DASHBOARD`). Uma flag só para os três: a tela não fica mista.
 */
export function visaoDoProprietarioPelaApi(): boolean {
    return corteDaTelaLigado(import.meta.env.VITE_API_PROPRIETARIO);
}

const dataIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data fora de aaaa-mm-dd');
const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');
const periodo = z.object({ inicio: dataIso, fim: dataIso });

/** Espelha `backend/app/Agregacao/Application/ResumoDoProprietario.php`. */
export const proprietarioDaApi = z.object({
    periodo,
    produtos: z.array(
        z.object({
            combustivel_id: z.number().int(),
            produto: z.string(),
            litros_vendidos: decimalEmString,
            /** Σ `Leitura.valor_total` — o `total_vendas` da RPC. */
            receita: decimalEmString,
            /** Σ litros × `preco_litro`, sem arredondar — a receita que a RPC usava no lucro bruto. */
            receita_a_preco_litro: decimalEmString,
            /** Compra do MÊS CIVIL da leitura; `0/0` quando o mês não tem compra do produto. */
            compras: z.object({ litros: decimalEmString, valor_total: decimalEmString }),
        }),
    ),
    despesas: z.array(decimalEmString),
    despesas_pendentes: z.array(decimalEmString),
    ultimo_fechamento: dataIso.nullable(),
});

export type ProprietarioDaApi = z.infer<typeof proprietarioDaApi>;

/** Espelha `backend/app/Agregacao/Application/MovimentoDoPosto.php`. */
export const movimentoDaApi = z.object({
    periodo,
    leituras: z.array(
        z.object({
            bico_id: z.number().int(),
            /** Combustível DO BICO, como as duas telas agrupavam no Supabase. */
            combustivel_id: z.number().int(),
            data: dataIso,
            leitura_inicial: decimalEmString,
            leitura_final: decimalEmString,
            litros_vendidos: decimalEmString,
            preco_litro: decimalEmString,
            valor_total: decimalEmString,
        }),
    ),
    compras: z.array(
        z.object({ combustivel_id: z.number().int(), data: dataIso, quantidade_litros: decimalEmString, valor_total: decimalEmString }),
    ),
    despesas: z.array(z.object({ data: dataIso, valor: decimalEmString })),
    /** Régua dos tanques do posto com `data ≤ fim`, sem limite inferior. Nula = não medida. */
    medicoes: z.array(z.object({ tanque_id: z.number().int(), data: dataIso, volume_fisico: decimalEmString.nullable() })),
});

export type MovimentoDaApi = z.infer<typeof movimentoDaApi>;

const consulta = (inicio: string, fim: string): string => new URLSearchParams({ inicio, fim }).toString();

/** Insumos do resumo do posto no período `[inicio, fim]`, que fica dentro de um mês (422 se não). */
export function lerProprietarioDaApi(postoId: number, inicio: string, fim: string): ResultAsync<ProprietarioDaApi, ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/proprietario?${consulta(inicio, fim)}`, proprietarioDaApi);
}

/** Linhas cruas do movimento do posto no período `[inicio, fim]`. */
export function lerMovimentoDaApi(postoId: number, inicio: string, fim: string): ResultAsync<MovimentoDaApi, ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/movimento?${consulta(inicio, fim)}`, movimentoDaApi);
}

/** Papéis que GEREM o posto (`PapelNoPosto::gerencia()` no backend). */
const PAPEIS_QUE_GEREM: ReadonlySet<string> = new Set(['admin', 'gerente']);

/**
 * Os postos da rede que a Visão do Proprietário mostra: os do perfil (`GET /api/eu`) em que o
 * usuário GERE. Operador não entra — a API responderia 403 a ele.
 *
 * @remarks A lista é só a pergunta; quem decide é o servidor, posto a posto. Um posto que o
 *          usuário não gere e aparecesse aqui por engano responderia 403, nunca o número.
 */
export function lerPostosQueGereDaApi(): ResultAsync<Posto[], ErroDaApi> {
    return perfilDaSessao().map((perfil) =>
        perfil.postos
            .filter((posto) => PAPEIS_QUE_GEREM.has(posto.papel))
            .map(
                (posto): Posto => ({
                    id: posto.id,
                    nome: posto.nome,
                    cnpj: null,
                    endereco: null,
                    cidade: null,
                    estado: null,
                    telefone: null,
                    email: null,
                    ativo: true,
                    created_at: '',
                    updated_at: '',
                }),
            ),
    );
}

/*
 * Catálogo do posto que os widgets do mês usam (`GET /api/postos/{posto}/{bicos,combustiveis,
 * tanques,fornecedores}`, #97). SEM filtro de `ativo`: as consultas antigas do Supabase não
 * filtravam, e venda antiga de bico desativado precisa continuar com rótulo e produto.
 */
const bicoDoCatalogo = z.object({ id: z.number().int(), numero: z.number().int(), combustivel: z.object({ id: z.number().int() }) });
const combustivelDoCatalogo = z.object({ id: z.number().int(), nome: z.string(), codigo: z.string().nullable() });
const tanqueDoCatalogo = z.object({ id: z.number().int(), combustivel_id: z.number().int() });
const fornecedorDoCatalogo = z.object({ id: z.number().int(), nome: z.string() });

export interface CatalogoDoMes {
    readonly bicos: readonly { id: number; numero: number; combustivel_id: number }[];
    readonly combustiveis: readonly { id: number; nome: string; codigo: string | null }[];
    readonly tanques: readonly { id: number; combustivel_id: number }[];
    readonly fornecedores: readonly { id: number; nome: string }[];
}

function lista<T>(caminho: string, item: z.ZodType<T>): ResultAsync<T[], ErroDaApi> {
    return buscarNaApi(caminho, z.object({ data: z.array(item) })).map((resposta) => resposta.data);
}

/** O catálogo inteiro que o Centro do Mês e o Impacto da Troca de Preço consultam. */
export function lerCatalogoDoMesDaApi(postoId: number): ResultAsync<CatalogoDoMes, ErroDaApi> {
    const base = `/api/postos/${postoId}`;
    return ResultAsync.combine([
        lista(`${base}/bicos`, bicoDoCatalogo),
        lista(`${base}/combustiveis`, combustivelDoCatalogo),
        lista(`${base}/tanques`, tanqueDoCatalogo),
        lista(`${base}/fornecedores`, fornecedorDoCatalogo),
    ] as const).map(([bicos, combustiveis, tanques, fornecedores]) => ({
        bicos: bicos.map((b) => ({ id: b.id, numero: b.numero, combustivel_id: b.combustivel.id })),
        combustiveis,
        tanques,
        fornecedores,
    }));
}
