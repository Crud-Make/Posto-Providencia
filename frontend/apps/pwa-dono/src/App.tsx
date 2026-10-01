import { useEffect, useState } from 'react';
import { ClipboardList, Gauge, LogOut } from 'lucide-react';
import EncerranteScreen from './screens/EncerranteScreen';
import EnviosScreen from './screens/EnviosScreen';
import EntradaScreen from './screens/EntradaScreen';
import ReloadPrompt from './components/ReloadPrompt';
import { hojeIso } from '@posto/utils';
import { sair, type PerfilDaApi, type PostoDaRede } from './api/entrada';
import { aoPerderSessao } from './api/sessao';

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
 *
 *          Desde a #102 (fatia 1, 01/10/2026) o app serve OS DOIS postos da rede e
 *          fala com a API Laravel: antes das telas vem a entrada (cartão do posto +
 *          conta daquele posto), e o posto escolhido desce para as telas como prop.
 *          A sessão vive só na memória: fechar o app é entrar de novo.
 */

interface Sessao {
    readonly posto: PostoDaRede;
    readonly usuario: PerfilDaApi;
}

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
    const [sessao, setSessao] = useState<Sessao | null>(null);
    const [aviso, setAviso] = useState<string | null>(null);
    // Recomeça a tela do encerrante do zero (o "Voltar" dela). Antes era
    // `location.reload()`, que agora jogaria fora a sessão, que só vive na memória.
    const [rodadaEncerrante, setRodadaEncerrante] = useState(0);

    // 401 em qualquer chamada: o token morreu. Volta para a entrada dizendo por quê.
    useEffect(
        () =>
            aoPerderSessao((mensagem) => {
                setSessao(null);
                setAviso(mensagem);
            }),
        [],
    );

    // Tira o `?tela=` da barra de endereço depois de usar. Sem isso, recarregar
    // dias depois cairia sempre nos envios, como se fosse a tela inicial.
    useEffect(() => {
        if (!window.location.search) return;
        window.history.replaceState({}, '', window.location.pathname);
    }, []);

    if (sessao === null) {
        return (
            <>
                <EntradaScreen
                    aviso={aviso}
                    aoEntrar={(posto, usuario) => {
                        setAviso(null);
                        setSessao({ posto, usuario });
                    }}
                />
                <ReloadPrompt />
            </>
        );
    }

    const trocarPosto = () => {
        // Sai na API e esquece o token; a resposta não segura ninguém aqui dentro.
        void sair().match(
            () => undefined,
            () => undefined,
        );
        setSessao(null);
        setAviso(null);
    };

    return (
        <>
            <div className="sticky top-0 z-40 bg-[#0A0D14]/95 backdrop-blur border-b border-slate-800 px-5 py-2 flex items-center justify-between gap-3">
                <p className="text-sm text-slate-300 truncate">
                    <span className="font-bold text-white">{sessao.posto.nome}</span>
                    <span className="text-slate-500"> · {sessao.usuario.nome}</span>
                </p>
                <button
                    type="button"
                    onClick={trocarPosto}
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 border border-slate-700 rounded-full px-3 py-1.5"
                >
                    <LogOut size={14} aria-hidden="true" /> Trocar posto / Sair
                </button>
            </div>

            {/* A folga embaixo é do wrapper, não das telas: a barra é `fixed` e
                cobriria o fim do conteúdo. Feito aqui para não ter que mexer no
                `EncerranteScreen`, que já tem teste e não pediu navegação. */}
            <div className="pb-16">
                {tela === 'encerrante' ? (
                    <EncerranteScreen
                        key={`${sessao.posto.id}-${rodadaEncerrante}`}
                        postoId={sessao.posto.id}
                        onVoltar={() => setRodadaEncerrante((r) => r + 1)}
                    />
                ) : (
                    <EnviosScreen
                        postoId={sessao.posto.id}
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
                        type="button"
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
