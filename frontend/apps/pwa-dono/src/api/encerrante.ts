/**
 * O encerrante do app do dono pela API Laravel (#102): bicos, leituras anteriores, dias em falta
 * e a gravação do dia.
 *
 * @remarks Substitui, para os DADOS, o `criarAcessoEncerrante` do `@posto/api-core` (Supabase).
 *          O OCR e o aquecimento da Edge Function continuam lá até a fatia 2.
 *
 *          Cada adaptador devolve a MESMA forma que a tela já consumia do Supabase — por isso os
 *          testes da tela continuam valendo. O que muda é a fronteira: a API manda litros e
 *          dinheiro em STRING decimal, e é aqui, e só aqui, que viram `number` (`Number()`, sem
 *          arredondar — o mesmo valor que o PostgREST entregava do `numeric`). Na volta, a gravação
 *          manda string de novo: litros com três casas, dinheiro com duas, ids inteiros.
 */
import type { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { deIsoLocal, emCentavos, hojeIso, litrosVendidos, somarDias, valorDaLeitura } from '@posto/utils';
import { buscarNaApi, decimalEmString, enviarParaApi, type ErroDaApi } from './cliente';

/** Contrato de `GET /api/postos/{posto}/bicos` — espelha `BicoResource.php`. Traz ATIVOS e INATIVOS. */
const bicoDaApi = z.object({
    id: z.number().int(),
    numero: z.number().int(),
    ativo: z.boolean(),
    combustivel: z.object({
        id: z.number().int(),
        nome: z.string(),
        codigo: z.string(),
        preco_venda: decimalEmString,
    }),
});
export type BicoDaApi = z.infer<typeof bicoDaApi>;

/** Contrato do `LeituraResource.php`: `data` em ISO Zulu, números em string decimal. */
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
export type LeituraDaApi = z.infer<typeof leituraDaApi>;

const respostaDeBicos = z.object({ data: z.array(bicoDaApi) });
const respostaDeLeituras = z.object({ data: z.array(leituraDaApi) });

/** O bico como a tela o recebia do Supabase (`select id, numero, combustivel_id, combustivel(...)`). */
export interface BicoRow {
    readonly id: number;
    readonly numero: number;
    readonly combustivel_id: number;
    readonly combustivel: { readonly nome: string; readonly codigo: string; readonly preco_venda: number } | null;
}

/** Uma leitura de bico pronta para gravar, ainda sem litros nem valor — o que a tela monta. */
export interface LinhaParaGravar {
    readonly bico_id: number;
    readonly combustivel_id: number;
    readonly leitura_inicial: number;
    readonly leitura_final: number;
    readonly preco_litro: number;
}

/** Um item do corpo do `PUT /leituras` — espelha `GravaLeiturasDoEncerranteRequest.php`. */
export interface LeituraDeclarada {
    readonly bico_id: number;
    readonly combustivel_id: number;
    readonly leitura_inicial: string;
    readonly leitura_final: string;
    readonly litros_vendidos: string;
    readonly preco_litro: string;
    readonly valor_total: string;
}

/** Um dia passado cujo encerrante não foi enviado, ou foi só em parte. */
export interface DiaEmFalta {
    readonly data: string;
    readonly bicosLancados: number;
    readonly bicosEsperados: number;
}

/**
 * Quantos dias para trás vale a pena cobrar o encerrante — a mesma semana do `api-core`
 * (`DIAS_COBRAVEIS`): aviso que lista meses de dias é aviso que se aprende a ignorar.
 */
export const DIAS_COBRAVEIS = 7;

/**
 * Só os bicos ATIVOS, por número. A API devolve também os inativos (`CatalogoDoPosto::bicos`); a
 * query antiga do Supabase filtrava `.eq('ativo', true)`. Bico inativo na tela viraria campo a
 * preencher que ninguém lê — e contaria como "esperado" nos dias em falta.
 */
export function paraBicosDaTela(lidos: readonly BicoDaApi[]): BicoRow[] {
    return lidos
        .filter((bico) => bico.ativo)
        .sort((a, b) => a.numero - b.numero)
        .map((bico) => ({
            id: bico.id,
            numero: bico.numero,
            combustivel_id: bico.combustivel.id,
            combustivel: {
                nome: bico.combustivel.nome,
                codigo: bico.combustivel.codigo,
                preco_venda: Number(bico.combustivel.preco_venda),
            },
        }));
}

/** `bico_id` → última `leitura_final` antes do dia (o servidor já deduplica por bico). */
export function paraUltimasLeituras(lidas: readonly LeituraDaApi[]): Map<number, number> {
    return new Map(lidas.map((l) => [l.bico_id, Number(l.leitura_final)] as const));
}

/**
 * `bico_id` → `preco_litro` do último dia lançado. Preço zero não conta: o bico cai no cadastro,
 * como no `getUltimosPrecosPorBico` do `api-core`.
 */
export function paraUltimosPrecos(lidas: readonly LeituraDaApi[]): Map<number, number> {
    const precos = new Map<number, number>();
    for (const l of lidas) {
        const preco = Number(l.preco_litro);
        if (preco > 0) precos.set(l.bico_id, preco);
    }
    return precos;
}

/**
 * Os dias da última semana (sem hoje) com menos leituras que bicos ativos.
 *
 * @remarks A regra é a do `diasEmFalta` do `api-core`, linha a linha: hoje NÃO entra (está em
 *          andamento, não em falta), dia incompleto conta como falta, e o dia de cada leitura é
 *          o recorte dos 10 primeiros caracteres do timestamp gravado — sem `new Date()`, que
 *          converteria para o fuso local e escorregaria cada leitura um dia para trás.
 */
export function contarDiasEmFalta(lidas: readonly LeituraDaApi[], bicosEsperados: number, hoje: string): DiaEmFalta[] {
    const lancadosPorDia = new Map<string, number>();
    for (const l of lidas) {
        const dia = l.data.slice(0, 10);
        lancadosPorDia.set(dia, (lancadosPorDia.get(dia) ?? 0) + 1);
    }
    const faltas: DiaEmFalta[] = [];
    for (let atras = DIAS_COBRAVEIS; atras >= 1; atras--) {
        const dia = somarDias(deIsoLocal(hoje), -atras);
        const lancados = lancadosPorDia.get(dia) ?? 0;
        if (lancados < bicosEsperados) faltas.push({ data: dia, bicosLancados: lancados, bicosEsperados });
    }
    return faltas;
}

/** Litros em string com três casas — o encerrante tem mililitro, nunca mais que isso. */
const emLitros = (litros: number): string => (Math.round(litros * 1000) / 1000).toFixed(3);

/** Dinheiro em string com duas casas, quantizado pelo `emCentavos` de `@posto/utils`. */
const emReais = (reais: number): string => emCentavos(reais).toFixed(2);

/**
 * O corpo do `PUT /leituras`. Litros e valor saem das MESMAS funções puras que o caminho do
 * Supabase usava (`litrosVendidos`, `valorDaLeitura`, de `@posto/utils`) — a conta não muda de
 * lugar, só a gravação.
 */
export function corpoDasLeituras(linhas: readonly LinhaParaGravar[]): { leituras: LeituraDeclarada[] } {
    return {
        leituras: linhas.map((l) => {
            // Fronteira: a API fala `leitura_*`, o domínio fala `inicial`/`fechamento`.
            const leitura = { inicial: l.leitura_inicial, fechamento: l.leitura_final };
            return {
                bico_id: l.bico_id,
                combustivel_id: l.combustivel_id,
                leitura_inicial: emLitros(l.leitura_inicial),
                leitura_final: emLitros(l.leitura_final),
                litros_vendidos: emLitros(litrosVendidos(leitura)),
                preco_litro: emReais(l.preco_litro),
                valor_total: emReais(valorDaLeitura(leitura, l.preco_litro)),
            };
        }),
    };
}

/** Bicos ativos do posto, na forma da tela. */
export function lerBicos(postoId: number): ResultAsync<BicoRow[], ErroDaApi> {
    return buscarNaApi(`/api/postos/${postoId}/bicos`, respostaDeBicos).map((r) => paraBicosDaTela(r.data));
}

/** A última leitura de cada bico ESTRITAMENTE antes do dia (`AAAA-MM-DD`). */
export function lerUltimasLeituras(postoId: number, antesDe: string): ResultAsync<LeituraDaApi[], ErroDaApi> {
    const consulta = new URLSearchParams({ antes_de: antesDe }).toString();
    return buscarNaApi(`/api/postos/${postoId}/leituras/ultimas?${consulta}`, respostaDeLeituras).map((r) => r.data);
}

/** Dias passados da última semana sem o encerrante completo. */
export function lerDiasEmFalta(postoId: number, bicosEsperados: number): ResultAsync<DiaEmFalta[], ErroDaApi> {
    const hoje = hojeIso();
    const consulta = new URLSearchParams({
        data: somarDias(deIsoLocal(hoje), -DIAS_COBRAVEIS),
        ate: somarDias(deIsoLocal(hoje), -1),
    }).toString();
    return buscarNaApi(`/api/postos/${postoId}/leituras?${consulta}`, respostaDeLeituras).map((r) =>
        contarDiasEmFalta(r.data, bicosEsperados, hoje),
    );
}

/**
 * Grava as leituras do dia. Só os bicos preenchidos vão no corpo: o servidor faz UPSERT por
 * `(bico_id, data)`, então bico não declarado fica como está.
 */
export function gravarLeituras(postoId: number, dia: string, linhas: readonly LinhaParaGravar[]): ResultAsync<LeituraDaApi[], ErroDaApi> {
    const consulta = new URLSearchParams({ data: dia }).toString();
    return enviarParaApi(`/api/postos/${postoId}/leituras?${consulta}`, 'PUT', corpoDasLeituras(linhas), respostaDeLeituras).map(
        (r) => r.data,
    );
}
