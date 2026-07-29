/**
 * Consolidação mensal do encerrante — o bloco `Caixa Dia 01 a 31` da planilha.
 *
 * @remarks
 * Módulo puro, sem I/O: recebe as leituras diárias já normalizadas e devolve o
 * acumulado do mês. Consumido pela tela de fechamento mensal (`apps/web`) e pelo
 * golden master (`encerrante-mensal.golden.spec.ts`), que roda esta mesma função
 * contra os 7 meses reais extraídos da planilha.
 *
 * Vocabulário em `CONTEXT.md`. Decisões de domínio fixadas aqui:
 *
 * - O encerrante é um **odômetro**: só anda pra frente e nunca zera. Os litros do
 *   mês são o **salto** entre dois encerrantes, não uma soma de vendas.
 * - O mês fecha no **Último Dia Fechado** — o último dia que tem encerrante de
 *   fechamento lançado. **Dia Parcial** (tem inicial, não tem fechamento) fica de
 *   fora. É esse o bug que faz a planilha mostrar −1.861.248 L em julho/2026:
 *   ela usa o dia 25, que está pela metade, em vez do dia 24.
 * - **Litros em Lacuna** = salto − soma dos dias lançados. É o combustível que o
 *   odômetro registrou e que não tem fechamento nenhum correspondente. Zero num
 *   mês saudável; 9.134 L em fevereiro/2026 (dias 09–15 sem lançar).
 * - O **bruto** é a soma do faturamento de cada dia, com o preço daquele dia.
 *   A planilha faz `litros do mês × um preço só` e por isso diverge em todo mês
 *   que teve mudança de preço — divergência conhecida, documentada no golden.
 *
 * @module @posto/utils/encerrante-mensal
 */

/** Leitura de um bico num dia, como sai do banco ou da planilha. */
export interface LeituraDiariaBico {
    dia: number;
    bico: string;
    /** Encerrante no início do dia. `null` quando não foi lançado. */
    inicial: number | null;
    /** Encerrante no fim do dia. `null` quando o dia não foi encerrado. */
    fechamento: number | null;
    /** Faturamento bruto do dia nesse bico, em reais. `null` quando não há preço. */
    valorDia: number | null;
}

/** Acumulado do mês de um bico. */
export interface EncerranteMensalBico {
    bico: string;
    /** Primeiro dia do mês com encerrante inicial lançado. */
    primeiroDia: number | null;
    /** Último Dia Fechado — onde o acumulado do mês termina. */
    ultimoDiaFechado: number | null;
    /** Encerrante no início de `primeiroDia`. */
    inicial: number | null;
    /** Encerrante no fim de `ultimoDiaFechado`. */
    fechamento: number | null;
    /** Salto do Encerrante: `fechamento − inicial`. */
    litros: number;
    /** Soma dos litros dos dias efetivamente lançados. */
    litrosLancados: number;
    /** `litros − litrosLancados`: combustível que saiu sem fechamento. */
    litrosEmLacuna: number;
    /** Soma do faturamento de cada dia lançado, em reais. */
    bruto: number;
    /** `bruto / litrosLancados` — preço médio ponderado do mês. */
    precoMedio: number | null;
    /** Quantos dias entraram na conta. */
    diasLancados: number;
    /** Dias sem fechamento dentro do intervalo do mês. */
    diasEmLacuna: number[];
}

/** Acumulado do mês somando todos os bicos. */
export interface EncerranteMensal {
    bicos: EncerranteMensalBico[];
    /**
     * Último dia em que **todos** os bicos estavam fechados. É até aqui que o mês
     * está fechado de verdade — por isso é o menor `ultimoDiaFechado` dos bicos.
     */
    ultimoDiaFechado: number | null;
    litros: number;
    litrosLancados: number;
    litrosEmLacuna: number;
    bruto: number;
    precoMedio: number | null;
    /** `true` quando algum bico tem Litros em Lacuna. */
    temLacuna: boolean;
}

/**
 * Litro vira mililitro inteiro antes de qualquer conta.
 *
 * @remarks
 * Encerrante tem 3 casas decimais, então mililitro é sempre inteiro exato. Operar
 * em `number` fracionário faz `1861248.783 − 1845214.492` devolver
 * `16034.290999999968` em vez de `16034.291` — ruído que contamina toda soma
 * daí pra frente. Escala na entrada, desescala só no retorno.
 */
const emMl = (litros: number): number => Math.round(litros * 1000);
const paraLitros = (ml: number): number => ml / 1000;

/** Dinheiro operado em centavos inteiros, desescalado só no retorno. */
const emCentavos = (reais: number): number => Math.round(reais * 100);
const paraReais = (centavos: number): number => centavos / 100;

/** Um dia só entra na conta quando tem os dois encerrantes. */
const diaCompleto = (l: LeituraDiariaBico): boolean =>
    l.inicial !== null &&
    l.fechamento !== null &&
    Number.isFinite(l.inicial) &&
    Number.isFinite(l.fechamento);

