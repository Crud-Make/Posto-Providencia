/**
 * A entrada do app do dono: escolher o posto e entrar com a conta DAQUELE posto (#102).
 *
 * @remarks "Igual ao painel" (decisão do dono, 30/09–01/10/2026): um cartão por posto da rede
 *          (`GET /api/postos`, rota pública), e o cartão escolhido abre usuário e senha. O token
 *          fica só na memória — fechar o app é entrar de novo. Desenho enxuto para o celular, nas
 *          cores do app; a cena do pórtico do painel não veio junto.
 */
import { useCallback, useEffect, useState } from 'react';
import { Fuel, Loader2 } from 'lucide-react';
import { urlDaApi } from '../api/cliente';
import { enderecoDaFoto, postosDaRede, type PerfilDaApi, type PostoDaRede } from '../api/entrada';
import FormularioDoPosto from '../components/formulario-do-posto';

type ListaDePostos = { estado: 'carregando' } | { estado: 'pronta'; postos: PostoDaRede[] } | { estado: 'falhou' };

interface Props {
    /** Frase que trouxe a pessoa de volta para cá (sessão acabou), ou `null`. */
    readonly aviso: string | null;
    readonly aoEntrar: (posto: PostoDaRede, usuario: PerfilDaApi) => void;
}

const iniciais = (nome: string): string =>
    nome
        .replace(/^posto\s+/i, '')
        .trim()
        .slice(0, 2)
        .toUpperCase();

function usePostos(): [ListaDePostos, () => void] {
    const [lista, setLista] = useState<ListaDePostos>({ estado: 'carregando' });
    const [versao, setVersao] = useState(0);

    useEffect(() => {
        let ativo = true;
        void postosDaRede().match(
            (postos) => ativo && setLista({ estado: 'pronta', postos }),
            () => ativo && setLista({ estado: 'falhou' }),
        );
        return () => {
            ativo = false;
        };
    }, [versao]);

    const recarregar = useCallback(() => {
        setLista({ estado: 'carregando' });
        setVersao((v) => v + 1);
    }, []);
    return [lista, recarregar];
}

function FotoDoPosto({ posto }: { readonly posto: PostoDaRede }) {
    const foto = enderecoDaFoto(posto.foto, urlDaApi());
    return foto === null ? (
        <span className="w-14 h-14 rounded-xl bg-red-900/40 border border-red-800/50 flex items-center justify-center text-red-400 font-bold text-lg shrink-0">
            {iniciais(posto.nome)}
        </span>
    ) : (
        <img src={foto} alt={`Fachada do ${posto.nome}`} className="w-14 h-14 rounded-xl object-cover shrink-0" />
    );
}

export default function EntradaScreen({ aviso, aoEntrar }: Props) {
    const [lista, recarregar] = usePostos();
    const [escolhido, setEscolhido] = useState<number | null>(null);

    return (
        <div className="min-h-screen bg-[#0A0D14] text-slate-100 pb-10">
            <header className="bg-[#D32F2F] px-5 pt-8 pb-10 rounded-b-[2rem]">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-black/20 flex items-center justify-center border border-white/10">
                        <Fuel size={22} className="text-white" aria-hidden="true" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white leading-tight">Encerrante</h1>
                        <p className="text-sm text-white/80">Escolha o posto e entre</p>
                    </div>
                </div>
            </header>

            <main className="px-5 -mt-5 space-y-3">
                {aviso !== null && (
                    <p role="alert" className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-sm font-medium">
                        {aviso}
                    </p>
                )}

                {lista.estado === 'carregando' && (
                    <p className="flex items-center gap-2 text-slate-400 text-sm py-6" role="status">
                        <Loader2 size={18} className="animate-spin" aria-hidden="true" /> Carregando os postos…
                    </p>
                )}

                {lista.estado === 'falhou' && (
                    <div role="alert" className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm space-y-2">
                        <p>Não foi possível carregar os postos. Confira a internet.</p>
                        <button type="button" onClick={recarregar} className="font-semibold underline underline-offset-4">
                            Tentar de novo
                        </button>
                    </div>
                )}

                {lista.estado === 'pronta' && lista.postos.length === 0 && (
                    <p className="text-slate-400 text-sm italic py-6">Nenhum posto ativo na rede.</p>
                )}

                {lista.estado === 'pronta' &&
                    lista.postos.map((posto) => {
                        const selecionado = escolhido === posto.id;
                        return (
                            <section
                                key={posto.id}
                                className={`bg-[#131722] rounded-2xl p-4 border ${selecionado ? 'border-red-500/70' : 'border-slate-800/60'}`}
                            >
                                <button
                                    type="button"
                                    onClick={() => setEscolhido(posto.id)}
                                    aria-pressed={selecionado}
                                    aria-label={`Entrar no ${posto.nome}`}
                                    className="w-full flex items-center gap-4 text-left"
                                >
                                    <FotoDoPosto posto={posto} />
                                    <span className="flex-1 min-w-0 font-bold text-lg text-white truncate">{posto.nome}</span>
                                </button>
                                {selecionado && <FormularioDoPosto posto={posto} aoEntrar={(usuario) => aoEntrar(posto, usuario)} />}
                            </section>
                        );
                    })}
            </main>
        </div>
    );
}
