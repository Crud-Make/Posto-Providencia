/// <reference lib="webworker" />
/**
 * Service worker do app do dono.
 *
 * Escrito à mão (`injectManifest`) e não gerado (`generateSW`) por um motivo
 * só: o SW gerado não tem como receber `push`. Tudo o que o gerado fazia
 * — precache, ativar na hora, obedecer ao `ReloadPrompt` — está reproduzido
 * aqui de propósito; o que sobra é o aviso.
 */
import { precacheAndRoute, getCacheKeyForURL } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

/** Injetado pelo vite-plugin-pwa no lugar deste identificador. */
precacheAndRoute(self.__WB_MANIFEST);

// Paridade com o `skipWaiting: true` / `clientsClaim: true` que o generateSW
// tinha. Sem isto a versão nova ficaria esperando todas as abas fecharem, e o
// `ReloadPrompt` — que recarrega sozinho — nunca veria a troca acontecer.
self.addEventListener('install', () => {
    void self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
    evento.waitUntil(self.clients.claim());
});

/**
 * O `updateServiceWorker(true)` do `ReloadPrompt` manda esta mensagem.
 *
 * @remarks Com `generateSW` o Workbox instalava este ouvinte sozinho. Escrevendo
 *          o SW à mão, ele passa a ser responsabilidade nossa — e sem ele o
 *          botão de atualizar do app simplesmente não faria nada.
 */
self.addEventListener('message', (evento) => {
    if (evento.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

/**
 * Navegação offline: a rede primeiro, o `index.html` do precache como rede de
 * segurança.
 *
 * @remarks O precache guarda `index.html`, mas a rota dele casa por URL exata —
 *          e o dono abre o app em `/`, não em `/index.html`. Sem esta ponte, o
 *          app instalado abriria em branco sem sinal no posto, que é justamente
 *          onde ele mais precisa funcionar.
 */
self.addEventListener('fetch', (evento) => {
    if (evento.request.mode !== 'navigate') return;

    evento.respondWith(
        fetch(evento.request).catch(async () => {
            const chave = getCacheKeyForURL('index.html');
            const guardado = chave ? await caches.match(chave) : undefined;

            return guardado ?? Response.error();
        }),
    );
});

interface AvisoDoServidor {
    readonly titulo?: string;
    readonly corpo?: string;
    readonly fechamentoFrentistaId?: number;
}

/**
 * Mostra o aviso de fechamento novo.
 *
 * @remarks O iOS **não** aceita push silencioso: `userVisibleOnly` é obrigatório
 *          na inscrição, e todo envio precisa terminar numa notificação
 *          visível. Um `push` que não chame `showNotification` faz o navegador
 *          exibir um aviso genérico do sistema — ou punir a inscrição.
 * @remarks O texto vem pronto do servidor e não tem valor de dinheiro nenhum,
 *          de propósito: isto aparece com o aparelho BLOQUEADO. Os números
 *          ficam na tela de envios, atrás do desbloqueio.
 */
self.addEventListener('push', (evento) => {
    let aviso: AvisoDoServidor = {};
    try {
        aviso = evento.data?.json() ?? {};
    } catch {
        // Payload ilegível ainda precisa virar notificação — ver acima.
    }

    evento.waitUntil(
        self.registration.showNotification(aviso.titulo ?? 'Fechamento recebido', {
            body: aviso.corpo ?? 'Toque para ver os envios.',
            icon: '/pwa-192x192.png',
            // O badge é o ícone da BARRA DE STATUS do Android, e lá o sistema
            // pinta a silhueta de branco e ignora as cores. Mandar o logo
            // colorido em fundo branco dava um quadrado branco sem forma. O
            // nome do posto em TRÊS linhas (POSTO / PROVI- / DÊNCIA), vetorial: em 24dp
            // são ~72 px de largura, e 11 letras numa linha só não ficam legíveis.
            badge: '/badge-96x96.png',
            // Tag por ENVIO, não fixa. Com uma tag só, o aviso do segundo
            // frentista substituiria o do primeiro e o dono nunca saberia que o
            // Paulo também fechou. Assim cada envio tem o seu, e um reenvio do
            // MESMO envio (retry da função) substitui em vez de duplicar.
            tag: aviso.fechamentoFrentistaId ? `fechamento-${aviso.fechamentoFrentistaId}` : undefined,
            data: { url: '/?tela=envios' },
        }),
    );
});

/**
 * Toque no aviso abre os envios.
 *
 * @remarks Reaproveita a janela já aberta em vez de abrir outra. Sem isto, cada
 *          notificação tocada deixaria mais uma instância do app para trás.
 */
self.addEventListener('notificationclick', (evento) => {
    evento.notification.close();
    const destino = (evento.notification.data as { url?: string })?.url ?? '/?tela=envios';

    evento.waitUntil((async () => {
        const janelas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const aberta = janelas.find((c) => 'focus' in c);

        if (aberta) {
            await (aberta as WindowClient).navigate(destino);
            await (aberta as WindowClient).focus();
            return;
        }

        await self.clients.openWindow(destino);
    })());
});
