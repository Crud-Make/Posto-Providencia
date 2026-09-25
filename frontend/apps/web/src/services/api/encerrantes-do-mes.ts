import {
    encerranteMensal,
    type EncerranteMensal,
    type EncerranteMensalBico,
    type LeituraDiariaBico,
} from '@posto/utils';

/**
 * Consolida as leituras cruas do mês no bloco `Caixa Dia 01 a 31` da planilha — a parte PURA de
 * `fechamentoMensalService.getEncerrantesMensal`, extraída sem mudar uma linha da conta (25/09/2026)
 * para servir às duas fontes: Supabase (leituras com `bico` aninhado pelo join) e API Laravel
 * (leituras + catálogo de bicos, `fechamentoMensal.api.ts`).
 *
 * @remarks
 * A fórmula é `encerranteMensal` (`@posto/utils`), coberta pelo golden dos 7 meses reais de 2026.
 * Aqui só se agrupa por (dia, bico) e se escolhem os nomes pra exibir.
 */

/** Linha da tabela de encerrantes da tela: o acumulado do bico + os nomes pra exibir. */
export interface EncerranteMensalLinha extends EncerranteMensalBico {
    bicoNome: string;
    combustivelNome: string;
    /** `Combustivel.codigo` (GC/GA/ET/S10) — chave da cor da planilha. */
    combustivelCodigo: string | null;
}

/** Consolidado do mês pronto pra tela. */
export interface EncerranteMensalConsolidado extends Omit<EncerranteMensal, 'bicos'> {
    bicos: EncerranteMensalLinha[];
}

/** O que a consolidação lê de cada leitura — as duas fontes entregam isto. */
export interface LeituraDoMes {
    readonly id: number;
    readonly data: string;
    readonly turno_id: number | null;
    readonly bico_id: number;
    readonly leitura_inicial: number;
    readonly leitura_final: number;
    readonly valor_total: number | null;
    readonly bico?: {
        readonly numero?: number | null;
        readonly combustivel?: { readonly nome?: string | null; readonly codigo?: string | null } | null;
    } | null;
}

export const CONSOLIDADO_VAZIO: EncerranteMensalConsolidado = {
    bicos: [],
    ultimoDiaFechado: null,
    litros: 0,
    litrosLancados: 0,
    litrosEmLacuna: 0,
    bruto: 0,
    precoMedio: null,
    temLacuna: false,
};

/** Ordem da consolidação: dia, depois turno (`null` = 0), depois `id`. */
function porDiaTurnoEId(a: LeituraDoMes, b: LeituraDoMes): number {
    const porDia = a.data.localeCompare(b.data);
    if (porDia !== 0) return porDia;
    const porTurno = (a.turno_id ?? 0) - (b.turno_id ?? 0);
    return porTurno !== 0 ? porTurno : a.id - b.id;
}

export function consolidarEncerrantesDoMes(leituras: readonly LeituraDoMes[]): EncerranteMensalConsolidado {
    const nomes = new Map<string, { bicoNome: string; combustivelNome: string; combustivelCodigo: string | null }>();

    // Um bico pode ter mais de uma leitura no mesmo dia (um turno cada). O dia
    // abre no encerrante inicial do primeiro turno e fecha no final do último —
    // por ordem de turno, não por min/max, pra não mascarar leitura errada.
    const porDiaBico = new Map<string, LeituraDiariaBico>();

    const ordenadas = [...leituras].sort(porDiaTurnoEId);

    for (const l of ordenadas) {
        const dia = Number(l.data.slice(8, 10));
        // Chave = número do bico com zero à esquerda, pra ordenar 02 antes de 10.
        const bico = String(l.bico?.numero ?? l.bico_id).padStart(2, '0');
        const chave = `${dia}|${bico}`;

        if (!nomes.has(bico)) {
            nomes.set(bico, {
                bicoNome: `Bico ${bico}`,
                combustivelNome: l.bico?.combustivel?.nome ?? '—',
                combustivelCodigo: l.bico?.combustivel?.codigo ?? null,
            });
        }

        const atual = porDiaBico.get(chave);
        if (atual === undefined) {
            porDiaBico.set(chave, {
                dia,
                bico,
                inicial: l.leitura_inicial,
                fechamento: l.leitura_final,
                valorDia: l.valor_total,
            });
            continue;
        }

        atual.fechamento = l.leitura_final;
        atual.valorDia = (atual.valorDia ?? 0) + (l.valor_total ?? 0);
    }

    const consolidado = encerranteMensal([...porDiaBico.values()]);

    return {
        ...consolidado,
        bicos: consolidado.bicos.map((b) => ({
            ...b,
            bicoNome: nomes.get(b.bico)?.bicoNome ?? b.bico,
            combustivelNome: nomes.get(b.bico)?.combustivelNome ?? '—',
            combustivelCodigo: nomes.get(b.bico)?.combustivelCodigo ?? null,
        })),
    };
}
