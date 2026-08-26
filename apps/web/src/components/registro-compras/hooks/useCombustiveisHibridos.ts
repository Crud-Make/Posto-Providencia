/**
 * Hook para gerenciar combustíveis no Registro de Compras.
 *
 * @remarks
 * Estado híbrido: string nos campos que o gerente digita, número no que vem do
 * banco. **Só três coisas se digitam aqui** — a compra do dia (litros e reais)
 * e a régua do tanque. Todo o resto é lido do mês:
 *
 * - **Vendas** (inicial, fechamento, litros, faturamento) vêm de `Leitura`,
 *   consolidadas por `encerranteMensal` — o mesmo módulo da Planilha do Mês.
 *   A planilha real redigita esses números no resumo (`D5:E10` são literais)
 *   porque não tem vínculo com as abas diárias; o sistema tem, e usa.
 * - **Compras já lançadas no mês** vêm de `Compra`: o custo médio do litro é
 *   `Σ R$ ÷ Σ L` do mês inteiro (`F16 = E16/D16`), não só da compra que está
 *   sendo digitada.
 * - **Estoque anterior** é a última régua ANTES do mês (`HistoricoTanque`),
 *   o `Ano passado.` da planilha (`D24`) — nunca `Tanque.estoque_atual`, que
 *   era um contador que ninguém subtraía.
 *
 * Nada de `preco_custo` do cadastro: é um preço só, o de hoje, e aplicá-lo ao
 * mês é o bug do "preço único" (ver `@posto/utils/resumo-produto`).
 */
import { useState, useEffect, useCallback } from 'react';
import { encerranteMensal, type LeituraDiariaBico } from '@posto/utils';
import { supabase } from '../../../services/supabase';
import { combustivelService, tanqueService } from '../../../services/api';
import type { ApiResponse } from '../../../types/ui/response-types';
import { isSuccess } from '../../../types/ui/response-types';
import { Combustivel, Tanque } from '../../../types/database/index';
import { usePosto } from '../../../contexts/usePosto';
import { formatarParaBR } from '../../../utils/formatters';
import { intervaloDoMes, hojeIso } from '../../../utils/periodo';

/**
 * Extrai o `data` de uma `ApiResponse` com mensagem de erro consistente.
 *
 * @param response - Resposta retornada pelos services
 */
function extractApiData<T>(response: ApiResponse<T>): T {
    if (isSuccess(response)) return response.data;
    throw new Error(response.error || 'Erro ao buscar dados do serviço');
}

/**
 * Combustível com estado híbrido (string para inputs, número para o que vem do banco).
 */
export type CombustivelHibrido = {
    id: number;
    nome: string;
    codigo: string;
    // ── VENDA — lida do mês, somente leitura ──────────────────────────────
    /** Base do salto por produto — `'0'` quando há venda no mês, `''` sem venda. Encerrante real é por bico ({@link VendaBicoMes}). */
    inicial: string;
    /** Litros vendidos do produto no mês (Σ dos bicos), como texto — `fechamento − inicial` dá os litros. */
    fechamento: string;
    /** Faturamento real do mês (Σ `Leitura.valor_total`), em reais. */
    venda_mes_rs: number;
    /**
     * Preço de bomba DO MÊS, em R$/L: bruto ÷ litros das leituras do produto.
     * Cai para o `preco_venda` do cadastro só quando o mês não tem leitura —
     * aplicar o preço de hoje a um mês passado é o bug do "preço único".
     */
    preco_venda_atual: string;
    // ── COMPRA — a do dia é digitada; a do mês vem do banco ───────────────
    compra_lt: string;
    compra_rs: string;
    /** Litros já comprados no mês, antes desta tela. */
    compra_mes_lt: number;
    /** Reais já pagos no mês, antes desta tela. */
    compra_mes_rs: number;
    // ── ESTOQUE ───────────────────────────────────────────────────────────
    /** Última régua ANTES do mês (`Ano passado.` da planilha), em litros. */
    estoque_anterior: string;
    /** Régua do fim do mês — digitada (planilha `H24` literal). */
    estoque_tanque: string;
    tanque_id?: number;
    /** `false` quando não há régua anterior ao mês: o `estoque_anterior` é 0 por falta de dado. */
    tem_regua_anterior: boolean;
};

/**
 * Venda do mês de UM bico — a linha 5–10 do resumo da planilha.
 *
 * @remarks A planilha mostra bico a bico, e o dono confere o encerrante de
 *          cada um (o `1.716.778,963` do B01). Somar os três bicos de Comum
 *          num número só esconde exatamente o que ele procura.
 */
export interface VendaBicoMes {
    readonly bicoId: number;
    readonly numero: number;
    readonly produtoId: number;
    readonly produtoNome: string;
    readonly inicial: number | null;
    readonly fechamento: number | null;
    readonly litros: number;
    /** Faturamento real do mês nesse bico (Σ `valor_total`). */
    readonly bruto: number;
    /** `bruto ÷ litros` — o preço de bomba praticado no mês. `null` sem venda. */
    readonly precoMedio: number | null;
}

/** Campos que o gerente digita — os únicos que sobrevivem a um recarregamento. */
export const CAMPOS_DIGITADOS = ['compra_lt', 'compra_rs', 'estoque_tanque'] as const;
export type CampoDigitado = (typeof CAMPOS_DIGITADOS)[number];

