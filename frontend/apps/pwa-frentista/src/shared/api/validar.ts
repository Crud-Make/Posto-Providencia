import { err, ok, type Result } from 'neverthrow';
import type { ZodError, ZodType } from 'zod';
import type { ErroDeApi } from './erros';

/** `caminho: mensagem` de cada problema, para o texto dizer ONDE o formato quebrou. */
const descrever = (erro: ZodError): string =>
  erro.issues.map((i) => `${i.path.map(String).join('.')}: ${i.message}`).join('; ');

/**
 * Valida o `data` que `executar` devolveu contra o schema Zod da entity.
 *
 * @param schema O formato que a consulta promete (mesmas colunas do `.select`, sem coerção).
 * @param contexto Nome curto da consulta, para a mensagem dizer ONDE o formato quebrou.
 * @returns Função para `.andThen(...)`: `Ok(T)` se bate, `Err({ tipo: 'dado_invalido' })` se não.
 *
 * @remarks Substitui os `as unknown as` que diziam ao TypeScript um formato que ninguém
 *          conferia (P8 da refatoração FSD do pwa, 22/09/2026). Serve às LEITURAS: leitura
 *          fora do formato vira erro visível (decisão do dono, 22/09). Para a resposta de uma
 *          ESCRITA já gravada, use `conferirDepoisDeGravar`.
 */
export function validar<T>(schema: ZodType<T>, contexto: string): (dado: unknown) => Result<T, ErroDeApi> {
  return (dado: unknown): Result<T, ErroDeApi> => {
    const resultado = schema.safeParse(dado);
    if (resultado.success) return ok(resultado.data);
    return err({ tipo: 'dado_invalido', mensagem: `Resposta inesperada do banco em ${contexto} (${descrever(resultado.error)})` });
  };
}

/**
 * Confere a linha que um insert/update JÁ GRAVADO devolveu, sem nunca transformar a gravação
 * em falha.
 *
 * @param schema O formato que a linha devolvida promete.
 * @param contexto Nome curto da escrita, para o aviso no console dizer ONDE.
 * @returns Função para `.map(...)`: o dado validado, ou `null` se veio fora do formato.
 *
 * @remarks Existe por causa do envio em dobro (revisão do lote 1, 22/09/2026): quando a
 *          validação reprovava DEPOIS do insert, a gravação já estava no banco mas o app
 *          mostrava erro, e o frentista mandava de novo. Aqui a linha fora do formato só vira
 *          `console.warn` com o motivo; quem chama trata o `null` (ex.: sem `id`, sem aviso ao dono).
 */
export function conferirDepoisDeGravar<T>(schema: ZodType<T>, contexto: string): (dado: unknown) => T | null {
  return (dado: unknown): T | null => {
    const resultado = schema.safeParse(dado);
    if (resultado.success) return resultado.data;
    console.warn(`[gravado] resposta fora do formato em ${contexto}; a gravação vale (${descrever(resultado.error)})`);
    return null;
  };
}
