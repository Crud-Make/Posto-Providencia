/**
 * O "tempo real" do Fechamento de Caixa: a tela acorda sozinha quando o frentista envia pelo PWA
 * (`FechamentoFrentista`) ou o dono fotografa um encerrante (`Leitura`).
 *
 * @remarks
 * Os dois canais do Supabase moravam em `index.tsx`; saíram para cá quando a tela passou a
 * funcionar 100% pela API (25/09/2026), para poderem ser DESLIGADOS de forma explícita.
 *
 * **Com o login pela API (`VITE_API_LOGIN=1`) os canais não são abertos.** Não há sessão do
 * Supabase para o Realtime autenticar, e a decisão do dono (21/09/2026, memória
 * `realtime-fica-no-laravel`) é que o realtime vá para o Laravel (Reverb, canal privado por posto)
 * DEPOIS que a escrita do PWA migrar — nem canal do Supabase, nem polling. Até lá, no modo API, a
 * tela avisa que não atualiza sozinha e oferece o botão de recarregar (`AvisoSemTempoReal`).
 *
 * Com login no Supabase — inclusive com `VITE_API_URL` ligada, o ensaio de 27/09 — os canais
 * continuam exatamente como eram: o aviso chega por eles e a recarga vai pela fonte da tela.
 */
import { useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { loginPelaApiLigado } from '../../../services/api/base';

interface Recarregadores {
    readonly dataSelecionada: string;
    readonly carregarSessoes: (data: string, force?: boolean) => Promise<void>;
    readonly carregarLeituras: (force?: boolean) => Promise<void>;
}

/** `true` quando a tela recebe os envios sozinha; `false` no modo API, até o realtime do Laravel. */
export function tempoRealLigado(): boolean {
    return !loginPelaApiLigado();
}

export function useTempoRealDoFechamento({ dataSelecionada, carregarSessoes, carregarLeituras }: Recarregadores): boolean {
    const ligado = tempoRealLigado();

    // Envios do PWA: recarrega as sessões do dia, forçando (a trava de contexto não deixaria).
    useEffect(() => {
        if (!ligado) return;
        const canal = supabase
            .channel('pwa-envios-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'FechamentoFrentista' }, (payload) => {
                console.log('🔔 Alteração de FechamentoFrentista detectada em tempo real:', payload.eventType, payload);
                if (dataSelecionada) {
                    void carregarSessoes(dataSelecionada, true);
                }
            })
            .subscribe((status) => {
                console.log('📡 Realtime status:', status);
            });

        return () => {
            void supabase.removeChannel(canal);
        };
    }, [ligado, dataSelecionada, carregarSessoes]);

    // Leituras de bico (OCR do encerrante pelo app do dono).
    useEffect(() => {
        if (!ligado) return;
        const canal = supabase
            .channel('leituras-bico-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Leitura' }, (payload) => {
                console.log('🔔 Alteração de Leitura detectada em tempo real:', payload.eventType, payload);
                void carregarLeituras(true);
            })
            .subscribe((status) => {
                console.log('📡 Realtime status (Leitura):', status);
            });

        return () => {
            void supabase.removeChannel(canal);
        };
    }, [ligado, carregarLeituras]);

    return ligado;
}
