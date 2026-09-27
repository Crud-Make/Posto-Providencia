import type { BicoDaApi, BicoDeclarado, BombaDaApi, CombustivelDaApi, PistaDaApi, TanqueDaApi } from '../api/cadastro-de-bicos.api';

/**
 * A pista do posto como a tela a mostra (#153): bombas em ordem de nome e, dentro de cada uma, os
 * bicos em ordem de número — o mesmo arranjo que o frentista vê no pátio. Só apresentação e forma
 * do formulário; quem decide se o cadastro vale é o servidor.
 */

export interface BicoNaPista {
    readonly id: number;
    readonly numero: number;
    readonly ativo: boolean;
    readonly combustivel: CombustivelDaApi | null;
    readonly tanque: TanqueDaApi | null;
}

export interface BombaNaPista {
    readonly bomba: BombaDaApi;
    readonly bicos: readonly BicoNaPista[];
}

const porNome = (a: BombaDaApi, b: BombaDaApi): number => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true });

/** Agrupa os bicos por bomba. Sem `mostrarInativos`, some bico e bomba desativados. */
export function agruparPorBomba(pista: PistaDaApi, mostrarInativos: boolean): BombaNaPista[] {
    const combustivel = new Map(pista.combustiveis.map((c) => [c.id, c] as const));
    const tanque = new Map(pista.tanques.map((t) => [t.id, t] as const));
    return [...pista.bombas]
        .filter((b) => mostrarInativos || b.ativo)
        .sort(porNome)
        .map((b) => ({
            bomba: b,
            bicos: pista.bicos
                .filter((bi) => bi.bomba.id === b.id && (mostrarInativos || bi.ativo))
                .sort((x, y) => x.numero - y.numero)
                .map((bi) => ({
                    id: bi.id,
                    numero: bi.numero,
                    ativo: bi.ativo,
                    combustivel: combustivel.get(bi.combustivel.id) ?? null,
                    tanque: bi.tanque === null ? null : (tanque.get(bi.tanque.id) ?? null),
                })),
        }));
}

/** Os tanques ativos de onde um bico daquele combustível pode puxar. */
export function tanquesDoCombustivel(tanques: readonly TanqueDaApi[], combustivelId: number | null): TanqueDaApi[] {
    return tanques.filter((t) => t.combustivel_id === combustivelId && t.ativo !== false);
}

/** O menor número ≥ 1 que nenhum bico ativo usa — a sugestão do "Novo bico". */
export function proximoNumeroLivre(bicos: readonly BicoDaApi[]): number {
    const usados = new Set(bicos.filter((b) => b.ativo).map((b) => b.numero));
    let numero = 1;
    while (usados.has(numero)) numero += 1;
    return numero;
}

/** O formulário de bico como a tela o guarda: texto no número, seleção vazia como `null`. */
export interface FormularioDeBico {
    readonly numero: string;
    readonly bombaId: number | null;
    readonly combustivelId: number | null;
    readonly tanqueId: number | null;
    readonly ativo: boolean;
}

/** O formulário vira o corpo da API, ou o motivo de ainda não poder enviar. */
export function corpoDoBico(f: FormularioDeBico): { ok: true; corpo: BicoDeclarado } | { ok: false; motivo: string } {
    const numero = Number(f.numero);
    if (!Number.isInteger(numero) || numero < 1 || numero > 999) return { ok: false, motivo: 'Informe o número do bico (1 a 999).' };
    if (f.bombaId === null) return { ok: false, motivo: 'Escolha a bomba.' };
    if (f.combustivelId === null) return { ok: false, motivo: 'Escolha o combustível.' };
    if (f.tanqueId === null) return { ok: false, motivo: 'Escolha o tanque de onde o bico puxa.' };
    return {
        ok: true,
        corpo: { numero, bomba_id: f.bombaId, combustivel_id: f.combustivelId, tanque_id: f.tanqueId, ativo: f.ativo },
    };
}

/** Trocar o combustível limpa o tanque, a não ser que só um tanque sirva — aí já o escolhe. */
export function trocaCombustivel(f: FormularioDeBico, combustivelId: number | null, tanques: readonly TanqueDaApi[]): FormularioDeBico {
    const servem = tanquesDoCombustivel(tanques, combustivelId);
    const unico = servem.length === 1 ? servem[0] : undefined;
    return { ...f, combustivelId, tanqueId: unico === undefined ? null : unico.id };
}
