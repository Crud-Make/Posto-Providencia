import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    encerranteMensal,
    planilhaMensal,
    serieVendaDiaria,
    serieEntregas,
    serieNivelEstoque,
    somarDias,
    deIsoLocal,
    type LeituraDiariaBico,
    type PlanilhaMensal,
    type VendaDoDia,
    type EntregaDoDia,
    type SerieVenda,
    type SerieEstoque,
    type PontoEntrega,
} from '@posto/utils';
import { supabase } from '@/services/supabase';
import { tanqueService } from '@/services/api';
import { isSuccess } from '@/types/ui/response-types';
import { intervaloDoMes, hojeIso, type Periodo } from '@/utils/periodo';
import { PALETA } from './estado-planilha';

/** Um produto da planilha, montado a partir do cadastro e do movimento do mês. */
export interface ProdutoDoBanco {
    /** `Combustivel.id`. */
    readonly id: number;
    readonly nome: string;
    readonly cor: string;
    /** Tanque que guarda este produto. `null` quando não há tanque cadastrado. */
    readonly tanqueId: number | null;
    /** Preço médio ponderado praticado no mês (R$/L). `null` sem venda. */
    readonly preco: number | null;
    readonly compraLitros: number;
    readonly compraValor: number;
    /** Medição de abertura, como texto — é campo digitável. */
    readonly estoqueAnterior: string;
    /** Medição de fechamento, como texto — é campo digitável. */
    readonly estoqueTanque: string;
}

/** Um bico da planilha, com o encerrante do mês já apurado. */
export interface BicoDoBanco {
    /** `Bico.id`. */
    readonly id: number;
    readonly nome: string;
    readonly produtoId: number;
    readonly inicial: number | null;
    readonly fechamento: number | null;
    /** Faturamento real do bico no mês — a soma do que entrou dia a dia. */
    readonly vendaBruta: number;
}

/** Séries reais dos três gráficos. */
export interface SeriesReais {
    readonly venda: SerieVenda;
    readonly entregas: readonly PontoEntrega[];
    readonly estoque: SerieEstoque;
    readonly diasNoMes: number;
}

/** De onde veio cada bloco — a tela precisa dizer isso quando vier vazio. */
export interface Procedencia {
    readonly leituras: number;
    readonly compras: number;
    readonly despesas: number;
    readonly medicoes: number;
}

interface RetornoHook {
    readonly produtos: readonly ProdutoDoBanco[];
    readonly bicos: readonly BicoDoBanco[];
    readonly apurado: PlanilhaMensal;
    readonly series: SeriesReais;
    readonly procedencia: Procedencia;
    /** Produtos sem medição de abertura — para eles não há perda apurável. */
    readonly produtosSemAbertura: readonly string[];
    readonly periodo: Periodo;
    /** Data em que a medição de abertura é gravada — o dia anterior ao período. */
    readonly dataAbertura: string;
    readonly carregando: boolean;
    readonly erro: string | null;
    /** `true` quando há medição digitada e ainda não gravada. */
    readonly temPendencia: boolean;
    readonly salvando: boolean;
    readonly editarMedicao: (
        produtoId: number,
        campo: 'estoqueAnterior' | 'estoqueTanque',
        valor: string
    ) => void;
    /** @returns Mensagem de erro, ou `null` em caso de sucesso. */
    readonly salvarMedicoes: () => Promise<string | null>;
    readonly descartarMedicoes: () => void;
    readonly recarregar: () => Promise<void>;
}

interface BicoRow {
    id: number;
    numero: number;
    combustivel_id: number | null;
}
interface CombustivelRow {
    id: number;
    nome: string;
    cor: string | null;
    codigo: string;
}
interface LeituraRow {
    data: string;
    bico_id: number;
    leitura_inicial: number | string | null;
    leitura_final: number | string | null;
    valor_total: number | string | null;
}
interface CompraRow {
    data: string;
    combustivel_id: number | null;
    quantidade_litros: number | string | null;
    valor_total: number | string | null;
}
interface TanqueRow {
    id: number;
    combustivel_id: number | null;
}
interface MedicaoRow {
    tanque_id: number;
    data: string;
    volume_fisico: number | string | null;
}

const num = (v: number | string | null | undefined): number => Number(v ?? 0);

