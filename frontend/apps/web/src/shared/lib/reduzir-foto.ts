import { errAsync, ResultAsync } from 'neverthrow';

/**
 * Prepara a foto da fachada do posto para caber na coluna de texto do banco (27/09/2026).
 *
 * @remarks A foto crua do celular tem vários MB. Aqui ela vira um JPEG de até 1280 px de largura, e a
 *          qualidade desce em degraus até caber no limite do servidor. Tudo no aparelho, antes da rede.
 *
 *          TERCEIRA cópia do redutor de foto do navegador — as outras são
 *          `pwa-frentista/src/entities/frentista/lib/foto.ts` (avatar redondo) e o `EncerranteScreen`
 *          do pwa-dono (OCR). O comentário do PWA já dizia: no terceiro uso, criar um pacote de browser
 *          compartilhado. Fica como pendência registrada no CHANGELOG, fora do ensaio.
 */

export type ErroDeFoto =
  | { readonly tipo: 'nao_e_imagem' }
  | { readonly tipo: 'arquivo_ilegivel' }
  | { readonly tipo: 'foto_grande_demais' };

const MENSAGENS: Record<ErroDeFoto['tipo'], string> = {
  nao_e_imagem: 'Esse arquivo não parece ser uma imagem.',
  arquivo_ilegivel: 'Não consegui abrir essa imagem. Tente outra foto.',
  foto_grande_demais: 'A foto ficou grande demais mesmo reduzida. Tente uma imagem mais simples.',
};

export function mensagemDeFoto(erro: ErroDeFoto): string {
  return MENSAGENS[erro.tipo];
}

const LARGURA_MAXIMA = 1280;
const QUALIDADES = [0.82, 0.7, 0.6, 0.5, 0.4] as const;

/**
 * A primeira qualidade cujo JPEG cabe no limite, da melhor para a pior.
 *
 * @returns o data URL, ou `null` se nem a pior qualidade couber.
 */
export function primeiraQueCabe(gerar: (qualidade: number) => string, limite: number): string | null {
  for (const qualidade of QUALIDADES) {
    const dataUrl = gerar(qualidade);
    if (dataUrl.length <= limite) return dataUrl;
  }
  return null;
}

/** Reduz a foto escolhida a um data URL JPEG de no máximo `limite` caracteres. */
export function reduzirFoto(arquivo: File, limite: number): ResultAsync<string, ErroDeFoto> {
  if (!arquivo.type.startsWith('image/')) return errAsync({ tipo: 'nao_e_imagem' });

  return ResultAsync.fromPromise(createImageBitmap(arquivo), (): ErroDeFoto => ({ tipo: 'arquivo_ilegivel' })).andThen(
    (imagem) => {
      const escala = Math.min(1, LARGURA_MAXIMA / imagem.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(imagem.width * escala);
      canvas.height = Math.round(imagem.height * escala);
      const contexto = canvas.getContext('2d');
      if (contexto === null) return errAsync<string, ErroDeFoto>({ tipo: 'arquivo_ilegivel' });
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height);
      imagem.close();

      const dataUrl = primeiraQueCabe((q) => canvas.toDataURL('image/jpeg', q), limite);
      return dataUrl === null
        ? errAsync<string, ErroDeFoto>({ tipo: 'foto_grande_demais' })
        : ResultAsync.fromSafePromise(Promise.resolve(dataUrl));
    },
  );
}