interface LeituraRow {
    data: string;
    bico_id: number;
    leitura_inicial: number | string | null;
    leitura_final: number | string | null;
    valor_total: number | string | null;
    bico: { id: number; numero: number; combustivel_id: number } | null;
}
interface CompraRow { combustivel_id: number | null; quantidade_litros: number | string; valor_total: number | string }
interface ReguaRow { tanque_id: number; data: string; volume_fisico: number | string | null }

/**
 * Dia do mês a partir do timestamp do banco, sem `new Date()` — converter para
 * horário local escorrega a leitura um dia para trás.
 */
const diaDoMes = (iso: string): number => Number(iso.slice(8, 10));

/**
 * @param mesIso - Mês exibido, `aaaa-mm`. A tela é MENSAL como a planilha:
 *        a compra de hoje entra no custo do mês inteiro.
 */
export const useCombustiveisHibridos = (mesIso: string) => {
    const { postoAtivoId } = usePosto();
    const [loading, setLoading] = useState(true);
    const [combustiveis, setCombustiveis] = useState<CombustivelHibrido[]>([]);
    /** Último dia em que TODOS os bicos estavam fechados; `null` sem leitura no mês. */
    const [ultimoDiaFechado, setUltimoDiaFechado] = useState<number | null>(null);
    const [vendasBicos, setVendasBicos] = useState<VendaBicoMes[]>([]);

    /** Carrega cadastro, vendas, compras e régua do mês. */
    const loadData = useCallback(async () => {
        if (!postoAtivoId) return;

        try {
            setLoading(true);
            const periodo = intervaloDoMes(mesIso, hojeIso());

            const [combustiveisRes, tanquesRes, leiturasRes, comprasRes, reguasRes] = await Promise.all([
                combustivelService.getAll(postoAtivoId),
                tanqueService.getAll(postoAtivoId),
                supabase
                    .from('Leitura')
                    .select('data, bico_id, leitura_inicial, leitura_final, valor_total, bico:Bico!inner(id, numero, combustivel_id)')
                    .eq('posto_id', postoAtivoId)
                    .gte('data', periodo.inicio)
                    .lte('data', periodo.fim),
                supabase
                    .from('Compra')
                    .select('combustivel_id, quantidade_litros, valor_total')
                    .eq('posto_id', postoAtivoId)
                    .gte('data', periodo.inicio)
                    .lte('data', periodo.fim),
                supabase
                    .from('HistoricoTanque')
                    .select('tanque_id, data, volume_fisico')
                    .lt('data', periodo.inicio)
                    .not('volume_fisico', 'is', null)
                    .order('data', { ascending: false }),
            ]);

            const data = extractApiData(combustiveisRes as ApiResponse<Combustivel[]>);
            const tanques = extractApiData(tanquesRes as ApiResponse<Tanque[]>);
            if (leiturasRes.error) throw new Error(`Falha ao ler as vendas do mês: ${leiturasRes.error.message}`);
            if (comprasRes.error) throw new Error(`Falha ao ler as compras do mês: ${comprasRes.error.message}`);
            if (reguasRes.error) throw new Error(`Falha ao ler a régua anterior: ${reguasRes.error.message}`);

            // Vendas do mês por produto — soma dos bicos daquele produto, como a
            // planilha faz em `L5 = F5+F9+F10` (Comum = B01+B05+B06).
            const leituras = (leiturasRes.data ?? []) as unknown as LeituraRow[];
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
            setUltimoDiaFechado(mensal.ultimoDiaFechado ?? null);

            const nomeProduto = new Map(data.map((c) => [c.id, c.nome]));
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
            setVendasBicos(bicos);

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
            for (const c of (comprasRes.data ?? []) as CompraRow[]) {
                if (c.combustivel_id === null) continue;
                const acc = compraPorProduto.get(c.combustivel_id) ?? { litros: 0, reais: 0 };
                acc.litros += Number(c.quantidade_litros);
                acc.reais += Number(c.valor_total);
                compraPorProduto.set(c.combustivel_id, acc);
            }

            // Última régua antes do mês, por tanque (a query já vem ordenada desc).
            const reguaPorTanque = new Map<number, number>();
            for (const r of (reguasRes.data ?? []) as ReguaRow[]) {
                if (!reguaPorTanque.has(r.tanque_id)) reguaPorTanque.set(r.tanque_id, Number(r.volume_fisico));
            }

            const mapped: CombustivelHibrido[] = data.map((c) => {
                const tanque = tanques.find((t) => t.combustivel_id === c.id);
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
                        venda && venda.litros > 0 ? venda.bruto / venda.litros : (c.preco_venda || 0)
                    ),
                    compra_lt: '',
                    compra_rs: '',
                    compra_mes_lt: compra?.litros ?? 0,
                    compra_mes_rs: compra?.reais ?? 0,
                    estoque_anterior: formatarParaBR(regua ?? 0),
                    estoque_tanque: '',
                    tanque_id: tanque?.id,
                    tem_regua_anterior: regua !== undefined,
                };
            });
            setCombustiveis(mapped);
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }, [postoAtivoId, mesIso]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    /** Atualiza um campo digitado de um combustível no estado local */
    const updateCombustivel = (id: number, field: CampoDigitado, value: string) => {
        setCombustiveis((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    };

    return {
        combustiveis,
        setCombustiveis,
        vendasBicos,
        ultimoDiaFechado,
        loading,
        loadData,
        updateCombustivel,
    };
};
