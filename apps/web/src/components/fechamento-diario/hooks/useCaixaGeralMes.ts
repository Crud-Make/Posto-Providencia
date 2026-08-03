/**
 * Visão do MÊS do Caixa Geral: quanto entrou em cada forma de pagamento no mês
 * inteiro, não no dia selecionado.
 *
 * @remarks
 * **De onde vem o número.** Do que os frentistas declararam (`FechamentoFrentista`),
 * não da tabela `Recebimento`. Motivo medido: `Recebimento` tem 4 linhas no ano
 * inteiro, porque o ETL do histórico não a carrega de propósito — as formas
 * eletrônicas já entram no fechamento do frentista, e carregar as duas contaria em
 * dobro (`scripts/carga-historico-fechamento.py`). É a mesma fonte que o painel
 * "Detalhamento por Frentista" já usa no dia.
 *
 * **Somente leitura, e isso é regra, não preguiça.** Um total de mês não tem onde ser
 * salvo: `Recebimento` pendura em UM `Fechamento`, que é de um dia. Gravar o mês
 * inteiro num dia inventaria movimento que não aconteceu naquela data e estouraria a
 * conferência daquele dia. Quem edita é a visão de dia.
 */
import { useState, useEffect, useCallback } from 'react';
import { fechamentoFrentistaService, leituraService } from '../../../services/api';
import { isSuccess } from '../../../types/ui/response-types';
import { intervaloDoMes, hojeIso } from '../../../utils/periodo';
import {
    totaisDasLinhas,
    sessaoDaLinha,
    agruparPorFrentista,
    type TotaisPorBalde,
    type LinhaFechamentoFrentista,
} from '../../../utils/fechamentoMeios';
import type { SessaoFrentista } from '../../../types/fechamento';
import type { DadosCombustivel } from '../services/calculosResumo';
import { conferido, meiosFromFechamentoRow } from '@posto/utils';

interface RetornoCaixaGeralMes {
    /** Total de cada balde canônico no mês. Zerado enquanto carrega. */
    totais: TotaisPorBalde;
    /** Soma conferida do mês — igual à soma dos baldes, pela invariante de `conferido()`. */
    totalConferido: number;
    /** Quantos dias do mês têm fechamento de frentista. */
    diasComMovimento: number;
    /**
     * As linhas do mês no formato que a UI diária já manipula, para o gráfico de
     * pagamentos e a tabela por frentista funcionarem sem cálculo duplicado.
     */
    sessoes: SessaoFrentista[];
    /** Volume e faturamento por combustível no mês, das leituras de bomba. */
    dadosCombustivel: DadosCombustivel[];
    /** Litros vendidos no mês. */
    totalLitros: number;
    carregando: boolean;
    erro: string | null;
    recarregar: () => void;
}

const ZERADO: TotaisPorBalde = {
    dinheiro: 0, moedas: 0, pix: 0, credito: 0, debito: 0, nota: 0, baratao: 0,
};

/** Resultado de uma consulta, carimbado com a chave que o produziu. */
interface Resultado {
    readonly chave: string;
    readonly totais: TotaisPorBalde;
    readonly totalConferido: number;
    readonly diasComMovimento: number;
    readonly sessoes: SessaoFrentista[];
    readonly dadosCombustivel: DadosCombustivel[];
    readonly totalLitros: number;
    readonly erro: string | null;
}

const VAZIO = {
    totais: ZERADO,
    totalConferido: 0,
    diasComMovimento: 0,
    sessoes: [] as SessaoFrentista[],
    dadosCombustivel: [] as DadosCombustivel[],
    totalLitros: 0,
};

/**
 * @param postoId - Posto ativo. Sem ele o hook não consulta.
 * @param mesIso - Mês desejado, `aaaa-mm`.
 * @param ativo - `false` deixa o hook parado; evita consultar o mês enquanto o dono
 *                está na visão de dia.
 */
