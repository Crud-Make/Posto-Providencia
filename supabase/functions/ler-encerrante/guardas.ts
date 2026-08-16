// Guardas de custo da Edge Function `ler-encerrante`.
//
// Por que este arquivo existe separado do `index.ts`: o `index.ts` chama `Deno.serve` no
// topo do módulo, então importá-lo num teste subiria um servidor. Aqui não há Deno, rede
// nem relógio global — o `agora` e as variáveis de ambiente entram por parâmetro. É o que
// permite o vitest (que roda em Node) cobrir a regra sem simular a plataforma.
//
// O que estas guardas protegem: cada foto processada dispara DUAS chamadas ao Gemini
// (auto-conferência com temperature 0 e 0.3). Sem limite, um laço `for` contra a URL
// pública multiplica a fatura do dono por 2 a cada requisição.

/**
 * Teto do `imagemBase64` recebido, em caracteres. 2 MiB de base64 ≈ 1,5 MiB de imagem.
 *
 * @remarks O número sai de medição, não de chute. O cliente comprime antes de enviar
 *          (`fileParaBase64Reduzido`, lado maior reduzido a 1000px e reencode JPEG a 0.82),
 *          e as fotos reais do spike, **sem** essa redução, dão 582 mil e 551 mil
 *          caracteres de base64. A foto que o OCR acertou 6/6 dá 160 mil.
 *          2 MiB é ~3,5x o pior caso não comprimido e ~13x o caso medido com acerto total.
 *          A folga é deliberada: **ninguém testou o `canvas.toDataURL` num aparelho real
 *          ainda**, e um encoder de Android pode sair maior do que a conta em disco.
 *          Errar apertado rejeita a foto do dono na hora em que ele precisa dela; errar
 *          folgado só deixa passar banda, e a fatura já está protegida pelo limite de
 *          taxa. Depois de medir em celular, este número pode cair.
 */
export const TAMANHO_MAXIMO_BASE64 = 2 * 1024 * 1024;

/**
 * Teto do corpo inteiro do pedido, conferido no `Content-Length` antes de bufferizar.
 *
 * @remarks Folga sobre o teto da imagem para o embrulho JSON e o `mimeType`.
 */
export const TAMANHO_MAXIMO_CORPO = 3 * 1024 * 1024;

/**
 * Teto de chaves vivas no limitador.
 *
 * @remarks O identificador do cliente sai de cabeçalho, e cabeçalho é falsificável: quem
 *          rotaciona `X-Forwarded-For` cria uma chave nova por requisição. Sem teto, isso
 *          vira vazamento de memória no isolate. Ao estourar, as chaves sem registro
 *          recente são descartadas — quem está ativo permanece limitado.
 */
export const MAXIMO_DE_CHAVES = 5000;

/** Uma janela deslizante: `quantidade` pedidos a cada `janelaMs`. */
export interface Limite {
  readonly quantidade: number;
  readonly janelaMs: number;
}

export interface ResultadoLimite {
  readonly permitido: boolean;
  /** Segundos até a próxima tentativa caber na janela. Vira o cabeçalho `Retry-After`. */
  readonly esperarSegundos: number;
}

const MINUTO = 60_000;
const HORA = 3_600_000;

/** Limite grosso por cliente, aplicado antes de ler o corpo — inclui `ping` e OCR. */
export const LIMITE_PEDIDOS: readonly Limite[] = [{ quantidade: 60, janelaMs: MINUTO }];

/**
 * Limite do caminho caro (OCR).
 *
 * @remarks 6/min é folga real para o uso legítimo: o frentista fotografa **um** papel por
 *          turno e erra a foto no máximo umas poucas vezes. O teto por hora existe porque
 *          6/min sustentado ainda daria 360 fotos — e 720 chamadas ao Gemini — numa hora.
 */
export const LIMITE_OCR: readonly Limite[] = [
  { quantidade: 6, janelaMs: MINUTO },
  { quantidade: 40, janelaMs: HORA },
];

/** Limite do `ping` de aquecimento: barato, mas não ilimitado. */
export const LIMITE_PING: readonly Limite[] = [{ quantidade: 30, janelaMs: MINUTO }];

export interface Limitador {
  registrar(chave: string, agoraMs: number, limites: readonly Limite[]): ResultadoLimite;
  /** Quantas chaves estão vivas. Só para teste e diagnóstico. */
  chavesVivas(): number;
}

/**
 * Limitador de taxa por janela deslizante, em memória.
 *
 * @remarks **É por isolate, não global.** A Supabase pode manter mais de um isolate vivo
 *          para a mesma função, e cada um tem o seu mapa: o teto efetivo é o configurado
 *          multiplicado pelo número de isolates. Um limite global exigiria estado
 *          compartilhado (tabela no Postgres a cada pedido), que custa latência no caminho
 *          quente e uma migração — e mexer em `supabase/migrations/` está fora desta
 *          tarefa. Isto não zera o abuso; corta a ordem de grandeza dele, que é o que
 *          separa uma fatura inesperada de uma fatura impagável.
 */
