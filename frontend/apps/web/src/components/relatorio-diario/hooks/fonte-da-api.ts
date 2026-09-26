/**
 * Insumos do Relatório Diário lidos da API Laravel (#103, `VITE_API_RELATORIO`).
 *
 * @remarks
 * Três rotas, nenhuma chamada ao Supabase (com o login pela API não existe sessão dele):
 *  - `GET /relatorio-diario?data=` → fechamentos do dia (com o nome de quem gravou) e despesas do dia;
 *  - `GET /leituras?data=`         → encerrantes do dia, com o preço carimbado;
 *  - `GET /dashboard?inicio=dia&fim=dia` → compras do MÊS CIVIL do dia por combustível, o insumo
 *    de `custoMedioPorCombustivel` (o servidor já alarga a compra para o mês, `Periodo::mesCivil`).
 *
 * Paridade com `fonte-supabase.ts`, campo a campo:
 *  - **Fechamentos.** Todas as linhas do dia, recortadas pelo MESMO instante que o `.eq('data', dia)`
 *    do Supabase compara (meia-noite UTC), como `paraLeiturasDoDia` faz nas leituras. `null` em
 *    `total_vendas`/`diferenca` continua `null`. `usuario.nome` vem de `usuario_nome`.
 *  - **Leituras.** `paraLeiturasDoDia` (recorte e ordem por `id`); o combustível vem de
 *    `combustivel_id` da própria leitura. `preco_litro` é NOT NULL no esquema, então o fallback do
 *    `preco_venda` do cadastro nunca roda nas duas fontes — ele não vem.
 *  - **Compras.** A API devolve a soma do mês por combustível (Σ litros, Σ valor, em `numeric`); o
 *    Supabase devolvia as linhas e `custoMedioCompra` somava. É a mesma razão Σ valor ÷ Σ litros.
 *  - **Despesas.** Só as do dia, na ordem de `id` (o Supabase ordenava por `data` desc — no mesmo
 *    dia, a ordem física). `categoria` nula vira `'Outros'`, como `mapDbDespesaToUi`.
 */
import { ResultAsync } from 'neverthrow';
import type { ErroDaApi } from '../../../services/api/base';
import { lerDashboardDaApi, type DashboardDaApi } from '../../../services/api/dashboard.api';
import { lerLeiturasDoDiaDaApi, type LeituraDoDia } from '../../../services/api/leitura.api';
import { lerRelatorioDiarioDaApi, type RelatorioDiarioDaApi } from '../../../services/api/relatorio-diario.api';
import { custoMedioPorCombustivel } from '../../../services/custo-do-mes';
import type { ExpenseData } from '../types';
import type { FechamentoDiario, InsumosDoRelatorio, LeituraDiaria } from './insumos';

/** Instante em que o Supabase grava o dia: `data: 'AAAA-MM-DD'` vira meia-noite UTC. */
function meiaNoiteUtc(dia: string): number {
    return Date.parse(`${dia}T00:00:00Z`);
}

const numeroOuNulo = (decimal: string | null): number | null => (decimal === null ? null : Number(decimal));

/** Fechamentos da API no formato que `montar-relatorio.ts` lê. */
export function paraFechamentosDoDia(lido: RelatorioDiarioDaApi, dia: string): FechamentoDiario[] {
    const instante = meiaNoiteUtc(dia);
    return lido.fechamentos
        .filter((f) => Date.parse(f.data) === instante)
        .map((f) => ({
            turno_id: f.turno_id,
            total_vendas: numeroOuNulo(f.total_vendas),
            diferenca: numeroOuNulo(f.diferenca),
            status: f.status,
            usuario: f.usuario_nome === null ? null : { nome: f.usuario_nome },
        }));
}

/** Despesas da API no formato de UI, como `mapDbDespesaToUi` do caminho Supabase. */
export function paraDespesasDoDia(lido: RelatorioDiarioDaApi, postoId: number): ExpenseData[] {
    return lido.despesas
        .filter((d) => d.data === lido.data)
        .map((d) => ({
            id: String(d.id),
            descricao: d.descricao,
            categoria: d.categoria ?? 'Outros',
            valor: Number(d.valor),
            data: d.data,
            status: d.status === 'pago' ? 'pago' : 'pendente',
            posto_id: postoId,
            data_pagamento: d.data_pagamento,
            ...(d.observacoes === null ? {} : { observacoes: d.observacoes }),
        }));
}

/** Leitura da API com o combustível no lugar em que `vendaLucroDaLeitura` o procura. */
export function paraLeiturasDiarias(leituras: readonly LeituraDoDia[]): LeituraDiaria[] {
    return leituras.map((l) => ({
        turno_id: l.turno_id,
        leitura_inicial: l.leitura_inicial,
        leitura_final: l.leitura_final,
        preco_litro: l.preco_litro,
        valor_total: l.valor_total,
        bico: { combustivel: { id: l.combustivel_id } },
    }));
}

/** Compras do mês por combustível, somadas pelo servidor, no formato de `custo-do-mes.ts`. */
export function comprasDoMes(dashboard: DashboardDaApi): (combustivelId: number) => number | null {
    return custoMedioPorCombustivel(
        dashboard.produtos.map((p) => ({
            combustivel_id: p.combustivel_id,
            quantidade_litros: Number(p.compras.litros),
            valor_total: Number(p.compras.valor_total),
        })),
    );
}

/** Os insumos do dia pela API. Qualquer rota que falhe faz o relatório inteiro falhar — nunca meia tela. */
export function insumosDaApi(dia: string, postoId: number): ResultAsync<InsumosDoRelatorio, ErroDaApi> {
    return ResultAsync.combine([
        lerRelatorioDiarioDaApi(postoId, dia),
        lerLeiturasDoDiaDaApi(postoId, dia),
        lerDashboardDaApi(postoId, dia, dia),
    ] as const).map(([relatorio, leituras, dashboard]) => ({
        fechamentos: paraFechamentosDoDia(relatorio, dia),
        leituras: paraLeiturasDiarias(leituras),
        despesasDoDia: paraDespesasDoDia(relatorio, postoId),
        custoDoMes: comprasDoMes(dashboard),
    }));
}
