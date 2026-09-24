import { describe, expect, it } from 'vitest';
import { TETO_VOLUME_FISICO, medicaoDoDiaSchema, medicaoParaGravarSchema } from './schema';

/**
 * A régua do tanque alimenta o estoque derivado e o impacto de troca de preço do painel:
 * um litro que não devia entrar não dá erro em lugar nenhum — some no total. Por isso o
 * schema de escrita espelha o `CHECK` do banco, e estes testes são a prova de que ele
 * espelha de verdade (schema que nunca reprovou não prova nada).
 */
describe('medicaoParaGravarSchema', () => {
  const medicao = (campos: Record<string, unknown>) =>
    medicaoParaGravarSchema.safeParse({
      tanque_id: 1,
      data: '2026-09-24',
      volume_fisico: 1500,
      ...campos,
    });

  it('aceita a medição que a tela manda hoje', () => {
    const resultado = medicao({});

    expect(resultado.success).toBe(true);
  });

  it('aceita régua zerada — tanque vazio é medição real, não ausência de dado', () => {
    expect(medicao({ volume_fisico: 0 }).success).toBe(true);
  });

  it('recusa litro negativo, que o CHECK do banco recusaria', () => {
    const resultado = medicao({ volume_fisico: -1 });

    // O ternário estreita a união do `safeParse` — `resultado.error` só existe no ramo de
    // falha, e o `?.` sozinho não estreita (o `tsc` reprovaria).
    expect(resultado.success ? null : resultado.error.issues[0]?.path).toEqual(['volume_fisico']);
    expect(resultado.success).toBe(false);
  });

  it('aceita exatamente o teto de numeric(10,2)', () => {
    expect(medicao({ volume_fisico: TETO_VOLUME_FISICO }).success).toBe(true);
  });

  it('recusa acima do teto de numeric(10,2) — o banco truncaria ou recusaria depois', () => {
    expect(medicao({ volume_fisico: TETO_VOLUME_FISICO + 1 }).success).toBe(false);
  });

  it('recusa data que não é AAAA-MM-DD', () => {
    expect(medicao({ data: '24/09/2026' }).success).toBe(false);
    expect(medicao({ data: '2026-9-24' }).success).toBe(false);
  });

  it('recusa tanque que não é id inteiro positivo', () => {
    expect(medicao({ tanque_id: 0 }).success).toBe(false);
    expect(medicao({ tanque_id: -1 }).success).toBe(false);
    expect(medicao({ tanque_id: 1.5 }).success).toBe(false);
  });

  it('grava exatamente as três colunas do upsert, e nenhuma a mais', () => {
    // O payload foi inline antes desta mudança; se o schema inventar coluna, o upsert
    // passa a mandar campo que o PostgREST não conhece — e o erro só aparece em produção.
    const resultado = medicao({});

    // `success &&` estreita a união: sem isto, `resultado.data` não compila.
    expect(resultado.success && Object.keys(resultado.data).sort()).toEqual(['data', 'tanque_id', 'volume_fisico']);
  });
});

describe('medicaoDoDiaSchema', () => {
  it('aceita a linha legada nula — a leitura não aperta nulidade', () => {
    expect(medicaoDoDiaSchema.safeParse({ tanque_id: null, volume_fisico: null }).success).toBe(true);
  });

  it('recusa volume negativo na leitura também', () => {
    expect(medicaoDoDiaSchema.safeParse({ tanque_id: 1, volume_fisico: -0.5 }).success).toBe(false);
  });

  it('aceita volume em texto vindo da coluna numeric? não — leitura de régua é número', () => {
    // Diferente de `medicaoRelidaSchema`, que aceita `number | string` de propósito: aqui
    // o `Number()` do chamador não existe, então texto passaria a virar NaN no estoque.
    expect(medicaoDoDiaSchema.safeParse({ tanque_id: 1, volume_fisico: '1500' }).success).toBe(false);
  });
});
