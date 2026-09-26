/**
 * Monta o corpo do `PUT /api/postos/{posto}/fechamento` a partir do estado da tela (#103 P11).
 *
 * @remarks
 * Função PURA, sem I/O: recebe o que `handleSave` recebe e devolve o `DiaDeclarado` do contrato
 * (`fechamento.api.ts`). Reproduz os filtros de `useSubmissaoFechamento.ts:141-246` CHAMANDO os
 * canônicos de `@posto/utils`, sem reimplementar conta nenhuma:
 *
 * - leituras: só os bicos com `fechamento` preenchido (o mesmo filtro de `:152`). A leitura-base
 *   (`fechamento: ''`, `useLeituras.ts:294`) NÃO é declarada — e, com o UPSERT do servidor, ela
 *   sobrevive ao Salvar (memória `salvar-o-dia-apaga-leitura-base`). Litros e valor saem de
 *   `litrosVendidos`/`valorDaLeitura` (I12), a mesma conta de `leitura.service.ts:327-329`;
 * - sessões: `frentistaId !== null && !sessaoSemMovimento` (I3, `:177`); os 7 baldes por
 *   `meiosDaSessao`, `conferido` (I2), `diferenca` só com encerrante lançado (I4, `:185`);
 *   `valor_cartao` é o lump legado, gravado como veio (`:191`) — nunca derivado de débito+crédito;
 * - `frentistas_conhecidos`: só quem a tela carregou DO BANCO (`tempId` `existing-<id>`,
 *   `useSessoesFrentistas.ts:200`), MAIS quem ela carregou do banco e o gerente tirou
 *   (`frentistasRemovidos`, 25/09 — é a remoção pela API). Linha semeada não conta: se contasse,
 *   o envio tardio de um frentista semeado voltaria a ser apagado (§7 (c));
 * - recebimentos: `valor > 0` (`:217`);
 * - totais: `total_vendas` e `diferenca` vão `null` quando o dia não está apurado (I8, como
 *   `encerrante.ts:632,646`: sem leitura declarada não há encerrante) ou quando a tela diz que não
 *   pode fechar. Apurado, `total_vendas` e `total_recebido` são quantizados por `emCentavos` e
 *   `diferenca` é a canônica (`fechamento.ts:70`) sobre os dois já quantizados — o par bate
 *   exato no servidor por construção (`TotaisDeclarados`).
 *
 * Tudo sai como string decimal (`toFixed(2)`/`toFixed(3)` sobre valor já quantizado): o parse do
 * formato BR (`parseValue`) acontece AQUI, uma vez, no cliente — nunca no PHP.
 */
import { conferido, diferenca as diferencaCanonica, emCentavos, litrosVendidos, valorDaLeitura } from '@posto/utils';
import type { DiaDeclarado } from '../../../services/api/fechamento.api';
import type { BicoComDetalhes, EntradaPagamento, SessaoFrentista } from '../../../types/fechamento';
import { meiosDaSessao, sessaoSemMovimento } from '../../../utils/fechamentoMeios';
import { parseValue } from '../../../utils/formatters';

/** O que a tela entrega ao Salvar — a parte pura de `SubmissaoParams`. */
export interface DiaNaTela {
    readonly bicos: readonly BicoComDetalhes[];
    readonly leituras: Readonly<Record<number, { inicial: string; fechamento: string }>>;
    readonly sessoesFrentistas: readonly SessaoFrentista[];
    readonly payments: readonly EntradaPagamento[];
    /**
     * Venda do dia pelo ENCERRANTE (`vendaDoDiaPeloEncerrante`, #103 P8, 22/09/2026) — `null`
     * = dia não apurado: menos bicos lidos que bicos ativos. Aqui, `null` manda o par
     * `total_vendas`/`diferenca` nulo pela FONTE, não só pela guarda de `podeFechar` (I8).
     */
    readonly totalVendas: number | null;
    /** Soma do `conferido` das sessões, como a tela a calcula. */
    readonly totalFrentistas: number;
    readonly podeFechar: boolean;
    readonly observacoes: string;
    /**
     * Frentistas cujas sessões do banco o gerente tirou da tela (`useSessoesFrentistas`, modo API).
     * Continuam em `frentistas_conhecidos` — e, fora de `sessoes`, o servidor os apaga (§7 (c)).
     */
    readonly frentistasRemovidos?: readonly number[];
}

/** Sessão que a tela carregou do banco (`useSessoesFrentistas.ts:200`); semeada é `t<n>`. */
const PREFIXO_DO_BANCO = 'existing-';

/** Dinheiro no contrato: quantizado em centavos e serializado com duas casas. */
const dinheiro = (reais: number): string => emCentavos(reais).toFixed(2);

/** Litros no contrato: três casas (`decimal:3` da `Leitura`). */
const litros = (valor: number): string => valor.toFixed(3);