export function useCaixaGeralMes(
    postoId: number | null,
    mesIso: string,
    ativo: boolean
): RetornoCaixaGeralMes {
    const [resultado, setResultado] = useState<Resultado | null>(null);
    const [gatilho, setGatilho] = useState(0);

    const recarregar = useCallback(() => setGatilho((g) => g + 1), []);

    // Chave do que se quer ver agora. `null` = não há o que consultar.
    const chave = ativo && postoId && mesIso ? `${postoId}|${mesIso}|${gatilho}` : null;

    useEffect(() => {
        if (!chave || !postoId) return;

        let cancelado = false;
        const { inicio, fim } = intervaloDoMes(mesIso, hojeIso());

        Promise.all([
            fechamentoFrentistaService.getByPeriodo(inicio, fim, postoId),
            leituraService.getByDateRange(inicio, fim, postoId),
        ]).then(([resSessoes, resLeituras]) => {
            if (cancelado) return;

            if (!isSuccess(resSessoes)) {
                setResultado({
                    chave,
                    ...VAZIO,
                    erro: resSessoes.error ?? 'Não foi possível carregar o mês',
                });
                return;
            }

            const linhas = resSessoes.data as unknown as LinhaFechamentoFrentista[];

            // Volume e faturamento por combustível, direto de `Leitura`: no mês não dá
            // para usar a conta do dia (fechamento − inicial por bico), porque há uma
            // leitura por dia para cada bico. `litros_vendidos`/`valor_total` já vêm
            // calculados por linha, então somar é a agregação correta.
            const porCombustivel = new Map<string, DadosCombustivel>();
            let totalLitros = 0;
            for (const l of isSuccess(resLeituras) ? resLeituras.data : []) {
                const nome = l.bico?.combustivel?.nome;
                if (!nome) continue;

                const atual = porCombustivel.get(nome) ?? { nome, litros: 0, valor: 0 };
                atual.litros += l.litros_vendidos || 0;
                atual.valor += l.valor_total || 0;
                porCombustivel.set(nome, atual);
                totalLitros += l.litros_vendidos || 0;
            }

            setResultado({
                chave,
                totais: totaisDasLinhas(linhas),
                totalConferido:
                    Math.round(
                        linhas.reduce((acc, l) => acc + conferido(meiosFromFechamentoRow(l)), 0) * 100
                    ) / 100,
                diasComMovimento: new Set(
                    resSessoes.data
                        .map((l) => l.fechamento?.data)
                        .filter(Boolean)
                        .map((d) => String(d).slice(0, 10))
                ).size,
                // Uma linha por frentista, não por dia: a tabela de detalhamento cria
                // uma coluna por item recebido, e sem agrupar junho saía com 133.
                sessoes: agruparPorFrentista(linhas).map(sessaoDaLinha),
                dadosCombustivel: [...porCombustivel.values()],
                totalLitros: Math.round(totalLitros * 1000) / 1000,
                erro: null,
            });
        });

        return () => {
            cancelado = true;
        };
    }, [chave, postoId, mesIso]);

    // `carregando` é DERIVADO, não guardado: é verdade sempre que o resultado em mãos
    // não corresponde à chave pedida. Guardar em estado exigiria um `setState` no
    // corpo do efeito (o que a regra `react-hooks/set-state-in-effect` barra, com
    // razão: gera render extra) e abriria espaço para ele dessincronizar do pedido.
    const pronto = resultado !== null && resultado.chave === chave;

    return {
        totais: pronto ? resultado.totais : VAZIO.totais,
        totalConferido: pronto ? resultado.totalConferido : VAZIO.totalConferido,
        diasComMovimento: pronto ? resultado.diasComMovimento : VAZIO.diasComMovimento,
        sessoes: pronto ? resultado.sessoes : VAZIO.sessoes,
        dadosCombustivel: pronto ? resultado.dadosCombustivel : VAZIO.dadosCombustivel,
        totalLitros: pronto ? resultado.totalLitros : VAZIO.totalLitros,
        carregando: chave !== null && !pronto,
        erro: pronto ? resultado.erro : null,
        recarregar,
    };
}
