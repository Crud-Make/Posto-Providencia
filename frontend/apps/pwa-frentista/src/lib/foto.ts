/**
 * Ponte legada da foto do frentista — **temporária, com data para morrer**.
 *
 * @remarks A implementação mudou de casa em 24/09/2026: mora em
 *          `@frentista/entities/frentista/lib/foto.ts` e devolve `ResultAsync` (RES-1).
 *          Este arquivo existe por um motivo só: o `App.tsx` ainda importa `./lib/foto` e
 *          trata a falha por `catch` — e o `App.tsx` é arquivo de fórmula, coberto pela
 *          trava `so-fable-na-formula`, que só deixa Opus 5.5 ou Fable escrever nele.
 *          Enquanto a fatia não for fechada por um desses, a ponte mantém o contrato antigo
 *          **idêntico**: devolve `Promise<string>` e lança `Error` com a MESMA frase de antes.
 *
 *          Some quando o `App.tsx` passar a importar `@frentista/entities/frentista` e
 *          consumir o `Result` no lugar do `catch`. Aí este arquivo é apagado, junto com o
 *          teste de caracterização que mora na entity.
 */

import { mensagemDeFoto, reduzirParaAvatar as reduzirNaEntity } from '@frentista/entities/frentista';

export { TETO_DATA_URL, iniciais } from '@frentista/entities/frentista';

/**
 * Recorta a foto num quadrado central e devolve a data URL do avatar.
 *
 * @param arquivo O que veio do `<input type="file" capture>`.
 * @param lado Lado do quadrado em pixels.
 * @param qualidade Qualidade do JPEG, de 0 a 1.
 * @throws `Error` com a frase que o `catch` do `App.tsx` mostra na tela — o contrato que
 *         existia antes da mudança, e que a tela ainda espera. O `match` é o consumo do
 *         `Result` exigido pela RES-2; a tradução para exceção acontece só aqui, na borda
 *         legada, e não dentro da entity.
 */
export async function reduzirParaAvatar(
  arquivo: File,
  lado?: number,
  qualidade?: number,
): Promise<string> {
  return reduzirNaEntity(arquivo, lado, qualidade).match(
    (dataUrl) => dataUrl,
    (erro) => {
      throw new Error(mensagemDeFoto(erro));
    },
  );
}