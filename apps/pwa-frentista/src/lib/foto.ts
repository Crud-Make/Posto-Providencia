/**
 * Prepara a foto de perfil do frentista para caber numa coluna de texto.
 *
 * A foto crua do celular tem vários MB e é retangular; o avatar na tela é
 * redondo e pequeno. Todo o trabalho acontece aqui, no aparelho, antes de
 * qualquer coisa sair pela rede.
 *
 * @remarks Gêmea de `fileParaBase64Reduzido`
 *          (`apps/pwa-dono/src/screens/EncerranteScreen.tsx:104`), que reduz a
 *          foto do encerrante para OCR — 1000px, sem recorte, devolvendo base64
 *          e preview separados. A duplicação é consciente: as duas dependem de
 *          `canvas`/`FileReader` do navegador, e `packages/utils` guarda lógica
 *          de domínio pura. Consolidar exigiria um pacote de browser
 *          compartilhado que ainda não existe — e mexer no arquivo já testado
 *          do outro app. Se aparecer um terceiro uso, é hora de criar o pacote.
 */

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

function lerComoDataUrl(arquivo: File): Promise<string> {
  return new Promise((resolver, rejeitar) => {
    const leitor = new FileReader();
    leitor.onload = () => resolver(leitor.result as string);
    leitor.onerror = () => rejeitar(new Error('Não consegui ler o arquivo escolhido.'));
    leitor.readAsDataURL(arquivo);
  });
}

function carregarImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rejeitar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => rejeitar(new Error('Esse arquivo não parece ser uma imagem.'));
    img.src = dataUrl;
  });
}

/**
 * Recorta a foto num quadrado central e devolve o avatar como data URL JPEG.
 *
 * @param arquivo O que veio do `<input type="file" capture>`.
 * @returns Data URL `data:image/jpeg;base64,...` pronta para gravar na coluna.
 * @throws Se o navegador não tiver canvas, se o arquivo não for imagem, ou se o
 *         resultado passar de {@link TETO_DATA_URL}.
 */
export async function reduzirParaAvatar(
  arquivo: File,
  lado = LADO_PADRAO,
  qualidade = 0.75,
): Promise<string> {
  const original = await lerComoDataUrl(arquivo);
  const img = await carregarImagem(original);

  const canvas = document.createElement('canvas');
  canvas.width = lado;
  canvas.height = lado;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Este navegador não consegue preparar a foto.');

  // Recorte quadrado a partir do centro. O avatar é redondo: espremer um
  // retrato 3:4 dentro dele achata o rosto, e é o tipo de coisa que ninguém
  // reporta como bug — só acha o app feio.
  const corte = Math.min(img.width, img.height);
  const esquerda = (img.width - corte) / 2;
  const topo = (img.height - corte) / 2;
  ctx.drawImage(img, esquerda, topo, corte, corte, 0, 0, lado, lado);

  const avatar = canvas.toDataURL('image/jpeg', qualidade);
  if (avatar.length > TETO_DATA_URL) {
    throw new Error('A foto ficou grande demais. Tente uma imagem mais simples.');
  }

  return avatar;
}

/** Iniciais para quando não há foto: "João Silva" → "JS", "Ana" → "A". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].charAt(0).toUpperCase();

  return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
}
