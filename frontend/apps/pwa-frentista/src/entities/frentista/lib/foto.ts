/**
 * Prepara a foto de perfil do frentista para caber numa coluna de texto.
 *
 * A foto crua do celular tem vários MB e é retangular; o avatar na tela é
 * redondo e pequeno. Todo o trabalho acontece aqui, no aparelho, antes de
 * qualquer coisa sair pela rede.
 *
 * @remarks Vive na entity `frentista` porque a foto **é** um atributo do
 *          frentista, e não uma utilidade solta. Veio de `src/lib/foto.ts` em
 *          24/09/2026, na fatia curta do lote 2 do FSD: o caminho novo devolve
 *          `ResultAsync` (RES-1) em vez de lançar, e os 3 `TS2532` de
 *          `iniciais()` foram zerados no mesmo commit.
 *
 *          Gêmea de `fileParaBase64Reduzido`
 *          (`apps/pwa-dono/src/screens/EncerranteScreen.tsx:104`), que reduz a
 *          foto do encerrante para OCR — 1000px, sem recorte, devolvendo base64
 *          e preview separados. A duplicação é consciente: as duas dependem de
 *          `canvas`/`FileReader` do navegador, e `packages/utils` guarda lógica
 *          de domínio pura. Consolidar exigiria um pacote de browser
 *          compartilhado que ainda não existe — e mexer no arquivo já testado
 *          do outro app. Se aparecer um terceiro uso, é hora de criar o pacote.
 */

import { err, ok, ResultAsync, type Result } from 'neverthrow';

/**
 * Por que uma foto não pôde ser preparada.
 *
 * @remarks Cada variante é o motivo que o **frentista lê na tela**; quem
 *          traduz é {@link mensagemDeFoto}. A união existe para que
 *          `MENSAGENS`, abaixo, seja conferida por exaustão pelo `tsc`: variante
 *          nova sem mensagem reprova a compilação, que é o mesmo trabalho que o
 *          `assertUnreachable` faz — sem precisar de `throw`, que a RES-1 proíbe
 *          neste caminho.
 */
export type ErroDeFoto =
  | { readonly tipo: 'arquivo_ilegivel' }
  | { readonly tipo: 'nao_e_imagem' }
  | { readonly tipo: 'sem_canvas' }
  | { readonly tipo: 'foto_grande_demais' };

/**
 * Texto exibido por variante de erro.
 *
 * @remarks As frases são as mesmas de antes da migração para `ResultAsync`:
 *          foram escritas para o frentista, e o teste as cobra para que não
 *          sumam numa refatoração futura.
 */
const MENSAGENS: Record<ErroDeFoto['tipo'], string> = {
  arquivo_ilegivel: 'Não consegui ler o arquivo escolhido.',
  nao_e_imagem: 'Esse arquivo não parece ser uma imagem.',
  sem_canvas: 'Este navegador não consegue preparar a foto.',
  foto_grande_demais: 'A foto ficou grande demais. Tente uma imagem mais simples.',
};

/** Traduz o erro de domínio para a frase que vai para a tela. */
export function mensagemDeFoto(erro: ErroDeFoto): string {
  return MENSAGENS[erro.tipo];
}

/**
 * Teto de caracteres da data URL.
 *
 * @remarks Espelha o `CHECK` da coluna `Frentista.foto`
 *          (`supabase/migrations/20260830_frentista_foto.sql`). Os dois precisam
 *          andar juntos: sem a checagem daqui, quem estoura o teto recebe um
 *          erro de constraint do Postgres em inglês no lugar de um aviso.
 */
export const TETO_DATA_URL = 40_000;

/** Lado do avatar em pixels — 192 cobre tela retina de 3x sobre os 48px de exibição. */
const LADO_PADRAO = 192;

/**
 * Lê o arquivo escolhido como data URL.
 *
 * @remarks O `rejeitar` da promise é o único canal de falha que o `FileReader`
 *          oferece, e é por isso que este arquivo pode usá-lo: a promise nasce
 *          aqui e morre no `ResultAsync.fromPromise` logo abaixo — nenhum
 *          `throw` atravessa a função.
 */
function lerComoDataUrl(arquivo: File): ResultAsync<string, ErroDeFoto> {
  const promessa = new Promise<string>((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(leitor.result as string);
    leitor.onerror = () => rejeitar(new Error('leitura do arquivo falhou'));
    leitor.readAsDataURL(arquivo);
  });

  return ResultAsync.fromPromise(promessa, () => ({ tipo: 'arquivo_ilegivel' }));
}

/** Decodifica a data URL numa imagem já carregada, para poder medir e recortar. */
function carregarImagem(dataUrl: string): ResultAsync<HTMLImageElement, ErroDeFoto> {
  const promessa = new Promise<HTMLImageElement>((resolver, rejeitar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rejeitar(new Error('decodificação da imagem falhou'));
    img.src = dataUrl;
  });

  return ResultAsync.fromPromise(promessa, () => ({ tipo: 'nao_e_imagem' }));
}

/**
 * Recorta o quadrado central e devolve a data URL do avatar.
 *
 * @remarks Síncrona de propósito: canvas e `toDataURL` não falham por promise,
 *          falham por ausência (navegador sem contexto 2d) ou por tamanho.
 */
function recortarParaAvatar(
  img: HTMLImageElement,
  lado: number,
  qualidade: number,
): Result<string, ErroDeFoto> {
  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;

  const ctx = canvas.getContext('2d');
  if (ctx === null) return err({ tipo: 'sem_canvas' });

  // Recorte quadrado a partir do centro. O avatar é redondo: espremer um
  // retrato 3:4 dentro dele achata o rosto, e é o tipo de coisa que ninguém
  // reporta como bug — só acha o app feio.
  const corte = Math.min(img.width, img.height);
  const esquerda = (img.width - corte) / 2;
  const topo = (img.height - corte) / 2;
  ctx.drawImage(img, esquerda, topo, corte, corte, 0, 0, lado, lado);

  const avatar = canvas.toDataURL('image/jpeg', qualidade);
  if (avatar.length > TETO_DATA_URL) return err({ tipo: 'foto_grande_demais' });

  return ok(avatar);
}

/**
 * Recorta a foto num quadrado central e devolve o avatar como data URL JPEG.
 *
 * @param arquivo O que veio do `<input type="file" capture>`.
 * @param lado Lado do quadrado em pixels.
 * @param qualidade Qualidade do JPEG, de 0 a 1.
 * @returns `Ok` com a data URL `data:image/jpeg;base64,...` pronta para gravar
 *          na coluna; `Err` com o motivo, que {@link mensagemDeFoto} traduz.
 */
export function reduzirParaAvatar(
  arquivo: File,
  lado = LADO_PADRAO,
  qualidade = 0.75,
): ResultAsync<string, ErroDeFoto> {
  return lerComoDataUrl(arquivo)
    .andThen((original) => carregarImagem(original))
    .andThen((img) => recortarParaAvatar(img, lado, qualidade));
}

/** Iniciais para quando não há foto: "João Silva" → "JS", "Ana" → "A". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  // `noUncheckedIndexedAccess` trata todo índice como `T | undefined` — e aqui
  // isso é verdade: nome vazio ou só espaços dá lista vazia. O guarda cobre os
  // dois casos de uma vez, em vez de confiar no `.length`.
  const primeira = partes[0];
  if (primeira === undefined) return '?';

  const ultima = partes[partes.length - 1] ?? primeira;
  const letras = partes.length === 1 ? primeira.charAt(0) : primeira.charAt(0) + ultima.charAt(0);

  return letras.toUpperCase();
}
