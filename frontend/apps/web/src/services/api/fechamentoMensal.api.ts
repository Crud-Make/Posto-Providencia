import { ResultAsync } from 'neverthrow';
import { z } from 'zod';
import { buscarNaApi, type ErroDaApi } from './base';
import { lerCatalogoDeBicosDaApi, type BicoDaApi } from './bico.api';
import { lerNomesDeCombustivelDaApi } from './combustivel.api';
import { consolidarEncerrantesDoMes, type EncerranteMensalConsolidado, type LeituraDoMes } from './encerrantes-do-mes';
import type { FechamentoMensalResumo } from './fechamentoMensal.service';
import { lerLeiturasDoPeriodoDaApi, type LeituraDoDia } from './leitura.api';

/**
 * A aba Fechamento Mensal pela API Laravel (Fechamento de Caixa 100% pela API, 25/09/2026).
 *
 * @remarks
 * - **Resumo diário** — `GET /fechamento-mensal/{ano}/{mes}` (`VendaDiariaDoMes.php`): volume,
 *   faturamento, litros por `combustivel_id` e status de cada dia, somados no Postgres. Paridade com
 *   a RPC `get_fechamento_mensal` provada no backend (`FechamentoDeCaixaPelaApiTest`). Os campos de
 *   LUCRO saem `null`: a rota não os tem (ver `FechamentoMensalResumo`).
 * - **Encerrantes** — as leituras do mês (`GET /leituras?data=&ate=`) + o catálogo de bicos, na
 *   MESMA consolidação do caminho Supabase (`consolidarEncerrantesDoMes`).
 */

const decimalEmString = z.string().regex(/^-?\d+(\.\d+)?$/, 'decimal fora de string');

const diaDaApi = z.object({
    data: z.string(),
    volume_total: decimalEmString,
    faturamento_bruto: decimalEmString,
    volumes_por_combustivel: z.record(z.string(), decimalEmString),
    status: z.string(),
});

const respostaDoMes = z.object({ dias: z.array(diaDaApi) });

export type DiaDoMesDaApi = z.infer<typeof diaDaApi>;

type Balde = 'vol_gasolina' | 'vol_aditivada' | 'vol_etanol' | 'vol_diesel';

/**
 * Os baldes de volume de um combustível pelo NOME — a mesma regra do `ILIKE` da RPC
 * (`01-esquema-base.sql:1227-1230`), balde a balde e INDEPENDENTES como os quatro `SUM(CASE …)` de
 * lá: gasolina que não é aditivada, aditivada, etanol, diesel. Nome fora dos quatro não entra em
 * balde nenhum, como lá (o risco do #93 que a rota por `id` resolve quando o dono decidir como a
 * tela mostra combustível novo).
 */
export function baldesDoCombustivel(nome: string): Balde[] {
    const n = nome.toUpperCase();
    const baldes: Balde[] = [];
    if (n.includes('GASOLINA') && !n.includes('ADITIVADA')) baldes.push('vol_gasolina');
    if (n.includes('ADITIVADA')) baldes.push('vol_aditivada');
    if (n.includes('ETANOL')) baldes.push('vol_etanol');
    if (n.includes('DIESEL')) baldes.push('vol_diesel');
    return baldes;
}

/** Soma de litros em milésimos inteiros (escala 3 da coluna), para não acumular resto de float. */
function somaDeLitros(valores: readonly string[]): number {
    return valores.reduce((total, litros) => total + Math.round(Number(litros) * 1000), 0) / 1000;
}

/** Um dia da API na linha que a RPC devolvia, sem o lucro. */
export function paraResumoDoDia(dia: DiaDoMesDaApi, nomes: ReadonlyMap<number, string>): FechamentoMensalResumo {
    const porBalde: Record<Balde, string[]> = { vol_gasolina: [], vol_aditivada: [], vol_etanol: [], vol_diesel: [] };
    for (const [id, litros] of Object.entries(dia.volumes_por_combustivel)) {
        for (const balde of baldesDoCombustivel(nomes.get(Number(id)) ?? '')) {
            porBalde[balde].push(litros);
        }
    }

    return {
        dia: dia.data,
        volume_total: Number(dia.volume_total),
        faturamento_bruto: Number(dia.faturamento_bruto),
        lucro_bruto: null,
        custo_taxas: null,
        lucro_liquido: null,
        status: dia.status,
        vol_gasolina: somaDeLitros(porBalde.vol_gasolina),
        vol_aditivada: somaDeLitros(porBalde.vol_aditivada),
        vol_etanol: somaDeLitros(porBalde.vol_etanol),
        vol_diesel: somaDeLitros(porBalde.vol_diesel),
    };
}

export function lerResumoMensalDaApi(postoId: number, mes: number, ano: number): ResultAsync<FechamentoMensalResumo[], ErroDaApi> {
    return ResultAsync.combine([
        buscarNaApi(`/api/postos/${postoId}/fechamento-mensal/${ano}/${mes}`, respostaDoMes),
        lerNomesDeCombustivelDaApi(postoId),
    ] as const).map(([resposta, nomes]) => resposta.dias.map((dia) => paraResumoDoDia(dia, nomes)));
}

/** As leituras do mês com o `bico` que o join do Supabase trazia, montado pelo catálogo. */
export function comBicoDoCatalogo(leituras: readonly LeituraDoDia[], bicos: readonly BicoDaApi[]): LeituraDoMes[] {
    const porId = new Map(bicos.map((bico) => [bico.id, bico] as const));
    return leituras.map((leitura) => {
        const bico = porId.get(leitura.bico_id);
        return {
            ...leitura,
            bico: bico === undefined ? null : { numero: bico.numero, combustivel: { nome: bico.combustivel.nome, codigo: bico.combustivel.codigo } },
        };
    });
}

/** `AAAA-MM-01` e o último dia do mês — o mesmo recorte de `getEncerrantesMensal`. */
export function limitesDoMesCivil(mes: number, ano: number): { inicio: string; fim: string } {
    const mm = String(mes).padStart(2, '0');
    return { inicio: `${ano}-${mm}-01`, fim: `${ano}-${mm}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}` };
}

export function lerEncerrantesMensalDaApi(postoId: number, mes: number, ano: number): ResultAsync<EncerranteMensalConsolidado, ErroDaApi> {
    const { inicio, fim } = limitesDoMesCivil(mes, ano);
    return ResultAsync.combine([lerLeiturasDoPeriodoDaApi(postoId, inicio, fim), lerCatalogoDeBicosDaApi(postoId)] as const).map(
        ([leituras, bicos]) => consolidarEncerrantesDoMes(comBicoDoCatalogo(leituras, bicos)),
    );
}
