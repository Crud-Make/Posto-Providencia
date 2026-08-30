import { useEffect, useState } from 'react';
import { ClipboardList, Gauge } from 'lucide-react';
import EncerranteScreen from './screens/EncerranteScreen';
import EnviosScreen from './screens/EnviosScreen';
import ReloadPrompt from './components/ReloadPrompt';
import { hojeIso } from '@posto/utils';

/**
 * App do dono — duas telas: a leitura das bombas e os envios dos frentistas.
 *
 * @remarks Sem seleção de frentista, e de propósito. O encerrante é a leitura da
 *          BOMBA: a tabela `Leitura` não tem coluna de frentista, e o plano
 *          original do OCR já tratava o encerrante como responsabilidade do dono
 *          (ver `.claude/docs/ocr-encerrante-plano-original.md`). Ter nascido na
 *          aba do PWA do frentista foi o desvio que este app corrige.
 *
 *          A navegação entrou junto com os envios, que é o destino da
 *          notificação de fechamento novo — antes disso não havia para onde ir,
 *          e inventar rota sem segunda tela teria sido abstração vazia.
 */

const TELAS = ['encerrante', 'envios'] as const;
type Tela = (typeof TELAS)[number];

/**
 * Lê `?tela=envios` da URL.
 *
 * @remarks É por aqui que a notificação chega: ao ser tocada, o service worker
 *          abre o app nessa URL, e não na raiz. Sem isso o dono cairia no
 *          encerrante e teria que navegar à mão logo depois de ser avisado.
 */
function telaDaUrl(): Tela {
    try {
        const pedida = new URLSearchParams(window.location.search).get('tela');
        return TELAS.includes(pedida as Tela) ? (pedida as Tela) : 'encerrante';
    } catch {
        return 'encerrante';
    }
}

export default function App() {
    const [tela, setTela] = useState<Tela>(telaDaUrl);
    const [dataEnvios, setDataEnvios] = useState(() => hojeIso());

    // Tira o `?tela=` da barra de endereço depois de usar. Sem isso, recarregar
    // dias depois cairia sempre nos envios, como se fosse a tela inicial.
    useEffect(() => {
        if (!window.location.search) return;
        window.history.replaceState({}, '', window.location.pathname);
    }, []);

    return (
        <>
            {/* A folga embaixo é do wrapper, não das telas: a barra é `fixed` e
                cobriria o fim do conteúdo. Feito aqui para não ter que mexer no
                `EncerranteScreen`, que já tem teste e não pediu navegação. */}
            <div className="pb-16">
                {tela === 'encerrante' ? (
                    <EncerranteScreen onVoltar={() => window.location.reload()} />
                ) : (
                    <EnviosScreen
                        dataIso={dataEnvios}
                        onTrocarData={setDataEnvios}
                        onVoltar={() => setTela('encerrante')}
                    />
                )}
            </div>

            <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#0A0D14]/95 backdrop-blur border-t border-slate-800 flex">
                {([
                    { id: 'encerrante' as const, rotulo: 'Encerrante', Icone: Gauge },
                    { id: 'envios' as const, rotulo: 'Envios', Icone: ClipboardList },
                ]).map(({ id, rotulo, Icone }) => (
                    <button
                        key={id}
                        onClick={() => setTela(id)}
                        aria-current={tela === id ? 'page' : undefined}
                        className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-semibold transition-colors
                            ${tela === id ? 'text-red-500' : 'text-slate-500'}`}
                    >
                        <Icone size={20} />
                        {rotulo}
                    </button>
                ))}
            </nav>

            <ReloadPrompt />
        </>
    );
}
