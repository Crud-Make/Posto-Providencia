import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TabType } from '@frentista/lib/tipos';

/**
 * Canários das travas do pwa-frentista (PROC-5 de `docs/arquitetura/regras.md`).
 *
 * Mesmo padrão de apps/web/src/__canarios__/travas.test.ts: cada teste roda o ESLint **com a
 * config real do monorepo** contra um fixture que viola a regra de propósito, e exige que a
 * regra acuse a LINHA certa. Se alguém desligar a regra, tirar o app de `boundaries/elements`
 * ou apagar o alias, o teste falha — em vez de o CI seguir verde sobre um gate que parou de olhar.
 */

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

type Mensagem = { ruleId: string | null; line: number; message: string };

/** Roda o eslint num fixture e devolve as mensagens. `--no-ignore` porque o fixture está em
 *  `ignores` para ficar fora do lint normal. O eslint sai com código 1 quando acha erro — que é
 *  exatamente o caso esperado. */
function lintarFixture(relativo: string): Mensagem[] {
  const alvo = path.join(RAIZ, relativo);
  let saida = '';
  try {
    saida = execFileSync('bunx', ['eslint', '--no-ignore', '--format', 'json', alvo], {
      cwd: RAIZ,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (erro) {
    saida = String((erro as { stdout?: string }).stdout ?? '');
  }
  const resultado = JSON.parse(saida) as Array<{ messages: Mensagem[] }>;
  return resultado[0]?.messages ?? [];
}

const linhasDe = (mensagens: Mensagem[], regra: string): number[] =>
  mensagens.filter((m) => m.ruleId === regra).map((m) => m.line);

/** `no-restricted-imports` tem vários padrões sob o mesmo ruleId; o texto da mensagem diz qual. */
const linhasDoPadrao = (mensagens: Mensagem[], texto: string): number[] =>
  mensagens.filter((m) => m.ruleId === 'no-restricted-imports' && m.message.includes(texto)).map((m) => m.line);

describe('canário: alias @frentista (passo 1, 19/09)', () => {
  it('resolve para apps/pwa-frentista/src no vitest e no tsc', () => {
    // `@/` é o apps/web no monorepo; este import só resolve se o alias do app existir no
    // tsconfig raiz (tsc) e no vitest.config.ts (aqui).
    const aba: TabType = 'registro';
    expect(aba).toBe('registro');
  });
});

describe('canário: FSD-1/2/3/5/6 e TS-8 no pwa-frentista (19/09)', () => {
  // O fixture mora DENTRO de uma camada (widgets/) porque o boundaries só classifica arquivo
  // que casa com um elemento; em src/__canarios__ ele não acusaria nada.
  const mensagens = lintarFixture('apps/pwa-frentista/src/widgets/__canarios__/fsd.fixture.ts');
  const boundaries = linhasDe(mensagens, 'boundaries/dependencies');

  it('FSD-1: camada de baixo importando a de cima (widget → page)', () => {
    expect(boundaries).toContain(3);
  });

  it('FSD-2: slice vizinho da mesma camada, mesmo pela Public API', () => {
    expect(boundaries).toContain(4);
  });

  it('FSD-3: arquivo interno do vizinho via @frentista/', () => {
    expect(linhasDoPadrao(mensagens, 'Public API')).toEqual([5]);
  });

  it('FSD-5: `@/` é o apps/web, não este app', () => {
    expect(linhasDoPadrao(mensagens, 'O alias deste app é')).toEqual([6]);
  });

  it('FSD-5: alias @shared/ (e @pages/…) é do apps/web', () => {
    expect(linhasDoPadrao(mensagens, 'aliases do apps/web')).toEqual([7]);
  });

  it('FSD-5: caminho de outro app', () => {
    expect(linhasDoPadrao(mensagens, 'outro app')).toEqual([8]);
  });

  it('FSD-6: import relativo subindo dois níveis ou mais', () => {
    expect(linhasDoPadrao(mensagens, 'dois níveis')).toEqual([8, 9]);
  });

  it('mesmo slice continua livre (o boundaries só olha entre elementos)', () => {
    expect(mensagens.filter((m) => m.line === 10)).toEqual([]);
  });

  it('TS-8: enum', () => {
    expect(linhasDe(mensagens, 'no-restricted-syntax')).toEqual([13]);
  });
}, 120_000);

describe('canário: FSD-3 pela raiz do src (`./pages/x/y`, de onde App.tsx importa)', () => {
  const mensagens = lintarFixture('apps/pwa-frentista/src/raiz.fixture.ts');

  it('acusa o arquivo interno do slice importado com ./', () => {
    expect(linhasDoPadrao(mensagens, 'Public API')).toEqual([4]);
  });
}, 120_000);

describe('canário: RES-1/RES-3 — throw e try/catch fora da borda (19/09)', () => {
  // O fixture mora em features/ porque a regra só vale nas camadas de negócio
  // (pages, widgets, features, entities, shared/lib); shared/api é a borda e fica fora.
  const mensagens = lintarFixture('apps/pwa-frentista/src/features/__canarios__/res.fixture.ts');
  const sintaxe = mensagens.filter((m) => m.ruleId === 'no-restricted-syntax');

  it('RES-1: throw em regra de negócio', () => {
    expect(sintaxe.filter((m) => m.message.includes('RES-1')).map((m) => m.line)).toEqual([5]);
  });

  it('RES-3: try/catch em regra de negócio', () => {
    expect(sintaxe.filter((m) => m.message.includes('RES-3')).map((m) => m.line)).toEqual([10]);
  });
}, 120_000);

describe('canário: RES-1/RES-3 também em shared/ui e em .tsx (19/09)', () => {
  // shared/ui é camada de apresentação, não borda: throw e try/catch ficam proibidos ali também.
  const mensagens = lintarFixture('apps/pwa-frentista/src/shared/ui/__canarios__/res.fixture.tsx');
  const sintaxe = mensagens.filter((m) => m.ruleId === 'no-restricted-syntax');

  it('RES-1: throw em shared/ui', () => {
    expect(sintaxe.filter((m) => m.message.includes('RES-1')).map((m) => m.line)).toEqual([5]);
  });

  it('RES-3: try/catch em shared/ui', () => {
    expect(sintaxe.filter((m) => m.message.includes('RES-3')).map((m) => m.line)).toEqual([10]);
  });
}, 120_000);
