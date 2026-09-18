/**
 * Canário da regra `neverthrow/must-use-result` (RES-2 de `docs/arquitetura/regras.md`).
 *
 * Este arquivo VIOLA a regra de propósito. Ele está fora do lint normal (`ignores` no
 * `eslint.config.mjs`) e é lintado só pelo teste ao lado, com `--no-ignore`.
 *
 * Existe porque gate verde e gate morto são indistinguíveis: em 17/09/2026 descobriu-se
 * que o gate de complexidade do frontend passava verde no CI havia semanas porque o
 * `.oxlintrc.json` nunca tinha sido commitado — o CI clonava um repo sem o arquivo. Um
 * gate que ninguém nunca viu reprovando não é um gate.
 *
 * NÃO "conserte" este arquivo. Se o lint reclamar dele no run normal, o que quebrou foi
 * o `ignores`, não o código.
 */
import { ok, err, Result } from 'neverthrow';

export const dividir = (a: number, b: number): Result<number, string> =>
  b === 0 ? err('divisão por zero') : ok(a / b);

/** VIOLA: o `Result` é descartado, então o caminho de erro desaparece em silêncio. */
export function ignoraOResultado(): void {
  dividir(10, 0);
}

/** CORRETO: consome com `match`. A regra não pode acusar esta função. */
export function trataOResultado(): string {
  return dividir(10, 0).match(
    (valor) => `ok ${valor}`,
    (erro) => `falhou: ${erro}`,
  );
}
