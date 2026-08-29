import { parseValue } from '../../../utils/formatters';
import type { BicoComDetalhes, Frentista, SessaoFrentista } from '../../../types/fechamento';
import type { Leitura } from '../hooks/useLeituras';
import type { MeiosPagamento } from '@posto/utils';
import { meiosDaSessao } from '../../../utils/fechamentoMeios';

/**
 * Como cada linha/fatia de exibição lê os meios canônicos (`MeiosPagamento`).
 *
 * @remarks [onda 3, 3.8] Era soma à mão de colunas da sessão (`valor_cartao_debito
 * + valor_cartao`…) — o último site do painel que somava os baldes de cartão sem
 * passar pelo módulo canônico. Agora a sessão vira `MeiosPagamento` por
 * `meiosDaSessao` (o mesmo adapter de `conferido()`), e cada rótulo declara qual
 * balde exibe. A EXIBIÇÃO mantém o split débito/crédito de propósito (as taxas
 * são diferentes); o lump legado `valor_cartao` segue somado ao débito, como
 * sempre foi nesta tela — `débito + crédito` reconstitui `cartao()`, invariante
 * travado em `calculosResumo.test.ts`.
 */
const BALDES_DE_EXIBICAO = [
    { meio: 'Pix', valorDe: (m: MeiosPagamento) => m.pix },
    { meio: 'Cartão Débito', valorDe: (m: MeiosPagamento) => m.cartaoDebito + m.cartaoLegado },
    { meio: 'Cartão Crédito', valorDe: (m: MeiosPagamento) => m.cartaoCredito },
    { meio: 'Nota a Prazo', valorDe: (m: MeiosPagamento) => m.nota },
    { meio: 'Dinheiro', valorDe: (m: MeiosPagamento) => m.dinheiro },
    { meio: 'Outros', valorDe: (m: MeiosPagamento) => m.baratao + m.moedas },
] as const;

// --- Interfaces de Domínio ---

/**
 * Representa os dados agregados de venda de combustível.
 */
export interface DadosCombustivel {
    /** Nome do combustível */
    nome: string;
    /** Quantidade total de litros vendidos */
    litros: number;
    /** Valor monetário total das vendas */
    valor: number;
}

/**
 * Representa um item de dados para gráficos de pizza (ex: formas de pagamento).
 */
export interface DadosPagamentoChart {
    /** Nome da categoria (ex: "Dinheiro", "Pix") */
    name: string;
    /** Valor acumulado */
    value: number;
    /** Permite acesso dinâmico para compatibilidade com bibliotecas de gráficos */
    [key: string]: string | number;
}

/**
 * Interface dinâmica para linhas da tabela pivô (Meio de Pagamento x Frentistas).
 * Permite acesso dinâmico por nome de frentista.
 */
export interface LinhaDetalhamento {
    /** Rótulo do meio de pagamento */
    meio: string;
    /** Totalizado da linha */
    total: number;
    /** Valores dinâmicos por nome de frentista */
    [key: string]: string | number;
}

// --- Funções Puras de Cálculo (Business Logic) ---

/**
 * Calcula o volume e valor total vendido por tipo de combustível.
 * 
 * Regra de Negócio:
 * - Itera sobre os bicos disponíveis.
 * - Calcula a diferença entre leitura final e inicial (leitura.fechamento - leitura.inicial).
 * - Considera apenas consumos positivos (> 0).
 * - Agrega por nome do combustível.
 * 
 * @param bicos Lista de bicos com preços e metadados.
 * @param leituras Mapa de leituras do dia indexado por ID do bico.
 * @returns Array de objetos contendo totais por combustível.
 */
export function calcularDadosCombustivel(
    bicos: BicoComDetalhes[],
    leituras: Record<number, Leitura>
): DadosCombustivel[] {
    const dadosMap: Record<string, DadosCombustivel> = {};

    bicos.forEach((bico) => {
        const leitura = leituras[bico.id];
        if (leitura) {
            const litros = parseValue(leitura.fechamento) - parseValue(leitura.inicial);

            if (litros > 0) {
                const nomeCombustivel = bico.combustivel.nome;

                if (!dadosMap[nomeCombustivel]) {
                    dadosMap[nomeCombustivel] = {
                        nome: nomeCombustivel,
                        litros: 0,
                        valor: 0
                    };
                }

                dadosMap[nomeCombustivel].litros += litros;
                dadosMap[nomeCombustivel].valor += litros * bico.combustivel.preco_venda;
            }
        }
    });

    return Object.values(dadosMap);
}

/**
 * Agrega os valores totais de cada forma de pagamento de todas as sessões.
 * 
 * Regra de Negócio:
 * - Soma os valores de Dinheiro, Débito, Crédito, Pix, Nota e Outros.
 * - Filtra formas de pagamento com valor zerado.
 * 
 * @param sessoes Lista de sessões de trabalho dos frentistas.
 * @returns Array de dados formatado para gráficos (name/value).
 */
export function calcularTotaisPagamentos(sessoes: SessaoFrentista[]): DadosPagamentoChart[] {
    // Ordem de exibição histórica do gráfico (Dinheiro primeiro).
    const ordem = ['Dinheiro', 'Cartão Débito', 'Cartão Crédito', 'Pix', 'Nota a Prazo', 'Outros'];
    const totais = new Map<string, number>(ordem.map((meio) => [meio, 0]));

    sessoes.forEach((sessao) => {
        const m = meiosDaSessao(sessao);
        for (const balde of BALDES_DE_EXIBICAO) {
            totais.set(balde.meio, totais.get(balde.meio)! + balde.valorDe(m));
        }
    });

    return [...totais.entries()]
        .filter(([, valor]) => valor > 0)
        .map(([name, value]) => ({ name, value }));
}

/**
 * Gera os dados para a tabela pivô de detalhamento por frentista.
 * 
 * Regra de Negócio:
 * - Identifica frentistas ativos no turno.
 * - Cruza cada forma de pagamento (linhas fixas) com cada frentista (colunas dinâmicas).
 * - Calcula o total por linha (forma de pagamento).
 * 
 * @param sessoes Sessões ativas no fechamento.
 * @param frentistas Cadastro completo de frentistas para resolução de nomes.
 * @returns Array de linhas prontas para renderização na tabela.
 */
export function gerarTabelaDetalhamento(
    sessoes: SessaoFrentista[],
    frentistas: Frentista[]
): LinhaDetalhamento[] {
    const frentistasAtivos = sessoes
        .filter((s) => s.frentistaId)
        .map((s) => {
            const f = frentistas.find((fren) => fren.id === s.frentistaId);
            const nomeExibicao = f ? f.nome.split(' ')[0] : 'Desc.';
            return {
                id: s.frentistaId!,
                nome: nomeExibicao,
                sessao: s
            };
        });

    return BALDES_DE_EXIBICAO.map((balde) => {
        const rowData: LinhaDetalhamento = {
            meio: balde.meio,
            total: 0
        };

        let totalLinha = 0;

        frentistasAtivos.forEach((f) => {
            const valor = balde.valorDe(meiosDaSessao(f.sessao));
            rowData[f.sessao.tempId] = valor;
            totalLinha += valor;
        });

        rowData.total = totalLinha;
        return rowData;
    });
}
