/**
 * Golden master da detecção de troca de preço (Issue #61) contra a planilha
 * real: `encerrante_diario` de docs/data/posto_jorro_2026.sqlite.
 *
 * O QUE ESTE GOLDEN PROVA: as transições de preço de venda (dia, de, para)
 * batem com a planilha em janeiro (troca única 06→07/01 nos 4 combustíveis),
 * maio (queda em 16/05) e junho (queda em 20/06).
 *
 * O QUE ELE NÃO PROVA: `litrosNoTanque`/`ganhoPerdaCentavos` — a planilha não
 * tem régua diária nem data por carga; essa parte é aritmética coberta por
 * troca-preco.test.ts.
 *
 * Março fica FORA de propósito: 7–9 preços por bico, não monotônicos, com um
 * 9,98 em 14/03 que parece erro de digitação da planilha — travar golden em
 * cima disso seria consagrar o erro. Decisão do dono pendente (ver Issue #61).
 */
import { test, expect } from 'bun:test';
import { Database } from 'bun:sqlite';
import { trocasDePreco, type LeituraPrecoDia, type TrocaDePreco } from './troca-preco';

const SQLITE = `${import.meta.dir}/../../../docs/data/posto_jorro_2026.sqlite`;
const db = new Database(SQLITE, { readonly: true });

/** Mesmo mapeamento bico→combustível do lucro.golden.spec.ts. */
function combustivelDoBico(bico: string): string {
    if (bico.startsWith('G,A')) return 'gasolina-aditivada';
    if (bico.startsWith('G,C')) return 'gasolina-comum';
    if (bico.startsWith('Etanol')) return 'etanol';
    if (bico.toUpperCase().startsWith('DS')) return 'diesel-s10';
    throw new Error(`bico sem combustível mapeado: ${bico}`);
}

interface LinhaEncerrante {
    readonly dia: number;
    readonly bico: string;
    readonly valor_lt: number | null;
    readonly litros: number | null;
}

function leiturasDoMes(mes: number): LeituraPrecoDia[] {
    const linhas = db
        .query<LinhaEncerrante, [number]>(
            'SELECT dia, bico, valor_lt, litros FROM encerrante_diario WHERE ano = 2026 AND mes = ?',
        )
        .all(mes);
    return linhas.map((l) => ({
        data: `2026-${String(mes).padStart(2, '0')}-${String(l.dia).padStart(2, '0')}`,
        combustivel: combustivelDoBico(l.bico),
        precoLitro: l.valor_lt,
        litrosVendidos: l.litros ?? 0,
    }));
}

const soDe = (trocas: readonly TrocaDePreco[], combustivel: string) =>
    trocas.filter((t) => t.combustivel === combustivel);

// ── Janeiro: a troca única de 06→07/01, nos 4 combustíveis ──────────────────
const jan = trocasDePreco(leiturasDoMes(1));

// Mutável só porque o `toEqual` do bun:test não aceita `readonly` — não é alterado.
const ESPERADO_JAN: TrocaDePreco[] = [
    { data: '2026-01-07', combustivel: 'diesel-s10', precoAntigo: 6.28, precoNovo: 6.38 },
    { data: '2026-01-07', combustivel: 'etanol', precoAntigo: 4.58, precoNovo: 4.98 },
    { data: '2026-01-07', combustivel: 'gasolina-aditivada', precoAntigo: 6.28, precoNovo: 6.48 },
    { data: '2026-01-07', combustivel: 'gasolina-comum', precoAntigo: 6.28, precoNovo: 6.48 },
];

test('janeiro tem exatamente 4 trocas, todas em 07/01', () => {
    expect(jan).toEqual(ESPERADO_JAN);
});

for (const esperada of ESPERADO_JAN) {
    test(`janeiro — ${esperada.combustivel}: ${esperada.precoAntigo} → ${esperada.precoNovo}`, () => {
        expect(soDe(jan, esperada.combustivel)).toEqual([esperada]);
    });
}

test('janeiro — o valor_lt nulo do Bico 06 não inventa troca na gasolina comum', () => {
    expect(soDe(jan, 'gasolina-comum')).toHaveLength(1);
});

// ── Maio: queda de preço em 16/05 ───────────────────────────────────────────
const mai = trocasDePreco(leiturasDoMes(5));

test('maio — gasolina comum cai 7,38 → 7,18 em 16/05', () => {
    expect(soDe(mai, 'gasolina-comum')).toEqual([
        { data: '2026-05-16', combustivel: 'gasolina-comum', precoAntigo: 7.38, precoNovo: 7.18 },
    ]);
});

test('maio — diesel cai 8,38 → 7,18 em 16/05', () => {
    expect(soDe(mai, 'diesel-s10')).toEqual([
        { data: '2026-05-16', combustivel: 'diesel-s10', precoAntigo: 8.38, precoNovo: 7.18 },
    ]);
});

test('maio — etanol não troca de preço', () => {
    expect(soDe(mai, 'etanol')).toEqual([]);
});

// ── Junho: queda em 20/06 ───────────────────────────────────────────────────
const jun = trocasDePreco(leiturasDoMes(6));

test('junho — gasolina comum cai 7,18 → 6,98 em 20/06', () => {
    expect(soDe(jun, 'gasolina-comum')).toEqual([
        { data: '2026-06-20', combustivel: 'gasolina-comum', precoAntigo: 7.18, precoNovo: 6.98 },
    ]);
});

test('junho — etanol cai 5,38 → 4,98 em 20/06', () => {
    expect(soDe(jun, 'etanol')).toEqual([
        { data: '2026-06-20', combustivel: 'etanol', precoAntigo: 5.38, precoNovo: 4.98 },
    ]);
});

test('junho — diesel não troca de preço', () => {
    expect(soDe(jun, 'diesel-s10')).toEqual([]);
});
