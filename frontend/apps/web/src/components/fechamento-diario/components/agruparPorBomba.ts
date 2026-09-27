import type { BicoComDetalhes } from '../../../types/fechamento';

/** Os bicos de uma bomba, como o gerente os encontra andando pela pista. */
export interface BicosDaBomba {
    readonly bombaId: number;
    readonly nome: string;
    readonly bicos: readonly BicoComDetalhes[];
}

/**
 * Agrupa os bicos da aba Leituras de Bomba por bomba (#155): bombas pelo nome em ordem natural
 * (BOMBA 02 antes de BOMBA 10), bicos pelo número dentro de cada uma. Só apresentação — os
 * bicos são os mesmos objetos, nenhum valor é calculado aqui.
 */
export function agruparPorBomba(bicos: readonly BicoComDetalhes[]): BicosDaBomba[] {
    const porBomba = new Map<number, { nome: string; bicos: BicoComDetalhes[] }>();
    for (const bico of bicos) {
        const grupo = porBomba.get(bico.bomba.id);
        if (grupo === undefined) porBomba.set(bico.bomba.id, { nome: bico.bomba.nome, bicos: [bico] });
        else grupo.bicos.push(bico);
    }
    return [...porBomba.entries()]
        .map(([bombaId, g]) => ({ bombaId, nome: g.nome, bicos: [...g.bicos].sort((a, b) => a.numero - b.numero) }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
}