export function criarLimitador(maximoDeChaves = MAXIMO_DE_CHAVES): Limitador {
  const historico = new Map<string, number[]>();

  const podar = (agoraMs: number, janelaMaxima: number): void => {
    for (const [chave, marcas] of historico) {
      const vivas = marcas.filter((m) => m > agoraMs - janelaMaxima);
      if (vivas.length === 0) historico.delete(chave);
      else historico.set(chave, vivas);
    }
  };

  return {
    registrar(chave, agoraMs, limites) {
      const janelaMaxima = Math.max(...limites.map((l) => l.janelaMs));
      const anteriores = historico.get(chave) ?? [];
      const marcas = anteriores.filter((m) => m > agoraMs - janelaMaxima);

      for (const limite of limites) {
        const inicio = agoraMs - limite.janelaMs;
        const naJanela = marcas.filter((m) => m > inicio);
        if (naJanela.length >= limite.quantidade) {
          // A tentativa negada NÃO é registrada. Registrá-la faria quem insiste empurrar
          // a própria janela para frente sem parar, e o cliente honesto que tentou de
          // novo cedo demais nunca mais entraria.
          historico.set(chave, marcas);
          const maisAntiga = naJanela[0] ?? agoraMs;
          const esperarMs = maisAntiga + limite.janelaMs - agoraMs;
          return { permitido: false, esperarSegundos: Math.max(1, Math.ceil(esperarMs / 1000)) };
        }
      }

      marcas.push(agoraMs);
      historico.set(chave, marcas);
      if (historico.size > maximoDeChaves) podar(agoraMs, janelaMaxima);
      return { permitido: true, esperarSegundos: 0 };
    },

    chavesVivas() {
      return historico.size;
    },
  };
}

/** Cabeçalhos do pedido, no mínimo que estas guardas precisam ler. */
export interface LeitorDeCabecalho {
  get(nome: string): string | null;
}

/**
 * Identifica o cliente para efeito de limite de taxa.
 *
 * @remarks O primeiro salto do `X-Forwarded-For` é a convenção, e é **falsificável** — a
 *          borda anexa, não valida. Por isso o identificador serve para limitar custo, e
 *          nunca para autorizar nada. O teto de chaves do limitador é o que impede a
 *          falsificação de virar consumo de memória.
 */
export function identificarCliente(cabecalhos: LeitorDeCabecalho): string {
  const encaminhado = cabecalhos.get('x-forwarded-for');
  const primeiro = encaminhado?.split(',')[0]?.trim();
  if (primeiro) return primeiro;
  return cabecalhos.get('cf-connecting-ip')?.trim() || cabecalhos.get('x-real-ip')?.trim() || 'desconhecido';
}

/**
 * Decide o valor do `Access-Control-Allow-Origin`.
 *
 * @param origensPermitidas Lista separada por vírgula (variável `ORIGENS_PERMITIDAS`).
 * @returns A origem a devolver, ou `null` quando ela não está na lista.
 *
 * @remarks **CORS não é trava de custo.** Ele só existe dentro do navegador: `curl` e
 *          qualquer script ignoram o cabeçalho e a função responde igual. Vale contra
 *          página de terceiro que embute a nossa URL, não contra o laço `for` — quem faz
 *          esse trabalho é o limitador de taxa.
 *          Sem a variável configurada devolve `*`, que é o comportamento de hoje: os
 *          domínios reais ainda não existem, e travar em domínio inventado quebraria os
 *          três apps sem proteger nada.
 */
export function resolverOrigem(origemDoPedido: string | null, origensPermitidas?: string): string | null {
  const lista = (origensPermitidas ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (lista.length === 0) return '*';
  if (lista.includes('*')) return '*';
  if (origemDoPedido && lista.includes(origemDoPedido)) return origemDoPedido;
  return null;
}

/**
 * Confere o segredo compartilhado do cabeçalho `x-segredo-encerrante`.
 *
 * @remarks **Isto não é autenticação, e o comentário existe para ninguém confundir depois.**
 *          O segredo precisa viajar no bundle dos apps para o cliente conseguir chamar a
 *          função, e bundle é público: quem abrir o DevTools o encontra. O que ele para é
 *          varredura automatizada que acha a URL e dispara sem ler o JavaScript da página —
 *          é obstáculo, não trava. A trava de custo continua sendo o limite de taxa.
 *          Sem a variável configurada, não bloqueia nada.
 */
export function segredoConfere(recebido: string | null, esperado?: string): boolean {
  if (!esperado) return true;
  return recebido === esperado;
}

/** Bytes aproximados de um base64 — 4 caracteres carregam 3 bytes. */
export function bytesAproximados(comprimentoBase64: number): number {
  return Math.floor((comprimentoBase64 * 3) / 4);
}

/**
 * Decide se o corpo cabe, a partir do `Content-Length`.
 *
 * @remarks Conferido **antes** de `req.json()`: depois de bufferizar, o custo de memória e
 *          banda já foi pago. Cabeçalho ausente devolve `true` — não dá para negar o que
 *          não se sabe, e o teto do `imagemBase64` ainda pega o caso depois do parse.
 */
export function corpoCabe(contentLength: string | null, maximo = TAMANHO_MAXIMO_CORPO): boolean {
  if (!contentLength) return true;
  const bytes = Number(contentLength);
  if (!Number.isFinite(bytes) || bytes < 0) return true;
  return bytes <= maximo;
}

/** Decide se a imagem cabe no teto, já com o base64 em mãos. */
export function imagemCabe(imagemBase64: string, maximo = TAMANHO_MAXIMO_BASE64): boolean {
  return imagemBase64.length <= maximo;
}