/** Texto de campo para número. Campo vazio vira `null`, nunca zero. */
function numeroDoCampo(texto: string): number | null {
    if (texto.trim() === '') return null;
    const n = Number(texto.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
}

/**
 * Dia do mês a partir do timestamp do banco, **sem** passar por fuso.
 *
 * @remarks `new Date(iso).getDate()` converte de UTC para o horário local e joga
 *          cada leitura um dia para trás — o posto está em GMT-3 e o banco grava
 *          meia-noite UTC. Recortar a string é o que mantém 01/01 sendo 01/01.
 */
const diaDoIso = (iso: string): number => Number(iso.slice(8, 10));

/** Rótulo do bico como o dono lê: `Bico 01`. */
const rotuloBico = (numero: number): string => `Bico ${String(numero).padStart(2, '0')}`;

/**
 * Dia anterior a uma data ISO local, sem passar por fuso.
 *
 * @remarks Mesma armadilha do {@link diaDoIso}: `new Date(iso)` interpreta a
 *          string como UTC e, no GMT-3 do posto, devolve o dia errado.
 */
function diaAnterior(iso: string): string {
    return somarDias(deIsoLocal(iso), -1);
}

/** Quantos dias tem o mês `aaaa-mm`. */
function diasDoMes(mesIso: string): number {
    const [ano, mes] = mesIso.split('-').map(Number);
    return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/**
 * Traduz a recusa da RLS para uma frase que o dono entenda.
 *
 * @remarks Sem login o painel acessa o banco como visitante, e a policy recusa a
 *          escrita. O Postgres devolve "new row violates row-level security
 *          policy", que não diz nada a quem está tentando gravar uma medição —
 *          e faz o sistema parecer quebrado quando é permissão.
 */
function mensagemDeErro(erro: string): string {
    return /row-level security|42501|violates row-level/i.test(erro)
        ? 'O painel não tem permissão para gravar esta medição (você está em modo visitante). ' +
              'Entre com seu login e tente de novo.'
        : erro;
}

/**
 * A planilha do mês, ligada ao banco.
 *
 * @remarks **O que é leitura e o que é escrita, e por quê:**
 *
 *          Só as duas medições de tanque são graváveis daqui, porque só elas têm
 *          mapeamento inequívoco — uma linha de `HistoricoTanque` por tanque e
 *          data, que é exatamente o que a régua produz.
 *
 *          As demais colunas são derivadas e ficam somente leitura de propósito:
 *          `Inicial`/`Fechamento` vêm da `Leitura` diária, e reescrevê-las daqui
 *          alteraria dia já fechado; `Compra` e `Despesa` são por nota, e um
 *          total mensal digitado não sabe a qual nota pertence. Cada uma tem sua
 *          tela, e é lá que o lançamento nasce.
 *
 *          O cálculo inteiro vem de `planilhaMensal` (`@posto/utils`) — este hook
 *          busca, mapeia e monta a entrada, e não faz conta nenhuma.
 */
export function usePlanilhaDoBanco(postoId: number | null, mesIso: string): RetornoHook {
    const [produtos, setProdutos] = useState<readonly ProdutoDoBanco[]>([]);
    const [bicos, setBicos] = useState<readonly BicoDoBanco[]>([]);
    const [vendasDiarias, setVendasDiarias] = useState<readonly VendaDoDia[]>([]);
    const [entregasDiarias, setEntregasDiarias] = useState<readonly EntregaDoDia[]>([]);
    const [despesasDoMes, setDespesasDoMes] = useState(0);
    const [procedencia, setProcedencia] = useState<Procedencia>({
        leituras: 0,
        compras: 0,
        despesas: 0,
        medicoes: 0,
    });
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);

    /** Medições digitadas e ainda não gravadas, sobrepostas ao que veio do banco. */
    const [rascunho, setRascunho] = useState<
        Readonly<Record<number, { estoqueAnterior?: string; estoqueTanque?: string }>>
    >({});

    const periodo = useMemo(() => intervaloDoMes(mesIso, hojeIso()), [mesIso]);
    const dataAbertura = useMemo(() => diaAnterior(periodo.inicio), [periodo.inicio]);
    const diasNoMes = useMemo(() => diasDoMes(mesIso), [mesIso]);

    const carregar = useCallback(async () => {
        if (!postoId) {
            setProdutos([]);
            setBicos([]);
            setCarregando(false);
            return;
        }

        setCarregando(true);
        setErro(null);

        try {
            const [bicosRes, combustiveisRes, leiturasRes, comprasRes, despesasRes, tanquesRes] =
                await Promise.all([
                    supabase
                        .from('Bico')
                        .select('id, numero, combustivel_id')
                        .eq('posto_id', postoId)
                        .eq('ativo', true)
                        .order('numero'),
                    supabase
                        .from('Combustivel')
                        .select('id, nome, cor, codigo')
                        .eq('posto_id', postoId)
                        .eq('ativo', true),
                    supabase
                        .from('Leitura')
                        .select('data, bico_id, leitura_inicial, leitura_final, valor_total')
                        .eq('posto_id', postoId)
                        .gte('data', periodo.inicio)
                        .lte('data', periodo.fim),
                    supabase
                        .from('Compra')
                        .select('data, combustivel_id, quantidade_litros, valor_total')
                        .eq('posto_id', postoId)
                        .gte('data', periodo.inicio)
                        .lte('data', periodo.fim),
                    supabase
                        .from('Despesa')
                        .select('valor')
                        .eq('posto_id', postoId)
                        .gte('data', periodo.inicio)
                        .lte('data', periodo.fim),
                    supabase.from('Tanque').select('id, combustivel_id').eq('posto_id', postoId),
                ]);

            const bicosRows = (bicosRes.data ?? []) as BicoRow[];
            const combustiveis = (combustiveisRes.data ?? []) as CombustivelRow[];
            const leituras = (leiturasRes.data ?? []) as LeituraRow[];
            const compras = (comprasRes.data ?? []) as CompraRow[];
            const despesas = (despesasRes.data ?? []) as { valor: number | string | null }[];
            const tanques = (tanquesRes.data ?? []) as TanqueRow[];

            // ── Medições de tanque ────────────────────────────────────────────
            // Tudo até o fim do período: a abertura é a última medição ANTERIOR
            // ao início, e o fechamento a última dentro dele.
            const medicoes =
                tanques.length > 0
                    ? (
                          (
                              await supabase
                                  .from('HistoricoTanque')
                                  .select('tanque_id, data, volume_fisico')
                                  .in('tanque_id', tanques.map((t) => t.id))
                                  .lte('data', periodo.fim)
                                  .order('data', { ascending: true })
                          ).data ?? []
                      ) as MedicaoRow[]
                    : [];

            const tanqueDoProduto = new Map<number, number>();
            for (const t of tanques) {
                if (t.combustivel_id !== null && !tanqueDoProduto.has(t.combustivel_id)) {
                    tanqueDoProduto.set(t.combustivel_id, t.id);
                }
            }
            const produtoDoTanque = new Map(
                tanques.filter((t) => t.combustivel_id !== null).map((t) => [t.id, t.combustivel_id as number])
            );

            const aberturaPorProduto = new Map<number, number>();
            const fechamentoPorProduto = new Map<number, number>();
            for (const m of medicoes) {
                const produtoId = produtoDoTanque.get(m.tanque_id);
                if (produtoId === undefined || m.volume_fisico === null) continue;
                // Vêm em ordem crescente: a última de cada faixa sobrescreve e vale.
                if (m.data < periodo.inicio) aberturaPorProduto.set(produtoId, num(m.volume_fisico));
                else fechamentoPorProduto.set(produtoId, num(m.volume_fisico));
            }

            // ── Encerrante do mês por bico ────────────────────────────────────
            const diarias: LeituraDiariaBico[] = leituras.map((l) => ({
                dia: diaDoIso(l.data),
                bico: String(l.bico_id),
                inicial: l.leitura_inicial === null ? null : num(l.leitura_inicial),
                fechamento: l.leitura_final === null ? null : num(l.leitura_final),
                valorDia: l.valor_total === null ? null : num(l.valor_total),
            }));

            const mensal = encerranteMensal(diarias);
            const porBico = new Map(mensal.bicos.map((b) => [b.bico, b]));

            // ── Compra do mês por produto ─────────────────────────────────────
            const compraPorProduto = new Map<number, { litros: number; valor: number }>();
            for (const c of compras) {
                if (c.combustivel_id === null) continue;
                const atual = compraPorProduto.get(c.combustivel_id) ?? { litros: 0, valor: 0 };
                compraPorProduto.set(c.combustivel_id, {
                    litros: atual.litros + num(c.quantidade_litros),
                    valor: atual.valor + num(c.valor_total),
                });
            }

            const emTexto = (v: number | undefined): string => (v === undefined ? '' : String(v));

            setProdutos(
                combustiveis.map((c, i) => {
                    const compra = compraPorProduto.get(c.id);
                    return {
                        id: c.id,
                        nome: c.nome,
                        cor: c.cor ?? PALETA[i % PALETA.length],
                        tanqueId: tanqueDoProduto.get(c.id) ?? null,
                        // Preenchido depois, a partir do agregado por produto.
                        preco: null,
                        compraLitros: compra?.litros ?? 0,
                        compraValor: compra?.valor ?? 0,
                        estoqueAnterior: emTexto(aberturaPorProduto.get(c.id)),
                        estoqueTanque: emTexto(fechamentoPorProduto.get(c.id)),
                    };
                })
            );

            setBicos(
                bicosRows
                    .filter((b) => b.combustivel_id !== null)
                    .map((b) => {
                        const acumulado = porBico.get(String(b.id));
                        return {
                            id: b.id,
                            nome: rotuloBico(b.numero),
                            produtoId: b.combustivel_id as number,
                            inicial: acumulado?.inicial ?? null,
                            fechamento: acumulado?.fechamento ?? null,
                            vendaBruta: acumulado?.bruto ?? 0,
                        };
                    })
            );

            // ── Séries dos gráficos, agora de dado real ───────────────────────
            setVendasDiarias(
                diarias
                    .filter((d) => d.inicial !== null && d.fechamento !== null)
                    .map((d) => ({
                        dia: d.dia,
                        litros: Math.max(0, (d.fechamento as number) - (d.inicial as number)),
                    }))
            );
            setEntregasDiarias(
                compras.map((c) => ({
                    dia: diaDoIso(c.data),
                    litros: num(c.quantidade_litros),
                    valor: num(c.valor_total),
                }))
            );

            setDespesasDoMes(despesas.reduce((acc, d) => acc + num(d.valor), 0));
            setProcedencia({
                leituras: leituras.length,
                compras: compras.length,
                despesas: despesas.length,
                medicoes: medicoes.length,
            });
            setRascunho({});
        } catch (e) {
            console.error('Erro ao carregar a planilha do mês:', e);
            setErro('Falha ao carregar a planilha do mês.');
        } finally {
            setCarregando(false);
        }
    }, [postoId, periodo.inicio, periodo.fim]);

    useEffect(() => {
        carregar();
    }, [carregar]);

    /** O que o produto mostra hoje: o rascunho quando existe, senão o banco. */
    const produtosComRascunho = useMemo(
        (): readonly ProdutoDoBanco[] =>
            produtos.map((p) => ({
                ...p,
                estoqueAnterior: rascunho[p.id]?.estoqueAnterior ?? p.estoqueAnterior,
                estoqueTanque: rascunho[p.id]?.estoqueTanque ?? p.estoqueTanque,
            })),
        [produtos, rascunho]
    );

    const apurado = useMemo(() => {
        const litrosDoProduto = new Map<number, number>();
        for (const b of bicos) {
            if (b.inicial === null || b.fechamento === null) continue;
            litrosDoProduto.set(
                b.produtoId,
                (litrosDoProduto.get(b.produtoId) ?? 0) + (b.fechamento - b.inicial)
            );
        }
        const vendaDoProduto = new Map<number, number>();
        for (const b of bicos) {
            vendaDoProduto.set(b.produtoId, (vendaDoProduto.get(b.produtoId) ?? 0) + b.vendaBruta);
        }

        return planilhaMensal({
            bicos: bicos.map((b) => ({
                bico: b.nome,
                produto: String(b.produtoId),
                inicial: b.inicial ?? 0,
                fechamento: b.fechamento ?? 0,
                vendaBruta: b.vendaBruta,
            })),
            produtos: produtosComRascunho.map((p) => {
                const litros = litrosDoProduto.get(p.id) ?? 0;
                const venda = vendaDoProduto.get(p.id) ?? 0;
                const abertura = numeroDoCampo(p.estoqueAnterior);
                const medido = numeroDoCampo(p.estoqueTanque);

                return {
                    produto: String(p.id),
                    // Preço médio ponderado real do mês. Não é o `preco_venda` do
                    // cadastro: aquele guarda só o preço de hoje, e aplicá-lo a um
                    // mês passado é o bug do "preço único" que já inflou a venda
                    // histórica em 8–11%.
                    preco: litros > 0 ? venda / litros : 0,
                    compraLitros: p.compraLitros,
                    compraValor: p.compraValor,
                    estoqueAnterior: abertura ?? 0,
                    // Sem medição de abertura o estoque teórico partiria de zero e
                    // acusaria uma perda inteira que nunca existiu. Nesse caso a
                    // perda não é apurável, mesmo com o tanque medido no fim.
                    estoqueTanque: abertura === null ? null : medido,
                };
            }),
            despesasDoMes,
        });
    }, [bicos, produtosComRascunho, despesasDoMes]);

    const series = useMemo((): SeriesReais => {
        const estoqueInicial = produtosComRascunho.reduce(
            (acc, p) => acc + (numeroDoCampo(p.estoqueAnterior) ?? 0),
            0
        );

        return {
            venda: serieVendaDiaria(vendasDiarias, diasNoMes),
            entregas: serieEntregas(entregasDiarias),
            estoque: serieNivelEstoque(estoqueInicial, vendasDiarias, entregasDiarias, diasNoMes),
            diasNoMes,
        };
    }, [vendasDiarias, entregasDiarias, produtosComRascunho, diasNoMes]);

    const editarMedicao = useCallback(
        (produtoId: number, campo: 'estoqueAnterior' | 'estoqueTanque', valor: string) => {
            setRascunho((r) => ({ ...r, [produtoId]: { ...r[produtoId], [campo]: valor } }));
        },
        []
    );

    const descartarMedicoes = useCallback(() => setRascunho({}), []);

    /**
     * Grava as medições digitadas.
     *
     * @remarks A abertura vai na data **anterior** ao início do período, e o
     *          fechamento na data de fim. É o que faz o `Estoque anterior` de
     *          fevereiro ser o mesmo número que o `Estoque tanque` de janeiro —
     *          gravar a abertura dentro do próprio mês criaria dois estoques
     *          iniciais discordantes para o mesmo dia.
     */
    const salvarMedicoes = useCallback(async (): Promise<string | null> => {
        const pendentes = Object.entries(rascunho);
        if (pendentes.length === 0) return null;

        const semTanque = produtos.filter(
            (p) => rascunho[p.id] !== undefined && p.tanqueId === null
        );
        if (semTanque.length > 0) {
            return `Sem tanque cadastrado para ${semTanque
                .map((p) => p.nome)
                .join(', ')} — a medição precisa de um tanque para ser gravada.`;
        }

        setSalvando(true);
        try {
            for (const [id, campos] of pendentes) {
                const produto = produtos.find((p) => p.id === Number(id));
                if (!produto || produto.tanqueId === null) continue;

                for (const [campo, valor] of Object.entries(campos)) {
                    if (valor === undefined) continue;
                    const volume = Number(String(valor).replace(',', '.'));
                    if (!Number.isFinite(volume) || volume < 0) {
                        return `Medição inválida em ${produto.nome}: "${valor}".`;
                    }

                    const resposta = await tanqueService.saveHistory({
                        tanque_id: produto.tanqueId,
                        data: campo === 'estoqueAnterior' ? dataAbertura : periodo.fim.slice(0, 10),
                        volume_fisico: volume,
                    });

                    if (!isSuccess(resposta)) return mensagemDeErro(resposta.error);
                }
            }

            await carregar();
            return null;
        } finally {
            setSalvando(false);
        }
    }, [rascunho, produtos, dataAbertura, periodo.fim, carregar]);

    return {
        produtos: produtosComRascunho,
        bicos,
        apurado,
        series,
        procedencia,
        produtosSemAbertura: produtosComRascunho
            .filter((p) => numeroDoCampo(p.estoqueAnterior) === null)
            .map((p) => p.nome),
        periodo,
        dataAbertura,
        carregando,
        erro,
        temPendencia: Object.keys(rascunho).length > 0,
        salvando,
        editarMedicao,
        salvarMedicoes,
        descartarMedicoes,
        recarregar: carregar,
    };
}
