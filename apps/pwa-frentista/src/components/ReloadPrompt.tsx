import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw } from 'lucide-react'

function ReloadPrompt() {
    const {
        needRefresh: [needRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            console.log('SW Registered:', swUrl)
            if (r) {
                // Checa atualizações a cada 15 segundos
                setInterval(() => {
                    console.log('Verificando atualizações...')
                    r.update()
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

    // Quando detecta atualização, recarrega automaticamente
    if (needRefresh) {
        // Mostra banner por 1.5s e depois atualiza
        setTimeout(() => {
            updateServiceWorker(true)
        }, 1500)
    }

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

export default ReloadPrompt
