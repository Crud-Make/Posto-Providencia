import { paraReais, parseValue } from '../../../utils/formatters';
import type { BicoComDetalhes, Frentista, SessaoFrentista } from '../../../types/fechamento';
import type { Leitura } from '../hooks/useLeituras';

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
    const totais = {
        Dinheiro: 0,
        'Cartão Débito': 0,
        'Cartão Crédito': 0,
        Pix: 0,
        'Nota a Prazo': 0,
        Outros: 0,
    };

    sessoes.forEach((sessao) => {
        totais['Dinheiro'] += parseValue(sessao.valor_dinheiro);
        totais['Cartão Débito'] += parseValue(sessao.valor_cartao_debito);
        totais['Cartão Crédito'] += parseValue(sessao.valor_cartao_credito);
        totais['Pix'] += parseValue(sessao.valor_pix);
        totais['Nota a Prazo'] += parseValue(sessao.valor_nota);
        totais['Outros'] += parseValue(sessao.valor_baratao);
    });

    return Object.entries(totais)
        .filter(([_, valor]) => valor > 0)
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

    const definicaoLinhas = [
        { id: 'pix', label: 'Pix', key: 'valor_pix' as keyof SessaoFrentista },
        { id: 'debito', label: 'Cartão Débito', key: 'valor_cartao_debito' as keyof SessaoFrentista },
        { id: 'credito', label: 'Cartão Crédito', key: 'valor_cartao_credito' as keyof SessaoFrentista },
        { id: 'nota', label: 'Nota a Prazo', key: 'valor_nota' as keyof SessaoFrentista },
        { id: 'dinheiro', label: 'Dinheiro', key: 'valor_dinheiro' as keyof SessaoFrentista },
        { id: 'outros', label: 'Outros', key: 'valor_baratao' as keyof SessaoFrentista },
    ];

    return definicaoLinhas.map((linhaDef) => {
        const rowData: LinhaDetalhamento = {
            meio: linhaDef.label,
            total: 0
        };

        let totalLinha = 0;

        frentistasAtivos.forEach((f) => {
            const valor = parseValue(f.sessao[linhaDef.key] as string);
            rowData[f.nome] = valor;
            totalLinha += valor;
        });

        rowData.total = totalLinha;
        return rowData;
    });
}
