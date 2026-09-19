import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

export function ReloadPrompt() {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            console.log('SW Registered:', swUrl)
            if (r) {
                // Checa atualizações a cada 15 segundos. `void`: a checagem é disparar-e-seguir
                // de propósito — falha de rede aqui não tem tratamento, a próxima tenta de novo.
                setInterval(() => {
                    console.log('Verificando atualizações...')
                    void r.update()
                }, 15 * 1000)
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
        onNeedRefresh() {
            console.log('Nova versão detectada! Atualizando automaticamente...')
        },
        onOfflineReady() {
            console.log('App pronto para uso offline')
        },
    })

    // Quando detecta atualização, recarrega automaticamente — mas NUNCA durante
    // uma foto/OCR/gravação em andamento (janela __encerranteBusy), senão a
    // captura é perdida e o app parece "voltar pra tela inicial".
    useEffect(() => {
        if (!needRefresh) return
        const t = setInterval(() => {
            // A flag é opcional (`boolean | undefined`): ausente conta como "livre".
            if (window.__encerranteBusy !== true) {
                void updateServiceWorker(true)
            }
        }, 1500)
        return () => clearInterval(t)
    }, [needRefresh, updateServiceWorker])

    if (!needRefresh) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] p-3">
            <div className="bg-emerald-600 rounded-xl shadow-lg shadow-emerald-600/30 p-3 border border-emerald-500/50 flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/40 flex items-center justify-center shrink-0">
                    <RefreshCw size={16} className="text-white animate-spin" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm leading-tight">Atualizando o aplicativo...</h3>
                    <p className="text-emerald-200 text-xs">Nova versão chegando em instantes!</p>
                </div>
            </div>
        </div>
    )
}
