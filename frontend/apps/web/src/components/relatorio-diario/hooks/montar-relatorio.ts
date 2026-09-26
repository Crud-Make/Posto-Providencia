/**
 * As contas do Relatório Diário, sobre os insumos de qualquer fonte.
 *
 * @remarks
 * Movido de `useRelatorioDiario.ts` sem mudar fórmula (#103): a mesma conta roda sobre o que veio
 * do Supabase ou da API, e é isso que faz a troca de fonte não mexer em número.
 *
 * [06/09/2026] O turno saiu daqui. O sistema decidiu não ter turno (PR #53), mas este hook
 * ainda agrupava por `Turno` e filtrava fechamento E leitura por `turno_id === turno.id`.
 * O painel grava `Leitura.turno_id = null` — a primeira leitura salva por ele sumia da
 * tela (0 L num dia com 6 bicos), e o dia aparecia rotulado "Manhã" porque a tabela só
 * tem Manhã/Tarde/Noite. Agora o dia é a unidade: tudo do dia, uma linha só.
 */
import { semLancamento } from '@posto/utils';
import type { DailyTotals, ExpenseData, ShiftData } from '../types';
import type { FechamentoDiario, InsumosDoRelatorio, LeituraDiaria } from './insumos';

/**
 * Venda e lucro bruto de uma leitura, a preço DO DIA e a custo DO MÊS.
 *
 * @remarks
 * O preço vem do que foi carimbado na própria leitura (`preco_litro`/
 * `valor_total`); o `preco_venda` do cadastro é só fallback para linha antiga
 * sem preço gravado. Era daqui que saía o bug do "preço único": dia de janeiro
 * (R$ 6,28) exibido a preço de agosto (R$ 6,98) — o cadastro guarda um preço
 * só, o de hoje.
 *
 * [06/09/2026] O custo tinha o mesmo defeito, do outro lado da conta: vinha do
 * `preco_custo` do cadastro, congelado em janeiro (o #80 tirou esse carimbo de
 * três telas). Agora é injetado — custo médio da compra do MÊS do dia, por
 * combustível (`custo-do-mes.ts`, modelo da planilha). Sem compra do produto no
 * mês, `lucro` é `null`: não apurável, nunca "custo zero = lucro cheio". Lucro
 * bruto por litro, sem rateio de despesa: a despesa do dia é subtraída no total.
 *
 * @param custoLitro - R$/L da compra do mês para o combustível da leitura; `null` sem compra.
 */
export function vendaLucroDaLeitura(
    l: LeituraDiaria,
    custoLitro: number | null
): { volume: number; venda: number; lucro: number | null } {
    const volume = Number(l.leitura_final) - Number(l.leitura_inicial);
    if (volume <= 0) return { volume: 0, venda: 0, lucro: 0 };

    const precoDoDia = Number(l.preco_litro ?? l.bico?.combustivel?.preco_venda ?? 0);
    const venda = l.valor_total != null ? Number(l.valor_total) : volume * precoDoDia;

    return { volume, venda, lucro: custoLitro === null ? null : volume * (precoDoDia - custoLitro) };
}

/** Venda, litros e lucro bruto das leituras do dia. Um produto sem compra no mês deixa o lucro `null`. */
function somarLeituras(insumos: InsumosDoRelatorio): { litros: number; vendas: number; lucro: number | null } {
    let litros = 0;
    let lucroDia: number | null = 0;
    let vendas = 0;

    insumos.leituras.forEach(l => {
        const combustivelId = l.bico?.combustivel?.id;
        const custo = combustivelId === undefined ? null : insumos.custoDoMes(combustivelId);
        const { volume, venda, lucro } = vendaLucroDaLeitura(l, custo);
        litros += volume;
        vendas += venda;
        lucroDia = lucroDia === null || lucro === null ? null : lucroDia + lucro;
    });

    return { litros, vendas, lucro: lucroDia };
}

/**
 * Diferença de caixa do dia como está gravada.
 *
 * @remarks
 * [04/09/2026] `diferenca` NULA é "não apurado" (sem encerrante completo), não zero — e não se
 * soma com zero: um pai não apurado deixa o dia inteiro não apurado. Antes o `|| 0` transformava
 * isso em "bateu".
 *
 * [13/08/2026] Aqui existia uma heurística que a ZERAVA quando `|diferenca + totalVendas| < 5`,
 * para "não mostrar quebra gigante". Ela estava errada duas vezes: o sinal (com `diferenca =
 * encerrante − conferido`, "nada lançado" dá +totalVendas, então a condição pedia 2×totalVendas
 * < 5 — 0 de 201 fechamentos do histórico a satisfaziam), e o próprio ato de zerar, que apaga da
 * tela justamente o número que o sistema existe para acusar. O estado agora é pergunta, não
 * reescrita.
 */