const bicoVazio = (bico: string): EncerranteMensalBico => ({
    bico,
    primeiroDia: null,
    ultimoDiaFechado: null,
    inicial: null,
    fechamento: null,
    litros: 0,
    litrosLancados: 0,
    litrosEmLacuna: 0,
    bruto: 0,
    precoMedio: null,
    diasLancados: 0,
    diasEmLacuna: [],
});

/**
 * Consolida o mês de **um** bico.
 *
 * @param leituras Leituras daquele bico no mês, em qualquer ordem.
 * @returns Acumulado do dia 01 até o Último Dia Fechado.
 */
export function encerranteMensalDoBico(
    leituras: readonly LeituraDiariaBico[]
): EncerranteMensalBico {
    if (leituras.length === 0) return bicoVazio('');

    const bico = leituras[0].bico;
    const dias = [...leituras].sort((a, b) => a.dia - b.dia);

    // Onde o mês começa: primeiro dia com encerrante inicial lançado.
    const abertura = dias.find((l) => l.inicial !== null && Number.isFinite(l.inicial));
    // Onde o mês termina: último dia com encerrante de fechamento lançado.
    // Dia Parcial (inicial sem fechamento) não fecha o mês — é o bug da planilha.
    const fecho = [...dias]
        .reverse()
        .find((l) => l.fechamento !== null && Number.isFinite(l.fechamento));

    if (!abertura || !fecho || fecho.dia < abertura.dia) return bicoVazio(bico);

    const inicialMl = emMl(abertura.inicial as number);
    const fechamentoMl = emMl(fecho.fechamento as number);
    const litrosMl = fechamentoMl - inicialMl;

    const noIntervalo = dias.filter((l) => l.dia >= abertura.dia && l.dia <= fecho.dia);
    const lancados = noIntervalo.filter(diaCompleto);

    const litrosLancadosMl = lancados.reduce(
        (acc, l) => acc + (emMl(l.fechamento as number) - emMl(l.inicial as number)),
        0
    );
    const brutoCentavos = lancados.reduce(
        (acc, l) => acc + (l.valorDia !== null && Number.isFinite(l.valorDia) ? emCentavos(l.valorDia) : 0),
        0
    );

    // Lacuna cobre tanto dia presente-mas-furado quanto dia que nem linha tem.
    const lancadosPorDia = new Set(lancados.map((l) => l.dia));
    const diasEmLacuna: number[] = [];
    for (let d = abertura.dia; d <= fecho.dia; d++) {
        if (!lancadosPorDia.has(d)) diasEmLacuna.push(d);
    }

    const litros = paraLitros(litrosMl);
    const litrosLancados = paraLitros(litrosLancadosMl);
    const bruto = paraReais(brutoCentavos);

    return {
        bico,
        primeiroDia: abertura.dia,
        ultimoDiaFechado: fecho.dia,
        inicial: abertura.inicial as number,
        fechamento: fecho.fechamento as number,
        litros,
        litrosLancados,
        litrosEmLacuna: paraLitros(litrosMl - litrosLancadosMl),
        bruto,
        precoMedio: litrosLancadosMl > 0 ? bruto / litrosLancados : null,
        diasLancados: lancados.length,
        diasEmLacuna,
    };
}

/**
 * Consolida o mês inteiro, todos os bicos.
 *
 * @param leituras Leituras de todos os bicos no mês, em qualquer ordem.
 * @returns Acumulado por bico mais o total do mês.
 */
export function encerranteMensal(
    leituras: readonly LeituraDiariaBico[]
): EncerranteMensal {
    const porBico = new Map<string, LeituraDiariaBico[]>();
    for (const l of leituras) {
        const atual = porBico.get(l.bico);
        if (atual) atual.push(l);
        else porBico.set(l.bico, [l]);
    }

    const bicos = [...porBico.values()]
        .map(encerranteMensalDoBico)
        .sort((a, b) => a.bico.localeCompare(b.bico, 'pt-BR'));

    const litrosMl = bicos.reduce((acc, b) => acc + emMl(b.litros), 0);
    const litrosLancadosMl = bicos.reduce((acc, b) => acc + emMl(b.litrosLancados), 0);
    const brutoCentavos = bicos.reduce((acc, b) => acc + emCentavos(b.bruto), 0);

    const fechados = bicos
        .map((b) => b.ultimoDiaFechado)
        .filter((d): d is number => d !== null);

    const litros = paraLitros(litrosMl);
    const litrosLancados = paraLitros(litrosLancadosMl);
    const bruto = paraReais(brutoCentavos);

    return {
        bicos,
        // O mês só está fechado até onde o bico mais atrasado está fechado.
        ultimoDiaFechado: fechados.length === bicos.length && fechados.length > 0
            ? Math.min(...fechados)
            : null,
        litros,
        litrosLancados,
        litrosEmLacuna: paraLitros(litrosMl - litrosLancadosMl),
        bruto,
        precoMedio: litrosLancadosMl > 0 ? bruto / litrosLancados : null,
        temLacuna: bicos.some((b) => b.litrosEmLacuna !== 0),
    };
}
