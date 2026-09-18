import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

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