function diferencaDoDia(fechamentos: readonly FechamentoDiario[]): number | null {
    const naoApurado = fechamentos.some(f => f.diferenca === null || f.diferenca === undefined);
    return naoApurado ? null : fechamentos.reduce((acc, f) => acc + Number(f.diferenca), 0);
}

/**
 * 'Aberto'   = o turno nem começou (nenhum fechamento criado).
 * 'Pendente' = o frentista lançou pelo PWA, mas ninguém fechou o dia no painel. É o estado dos 12
 *              dias achados em 13/08/2026, o mais antigo parado desde 26/07 — e que a tela
 *              mostrava como "FECHADO, R$ 0,00", ou seja, um dia sem conferência nenhuma com
 *              cara de dia conferido e batido.
 * 'Fechado'  = consolidado pelo painel, com os totais gravados.
 */
function statusDoDia(
    quantos: number,
    consolidado: boolean,
    totalVendas: number,
    diferenca: number | null
): ShiftData['status'] {
    if (quantos === 0) return 'Aberto';
    if (!consolidado || diferenca === null || semLancamento(totalVendas, diferenca)) return 'Pendente';
    return 'Fechado';
}

/** O dia inteiro numa linha só — sem filtro por turno (ver cabeçalho). */
export function montarLinhaDoDia(insumos: InsumosDoRelatorio): ShiftData {
    const fechamentos = insumos.fechamentos;
    const totalVendasFechamento = fechamentos.reduce((acc, f) => acc + Number(f.total_vendas ?? 0), 0);
    const diferenca = diferencaDoDia(fechamentos);
    const leituras = somarLeituras(insumos);

    // O total do `Fechamento` só vale depois que o dia foi CONSOLIDADO pelo
    // painel — antes disso ele é zero por construção, e usá-lo mostrava
    // "R$ 0,00 vendidos" num dia com 1.288 L na bomba. Enquanto o dia está
    // aberto, a venda real vem das leituras, que é a mesma fonte do dashboard.
    const consolidado = fechamentos.length > 0 && fechamentos.every(f => f.status === 'FECHADO');
    const totalVendas = consolidado ? totalVendasFechamento : leituras.vendas;

    const nomes = fechamentos
        .map(f => f.usuario?.nome)
        .filter((nome): nome is string => typeof nome === 'string' && nome !== '');

    return {
        turnoName: 'Dia',
        turnoId: 0,
        status: statusDoDia(fechamentos.length, consolidado, totalVendas, diferenca),
        vendas: totalVendas,
        litros: leituras.litros,
        lucro: leituras.lucro,
        diferenca,
        frentistas: [...new Set(nomes)]
    };
}

/** Totais do dia a partir das linhas e das despesas. */
export function montarTotais(linhas: readonly ShiftData[], despesasDoDia: readonly ExpenseData[]): DailyTotals {
    const totalDespesas = despesasDoDia.reduce((sum, d) => sum + Number(d.valor), 0);
    const totalVendas = linhas.reduce((acc, curr) => acc + curr.vendas, 0);
    const totalLitros = linhas.reduce((acc, curr) => acc + curr.litros, 0);
    const totalLucro: number | null = linhas.some(s => s.lucro === null)
        ? null
        : linhas.reduce((acc, curr) => acc + (curr.lucro ?? 0), 0);
    // Um turno não apurado deixa o dia não apurado — nada de somar `null` como zero.
    const totalDiferenca: number | null = linhas.some(s => s.diferenca === null)
        ? null
        : linhas.reduce((acc, curr) => acc + (curr.diferenca ?? 0), 0);

    return {
        vendas: totalVendas,
        litros: totalLitros,
        lucro: totalLucro,
        despesas: totalDespesas,
        lucroLiquido: totalLucro === null ? null : totalLucro - totalDespesas,
        diferenca: totalDiferenca,
        projetadoMensal: totalVendas * 30 // Naive projection
    };
}

/** O relatório inteiro do dia: a linha, os totais e as despesas que a tela lista. */
export function montarRelatorio(insumos: InsumosDoRelatorio): {
    shiftsData: ShiftData[];
    totals: DailyTotals;
    expensesDay: ExpenseData[];
} {
    const shiftsData = [montarLinhaDoDia(insumos)];
    return {
        shiftsData,
        totals: montarTotais(shiftsData, insumos.despesasDoDia),
        expensesDay: [...insumos.despesasDoDia]
    };
}
