/**
 * O mês do Registro de Compras a partir da {@link EntradaDoRegistro} — a mesma conta para as duas
 * fontes (Supabase e API Laravel). Era o corpo do `loadData` de `useCombustiveisHibridos`; saiu
 * dele sem mudar uma linha de conta para que a fonte da API não copiasse nada.
 *
 * Vendas por `encerranteMensal` (o módulo da Planilha do Mês), compras do mês somadas por produto,
 * régua anterior = a última ANTES do mês por tanque. Nada de `preco_custo` do cadastro.
 */
import { encerranteMensal, type LeituraDiariaBico } from '@posto/utils';
import { formatarParaBR } from '../../../utils/formatters';
import type { CombustivelHibrido, EntradaDoRegistro, LeituraRow, VendaBicoMes } from './tipos-do-registro';

export interface RegistroDoMes {
    readonly combustiveis: CombustivelHibrido[];
    readonly vendasBicos: VendaBicoMes[];
    /** Último dia em que TODOS os bicos estavam fechados; `null` sem leitura no mês. */
    readonly ultimoDiaFechado: number | null;
}

/**
 * Dia do mês a partir do timestamp do banco, sem `new Date()` — converter para
 * horário local escorrega a leitura um dia para trás.
 */
const diaDoMes = (iso: string): number => Number(iso.slice(8, 10));

/** Vendas do mês bico a bico (linhas 5–10 do resumo da planilha), na ordem do número do bico. */
function vendasPorBico(entrada: EntradaDoRegistro): { bicos: VendaBicoMes[]; ultimoDiaFechado: number | null } {
    const leituras: readonly LeituraRow[] = entrada.leituras;
    const bicoInfo = new Map<number, { numero: number; produtoId: number }>();
    for (const l of leituras) if (l.bico) bicoInfo.set(l.bico_id, { numero: l.bico.numero, produtoId: l.bico.combustivel_id });

    const diarias: LeituraDiariaBico[] = leituras.map((l) => ({
        dia: diaDoMes(l.data),
        bico: String(l.bico_id),
        inicial: l.leitura_inicial === null ? null : Number(l.leitura_inicial),
        fechamento: l.leitura_final === null ? null : Number(l.leitura_final),
        valorDia: l.valor_total === null ? null : Number(l.valor_total),
    }));
    const mensal = encerranteMensal(diarias);

    const nomeProduto = new Map(entrada.combustiveis.map((c) => [c.id, c.nome]));
    const bicos: VendaBicoMes[] = mensal.bicos.flatMap((b) => {
        const info = bicoInfo.get(Number(b.bico));
        if (!info) return [];
        return [{
            bicoId: Number(b.bico),
            numero: info.numero,
            produtoId: info.produtoId,
            produtoNome: nomeProduto.get(info.produtoId) ?? '',
            inicial: b.inicial,
            fechamento: b.fechamento,
            litros: b.litros,
            bruto: b.bruto,
            precoMedio: b.precoMedio,
        }];
    }).sort((a, b) => a.numero - b.numero);

    return { bicos, ultimoDiaFechado: mensal.ultimoDiaFechado ?? null };
}

export function montarRegistroDoMes(entrada: EntradaDoRegistro): RegistroDoMes {
    const { bicos, ultimoDiaFechado } = vendasPorBico(entrada);

    // Por produto: litros e bruto somados dos bicos (planilha `L5 = F5+F9+F10`).
    const vendaPorProduto = new Map<number, { litros: number; bruto: number }>();
    for (const b of bicos) {
        const acc = vendaPorProduto.get(b.produtoId) ?? { litros: 0, bruto: 0 };
        acc.litros += b.litros;
        acc.bruto += b.bruto;
        vendaPorProduto.set(b.produtoId, acc);
    }

    // Compras já lançadas no mês, por produto.
    const compraPorProduto = new Map<number, { litros: number; reais: number }>();
    for (const c of entrada.compras) {
        if (c.combustivel_id === null) continue;
        const acc = compraPorProduto.get(c.combustivel_id) ?? { litros: 0, reais: 0 };
        acc.litros += Number(c.quantidade_litros);
        acc.reais += Number(c.valor_total);
        compraPorProduto.set(c.combustivel_id, acc);
    }

    // Última régua antes do mês, por tanque (a entrada já vem ordenada desc).
    const reguaPorTanque = new Map<number, number>();
    for (const r of entrada.reguas) {
        if (!reguaPorTanque.has(r.tanque_id)) reguaPorTanque.set(r.tanque_id, Number(r.volume_fisico));
    }

    const combustiveis: CombustivelHibrido[] = entrada.combustiveis.map((c) => {
        const tanque = entrada.tanques.find((t) => t.combustivel_id === c.id);
        const venda = vendaPorProduto.get(c.id);
        const compra = compraPorProduto.get(c.id);
        const regua = tanque ? reguaPorTanque.get(tanque.id) : undefined;

        return {
            id: c.id,
            nome: c.nome,
            codigo: c.codigo,
            // Por produto, o salto vira "0 → litros": a tela por bico é que mostra os encerrantes.
            inicial: venda ? '0' : '',
            fechamento: venda ? formatarParaBR(venda.litros) : '',
            venda_mes_rs: venda?.bruto ?? 0,
            preco_venda_atual: formatarParaBR(
                venda && venda.litros > 0 ? venda.bruto / venda.litros : (Number.isNaN(c.preco_venda) ? 0 : c.preco_venda)
            ),
            compra_lt: '',
            compra_rs: '',
            compra_mes_lt: compra?.litros ?? 0,
            compra_mes_rs: compra?.reais ?? 0,
            estoque_anterior: formatarParaBR(regua ?? 0),
            estoque_tanque: '',
            ...(tanque ? { tanque_id: tanque.id } : {}),
            tem_regua_anterior: regua !== undefined,
        };
    });

    return { combustiveis, vendasBicos: bicos, ultimoDiaFechado };
}
