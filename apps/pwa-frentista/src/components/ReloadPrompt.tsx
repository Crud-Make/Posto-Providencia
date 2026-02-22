import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'

function ReloadPrompt() {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered', r)
            if (r) {
                // Checa atualizações a cada 10 segundos para fins de teste mais rápido
                setInterval(() => {
                    console.log('Checando novidades do SW...')
                    r.update()
                }, 10 * 1000)
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error)
        },
    })

    const close = () => {
        setNeedRefresh(false)
    }

    if (!needRefresh) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-top-4 duration-300">
            <div className="bg-indigo-600 rounded-xl shadow-lg shadow-indigo-600/30 p-4 border border-indigo-500/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/40 flex items-center justify-center animate-pulse shrink-0">
                        <RefreshCw size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold leading-tight">Nova Atualização Disponível!</h3>
                        <p className="text-indigo-200 text-sm">Atualize o aplicativo para ver as novidades e melhorias.</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                        onClick={() => close()}
                        className="p-2 sm:p-2 flex-1 sm:flex-none flex justify-center text-indigo-200 hover:text-white hover:bg-indigo-700/50 rounded-lg transition-colors"
                    >
                        <span className="sm:hidden font-medium">Agora Não</span>
                        <X size={20} className="hidden sm:block" />
                    </button>
                    <button
                        onClick={() => updateServiceWorker(true)}
                        className="flex-1 sm:flex-none bg-white text-indigo-700 px-5 py-2 rounded-lg font-bold hover:bg-slate-100 transition-colors shadow-sm"
                    >
                        Atualizar App
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ReloadPrompt
