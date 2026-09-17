import { useEffect } from 'react';
import { INTERVALO_SINAL_MS } from '@posto/utils';
import { api } from '../services/api';

/**
 * Mantém o frentista aparecendo como "trabalhando agora" no painel do dono.
 *
 * @param frentistaId - `null` quando ninguém está selecionado: nesse caso nenhum
 *                      sinal é enviado.
 * @param postoId - Posto do sinal.
 *
 * @remarks
 * **Só bate enquanto o app está de fato aberto.** O frentista escolhido fica
 * salvo no `localStorage` (`pwa.frentista`) para o app não se perder quando o
 * iPhone descarrega a página ao abrir a câmera — mas ler esse valor não prova
 * nada sobre agora. Se o sinal viesse de lá, todo celular que um dia usou o app
 * apareceria trabalhando para sempre. Por isso o gatilho é este efeito, que só
 * existe enquanto a tela está montada.
 *
 * **Bate de novo ao voltar do bolso.** No celular, uma aba em segundo plano tem
 * o `setInterval` estrangulado ou congelado — sem o `visibilitychange`, o
 * frentista voltaria ao painel só no próximo intervalo que o sistema deixasse
 * passar, que pode ser bem depois.
 */
export function useSinalDeVida(frentistaId: number | null, postoId: number): void {
    useEffect(() => {
        if (frentistaId === null) return;

        const bater = () => { void api.marcarPresenca(frentistaId, postoId); };

        bater();
        const timer = setInterval(bater, INTERVALO_SINAL_MS);

        const aoVoltar = () => { if (document.visibilityState === 'visible') bater(); };
        document.addEventListener('visibilitychange', aoVoltar);

        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', aoVoltar);
        };
    }, [frentistaId, postoId]);
}