function leiturasDeclaradas(bicos: readonly BicoComDetalhes[], leituras: DiaNaTela['leituras']): DiaDeclarado['leituras'] {
    const declaradas: DiaDeclarado['leituras'] = [];

    for (const bico of bicos) {
        const daTela = leituras[bico.id];
        // O mesmo filtro de `:152` (`leituras[b.id] && leituras[b.id].fechamento`): a leitura-base
        // tem `fechamento: ''` e fica de fora.
        if (daTela === undefined || daTela.fechamento === '') continue;

        const deBico = { inicial: parseValue(daTela.inicial), fechamento: parseValue(daTela.fechamento) };
        const preco = bico.combustivel.preco_venda;

        declaradas.push({
            bico_id: bico.id,
            combustivel_id: bico.combustivel.id,
            leitura_inicial: litros(deBico.inicial),
            leitura_final: litros(deBico.fechamento),
            litros_vendidos: litros(litrosVendidos(deBico)),
            preco_litro: dinheiro(preco),
            valor_total: dinheiro(valorDaLeitura(deBico, preco)),
        });
    }

    return declaradas;
}

function sessoesDeclaradas(sessoes: readonly SessaoFrentista[]): DiaDeclarado['sessoes'] {
    const declaradas: DiaDeclarado['sessoes'] = [];

    for (const sessao of sessoes) {
        // I3: linha semeada sem lançamento é "não trabalhou hoje", não vira registro (`:177`).
        if (sessao.frentistaId === null || sessaoSemMovimento(sessao)) continue;

        const meios = meiosDaSessao(sessao);
        const conf = conferido(meios); // I2: os 7 baldes, cartão aditivo, moedas incluídas
        const encerrante = parseValue(sessao.valor_encerrante);
        // I4: a diferença só faz sentido com encerrante lançado (`:185`); sem ele é 0, não −conferido.
        const dif = encerrante > 0 ? diferencaCanonica(encerrante, conf) : 0;

        declaradas.push({
            frentista_id: sessao.frentistaId,
            valor_cartao: dinheiro(parseValue(sessao.valor_cartao)), // lump legado, como veio (`:191`)
            valor_cartao_debito: dinheiro(meios.cartaoDebito),
            valor_cartao_credito: dinheiro(meios.cartaoCredito),
            valor_dinheiro: dinheiro(meios.dinheiro),
            valor_moedas: dinheiro(meios.moedas),
            valor_pix: dinheiro(meios.pix),
            valor_nota: dinheiro(meios.nota),
            baratao: dinheiro(meios.baratao),
            encerrante: dinheiro(encerrante),
            valor_conferido: dinheiro(conf),
            diferenca_calculada: dinheiro(dif),
            observacoes: sessao.observacoes,
        });
    }

    return declaradas;
}

function frentistasConhecidos(sessoes: readonly SessaoFrentista[], removidos: readonly number[]): DiaDeclarado['frentistas_conhecidos'] {
    const naTela = sessoes.flatMap((sessao) =>
        sessao.tempId.startsWith(PREFIXO_DO_BANCO) && sessao.frentistaId !== null ? [sessao.frentistaId] : [],
    );
    return [...naTela, ...removidos.filter((id) => !naTela.includes(id))];
}

function recebimentosDeclarados(payments: readonly EntradaPagamento[]): DiaDeclarado['recebimentos'] {
    return payments.flatMap((pagamento) => {
        const valor = parseValue(pagamento.valor);
        return valor > 0 ? [{ forma_pagamento_id: pagamento.id, valor: dinheiro(valor) }] : [];
    });
}

function totaisDeclarados(dia: DiaNaTela, leiturasDeclaradasNoDia: number): DiaDeclarado['totais'] {
    const totalRecebido = emCentavos(dia.totalFrentistas);

    // I8: sem encerrante declarado não há apuração — o par vai null, nunca 0 (`encerrante.ts:646`).
    // Desde 22/09/2026 a própria FONTE diz "não apurado" (`dia.totalVendas === null`, quando
    // há menos bicos lidos que ativos); as duas guardas anteriores continuam por cima.
    if (!dia.podeFechar || leiturasDeclaradasNoDia === 0 || dia.totalVendas === null) {
        return { total_vendas: null, total_recebido: totalRecebido.toFixed(2), diferenca: null };
    }

    const totalVendas = emCentavos(dia.totalVendas);

    return {
        total_vendas: totalVendas.toFixed(2),
        total_recebido: totalRecebido.toFixed(2),
        // A canônica sobre os dois já quantizados: é o que o servidor confere exato em centavos.
        diferenca: diferencaCanonica(totalVendas, totalRecebido).toFixed(2),
    };
}

/** O corpo do PUT, a partir do estado da tela. Puro: mesma entrada, mesma saída. */
export function montarDiaDeclarado(dia: DiaNaTela): DiaDeclarado {
    const leituras = leiturasDeclaradas(dia.bicos, dia.leituras);

    return {
        leituras,
        sessoes: sessoesDeclaradas(dia.sessoesFrentistas),
        frentistas_conhecidos: frentistasConhecidos(dia.sessoesFrentistas, dia.frentistasRemovidos ?? []),
        recebimentos: recebimentosDeclarados(dia.payments),
        totais: totaisDeclarados(dia, leituras.length),
        observacoes: dia.observacoes,
    };
}
