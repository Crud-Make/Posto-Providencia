/**
 * Decide se e como oferecer a notificação, e faz a inscrição no Web Push.
 *
 * Lógica pura separada do navegador de propósito, como em `instalacao.ts`: os
 * sinais entram por parâmetro para dar para testar iPhone sem iPhone na mão.
 *
 * @remarks Web Push é padrão do navegador — sem Firebase. O endpoint que o
 *          `subscribe()` devolve já aponta para o serviço do fabricante
 *          (`web.push.apple.com` no iPhone), e quem cifra e assina é a Edge
 *          Function `notifica-dono`, com a chave VAPID privada.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export const ESTADO_PUSH = [
  'sem-suporte',
  'precisa-instalar',
  'disponivel',
  'negado',
  'inscrito',
] as const;
export type EstadoPush = (typeof ESTADO_PUSH)[number];

interface SinaisDoPush {
  /** `'PushManager' in window && 'serviceWorker' in navigator` */
  readonly temApi: boolean;
  /** O app está aberto na tela de início (ver `jaInstalado` em `instalacao.ts`). */
  readonly instalado: boolean;
  /** iPhone/iPad — onde a instalação é PRÉ-REQUISITO, não conveniência. */
  readonly ios: boolean;
  readonly permissao: NotificationPermission;
  readonly jaInscrito: boolean;
}

/**
 * @returns `'sem-suporte'` esconde tudo; `'precisa-instalar'` manda instalar
 *          antes; `'disponivel'` mostra o botão; `'negado'` explica o beco sem
 *          saída; `'inscrito'` confirma que já está ligado.
 * @remarks A ordem importa. No iOS a `PushManager` **só existe** com o app na
 *          tela de início: no Safari comum ela nem aparece, então `temApi`
 *          falso num iPhone significa "instale", não "seu aparelho não
 *          suporta" — e essa é a mensagem que o dono precisa ler.
 */
export function decidirEstadoPush({
  temApi,
  instalado,
  ios,
  permissao,
  jaInscrito,
}: SinaisDoPush): EstadoPush {
  if (ios && !instalado) return 'precisa-instalar';
  if (!temApi) return 'sem-suporte';
  if (permissao === 'denied') return 'negado';
  if (jaInscrito && permissao === 'granted') return 'inscrito';

  return 'disponivel';
}

/**
 * Converte a chave VAPID pública (base64url) para os bytes que o
 * `pushManager.subscribe()` exige.
 *
 * @remarks O `applicationServerKey` não aceita string base64url: quer um
 *          `Uint8Array` cru. E o base64url do VAPID vem sem o `=` de
 *          preenchimento e com `-`/`_` no lugar de `+`/`/` — passar direto para
 *          o `atob` estoura com "InvalidCharacterError".
 * @remarks O tipo de retorno é `Uint8Array<ArrayBuffer>`, não `Uint8Array`
 *          puro: desde o TS 5.7 os TypedArrays são genéricos, e o `Uint8Array`
 *          sem argumento vira `ArrayBufferLike` — que inclui `SharedArrayBuffer`
 *          e por isso não é aceito como `BufferSource` pelo `subscribe()`.
 */
export function chaveVapidParaBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const preenchimento = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + preenchimento).replace(/-/g, '+').replace(/_/g, '/');
  const bruto = atob(base64);

  const bytes = new Uint8Array(new ArrayBuffer(bruto.length));
  for (let i = 0; i < bruto.length; i += 1) bytes[i] = bruto.charCodeAt(i);

  return bytes;
}

/** Rótulo curto do aparelho, só para o dono reconhecer a inscrição depois. */
export function descreverAparelho(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/iphone/.test(ua)) return 'iPhone';
  if (/ipad|macintosh/.test(ua)) return 'iPad';
  if (/android/.test(ua)) return 'Android';

  return 'Navegador';
}

export interface ResultadoInscricao {
  readonly ok: boolean;
  readonly estado: EstadoPush;
  readonly mensagem: string;
}

/**
 * Pede a permissão e grava a inscrição no banco.
 *
 * @remarks Precisa ser chamada DENTRO de um toque do usuário. No iOS a
 *          `requestPermission()` fora de um gesto é recusada em silêncio — e
 *          uma negativa lá é praticamente irreversível: só removendo o app da
 *          tela de início e instalando de novo. Por isso não existe pedido
 *          automático em lugar nenhum deste app.
 */
export async function inscreverNoPush(
  supabase: SupabaseClient,
  chavePublica: string,
): Promise<ResultadoInscricao> {
  if (!chavePublica) {
    return { ok: false, estado: 'sem-suporte', mensagem: 'Chave VAPID ausente na configuração do app.' };
  }

  const permissao = await Notification.requestPermission();
  if (permissao !== 'granted') {
    return {
      ok: false,
      estado: 'negado',
      mensagem: 'Sem permissão, o aviso não chega. No iPhone, para reverter é preciso remover o app da tela de início e instalar de novo.',
    };
  }

  // `serviceWorker.ready` NUNCA resolve se nenhum SW foi registrado — e em
  // `bun run dev` o vite-plugin-pwa não registra nenhum. Sem este teto, o botão
  // giraria para sempre sem dizer por quê, que é o pior tipo de falha.
  const registro = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolver) => setTimeout(() => resolver(null), 5000)),
  ]);

  if (!registro) {
    return {
      ok: false,
      estado: 'sem-suporte',
      mensagem: 'Nenhum service worker registrado neste endereço. Em desenvolvimento ele não sobe — teste com o app compilado (bun run preview).',
    };
  }

  // Reaproveita a inscrição existente: assinar de novo com a MESMA chave
  // devolve o mesmo endpoint, mas pedir com chave diferente estoura.
  const inscricao =
    (await registro.pushManager.getSubscription()) ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true, // o iOS não aceita push silencioso; todo envio mostra aviso
      applicationServerKey: chaveVapidParaBytes(chavePublica),
    }));

  const bruta = inscricao.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!bruta.endpoint || !bruta.keys?.p256dh || !bruta.keys?.auth) {
    return { ok: false, estado: 'disponivel', mensagem: 'O navegador devolveu uma inscrição incompleta.' };
  }

  const { error } = await supabase.from('InscricaoPush').insert({
    endpoint: bruta.endpoint,
    p256dh: bruta.keys.p256dh,
    auth: bruta.keys.auth,
    papel: 'dono',
    // O domínio entra junto de propósito: a inscrição pertence ao service
    // worker de UMA origem, então o mesmo aparelho gera inscrições diferentes
    // em preview e em produção. Sem isto, as duas linhas ficam idênticas no
    // banco e não há como saber qual está velha.
    descricao_aparelho: `${descreverAparelho(navigator.userAgent)} · ${window.location.host}`,
  });

  // Endpoint repetido = este aparelho já estava inscrito. A `unique` do banco
  // recusa (23505), e isso é sucesso, não falha: o objetivo já está cumprido.
  if (error && !error.message.includes('duplicate key')) {
    return { ok: false, estado: 'disponivel', mensagem: error.message };
  }

  return { ok: true, estado: 'inscrito', mensagem: 'Pronto. Você será avisado quando um frentista fechar o caixa.' };
}
