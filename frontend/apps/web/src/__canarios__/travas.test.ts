import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { comparar, parseTsc } from '../../../../scripts/catraca.mjs';

/**
 * Canários das travas de lint (PROC-5 de `docs/arquitetura/regras.md`).
 *
 * Cada teste aqui roda o ESLint **com a config real do monorepo** contra um fixture que
 * viola a regra de propósito, e exige que a regra acuse. Se alguém desligar a regra,
 * remover o plugin ou quebrar o `projectService`, o teste falha — em vez de o CI
 * continuar verde sobre um gate que parou de olhar.
 *
 * É o mesmo padrão de `.claude/hooks/testa-hooks.py`, que já faz isto com os hooks.
 */

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

/** Roda o eslint num fixture e devolve os resultados em JSON. `--no-ignore` porque o
 *  fixture está em `ignores` para ficar fora do lint normal. */
function lintarFixture(relativo: string) {
  const alvo = path.join(RAIZ, relativo);
  try {
    const saida = execFileSync(
      'bunx',
      ['eslint', '--no-ignore', '--format', 'json', alvo],
      { cwd: RAIZ, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return JSON.parse(saida) as Array<{ messages: Array<{ ruleId: string | null; line: number }> }>;
  } catch (erro) {
    // O eslint sai com código 1 quando encontra erro — que é exatamente o caso esperado.
    const comSaida = erro as { stdout?: string };
    if (typeof comSaida.stdout === 'string' && comSaida.stdout.trim() !== '') {
      return JSON.parse(comSaida.stdout) as Array<{
        messages: Array<{ ruleId: string | null; line: number }>;
      }>;
    }
    throw erro;
  }
}

describe('canário: neverthrow/must-use-result (RES-2)', () => {
  const resultado = lintarFixture('apps/web/src/__canarios__/neverthrow-must-use-result.fixture.ts');
  const acusacoes = resultado[0]?.messages.filter((m) => m.ruleId === 'neverthrow/must-use-result') ?? [];

  it('acusa o Result que foi descartado', () => {
    expect(acusacoes.length).toBeGreaterThan(0);
  });

  it('não acusa o Result consumido com match', () => {
    // `trataOResultado` usa `.match()`. Se a regra acusasse as duas, ela estaria
    // reprovando tudo — verde por acidente do outro lado.
    expect(acusacoes.length).toBe(1);
  });
}, 120_000);

describe('canário: FSD, promise solta e booleano estrito (18/09)', () => {
  // O fixture mora DENTRO de uma camada (widgets/) porque a regra do boundaries só vale
  // para arquivo classificado como elemento. Em apps/web/src/__canarios__ ele não acusaria.
  const resultado = lintarFixture('apps/web/src/widgets/__canarios__/fsd.fixture.ts');
  const mensagens = resultado[0]?.messages ?? [];
  const linhasDe = (regra: string) => mensagens.filter((m) => m.ruleId === regra).map((m) => m.line);

  it('camada de baixo importando a de cima (widget → page)', () => {
    expect(linhasDe('boundaries/dependencies')).toContain(3);
  });

  it('slice vizinho da mesma camada (widget → widget)', () => {
    expect(linhasDe('boundaries/dependencies')).toContain(4);
  });

  it('import de arquivo interno em vez da Public API', () => {
    expect(linhasDe('no-restricted-imports')).toEqual([4]);
  });

  it('legado fora das camadas continua livre (strangler)', () => {
    expect(mensagens.filter((m) => m.line === 5)).toEqual([]);
  });

  it('promise solta', () => {
    expect(linhasDe('@typescript-eslint/no-floating-promises')).toEqual([11]);
  });

  it('número como condição — o R$ 0,00 falsy', () => {
    expect(linhasDe('@typescript-eslint/strict-boolean-expressions')).toEqual([14]);
  });
}, 120_000);

describe('canário: flags estritas do tsconfig', () => {
  it('índice de array é T | undefined (noUncheckedIndexedAccess)', () => {
    // Projeto temporário que HERDA o tsconfig real: se alguém desligar a flag lá, o
    // erro some daqui e o teste falha.
    const dir = mkdtempSync(path.join(RAIZ, '.canario-tsc-'));
    try {
      writeFileSync(path.join(dir, 'a.ts'), 'export const f = (xs: number[]): number => xs[0] + 1;\n');
      writeFileSync(
        path.join(dir, 'tsconfig.json'),
        JSON.stringify({ extends: '../tsconfig.json', include: ['a.ts'], compilerOptions: { paths: {} } }),
      );
      let saida = '';
      try {
        execFileSync(path.join(RAIZ, 'node_modules/.bin/tsc'), ['--noEmit', '-p', dir], { encoding: 'utf-8' });
      } catch (erro) {
        saida = String((erro as { stdout?: string }).stdout ?? '');
      }
      expect(saida).toMatch(/TS2532|TS18048/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}, 120_000);

describe('catraca: só erro novo reprova', () => {
  const v = (arquivo: string, regra: string, linha = 1) => ({ arquivo, regra, linha, mensagem: '' });

  it('dívida congelada passa', () => {
    const r = comparar([v('a.ts', 'X'), v('a.ts', 'X', 2)], { 'a.ts|X': 2 });
    expect(r.novas).toEqual([]);
  });

  it('um erro a mais da mesma regra no mesmo arquivo reprova', () => {
    const r = comparar([v('a.ts', 'X'), v('a.ts', 'X', 2), v('a.ts', 'X', 3)], { 'a.ts|X': 2 });
    expect(r.novas).toEqual([{ chave: 'a.ts|X', antes: 2, agora: 3 }]);
  });

  it('regra nova num arquivo com dívida reprova', () => {
    expect(comparar([v('a.ts', 'Y')], { 'a.ts|X': 5 }).novas).toHaveLength(1);
  });

  it('erro de config do tsc (sem arquivo) não some na leitura', () => {
    expect(parseTsc("error TS5023: Unknown compiler option 'x'.")).toHaveLength(1);
  });

  it('lint parcial não acusa baixa de arquivo fora do escopo', () => {
    const r = comparar([], { 'a.ts|X': 1, 'b.ts|X': 1 }, (a) => a === 'a.ts');
    expect(r.baixaram.map((b) => b.chave)).toEqual(['a.ts|X']);
  });
});
