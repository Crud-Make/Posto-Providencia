/**
 * Liga o aviso de "frentista fechou o caixa" neste aparelho.
 *
 * @remarks O pedido de permissão sai DAQUI, de um toque, e nunca sozinho ao
 *          abrir o app. No iPhone, `requestPermission()` fora de um gesto do
 *          usuário é recusada em silêncio — e uma negativa é quase
 *          irreversível: exige remover o app da tela de início e instalar de
 *          novo. Um pedido automático gastaria a única chance boa.
 */
import { useCallback, useEffect, useState } from 'react';
import { Bell, BellOff, BellRing, Download, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { detectarPlataforma, jaInstalado } from '../lib/instalacao';
import { decidirEstadoPush, inscreverNoPush, type EstadoPush } from '../lib/push';

const CHAVE_PUBLICA = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '';

/** Já existe inscrição neste navegador? Falso também quando não há SW registrado. */
async function jaTemInscricao(): Promise<boolean> {
    try {
        // `getRegistration` e não `ready`: o `ready` NUNCA resolve se nenhum
        // service worker foi registrado, e a tela ficaria carregando para
        // sempre em vez de mostrar o botão.
        const registro = await navigator.serviceWorker?.getRegistration();
        if (!registro) return false;

        return (await registro.pushManager.getSubscription()) != null;
    } catch {
        return false;
    }
}

export default function BotaoNotificacoes() {
    const [estado, setEstado] = useState<EstadoPush | null>(null);
    const [ocupado, setOcupado] = useState(false);
    const [recado, setRecado] = useState<string | null>(null);

    const conferirEstado = useCallback(async () => {
        const temApi = typeof window !== 'undefined'
            && 'serviceWorker' in navigator
            && 'PushManager' in window
            && 'Notification' in window;

        setEstado(decidirEstadoPush({
            temApi,
            instalado: jaInstalado({
                standalonePorMedia: window.matchMedia('(display-mode: standalone)').matches,
                standalonePorNavigator: (navigator as Navigator & { standalone?: boolean }).standalone,
            }),
            ios: detectarPlataforma(navigator.userAgent, navigator.maxTouchPoints) === 'ios',
            permissao: temApi ? Notification.permission : 'default',
            jaInscrito: await jaTemInscricao(),
        }));
    }, []);

    useEffect(() => { void conferirEstado(); }, [conferirEstado]);

    const ligar = async () => {
        setOcupado(true);
        setRecado(null);
        try {
            const resultado = await inscreverNoPush(supabase, CHAVE_PUBLICA);
            setRecado(resultado.mensagem);
            await conferirEstado();
        } catch (e) {
            setRecado(e instanceof Error ? e.message : 'Não consegui ligar o aviso.');
        } finally {
            setOcupado(false);
        }
    };

    if (estado === null || estado === 'sem-suporte') return null;

    const caixa = 'w-full rounded-2xl p-4 border flex items-center gap-3 text-left';

    if (estado === 'precisa-instalar') {
        return (
            <div className={`${caixa} bg-[#131722] border-slate-800/60`}>
                <Download size={20} className="text-amber-400 shrink-0" />
                <p className="text-sm text-slate-300">
                    Para receber o aviso no iPhone, instale o app primeiro:
                    <strong className="text-white"> Compartilhar → Adicionar à Tela de Início</strong>.
                </p>
            </div>
        );
    }

    if (estado === 'negado') {
        return (
            <div className={`${caixa} bg-[#131722] border-slate-800/60`}>
                <BellOff size={20} className="text-slate-500 shrink-0" />
                <p className="text-sm text-slate-400">
                    Os avisos estão bloqueados neste aparelho. No iPhone, só volta removendo o app da
                    tela de início e instalando de novo.
                </p>
            </div>
        );
    }

    if (estado === 'inscrito') {
        return (
            <div className={`${caixa} bg-emerald-500/10 border-emerald-500/30`}>
                <BellRing size={20} className="text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-300">
                    Avisos ligados neste aparelho.
                    {recado && <span className="block text-emerald-400/70 text-xs mt-0.5">{recado}</span>}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <button
                onClick={() => void ligar()}
                disabled={ocupado}
                className={`${caixa} bg-indigo-600 border-indigo-500 active:scale-[0.99] transition-transform disabled:opacity-60`}
            >
                {ocupado
                    ? <Loader2 size={20} className="text-white shrink-0 animate-spin" />
                    : <Bell size={20} className="text-white shrink-0" />}
                <span className="text-sm font-bold text-white">
                    Me avisar quando um frentista fechar o caixa
                </span>
            </button>
            {recado && <p className="text-xs text-amber-400 px-1">{recado}</p>}
        </div>
    );
}
