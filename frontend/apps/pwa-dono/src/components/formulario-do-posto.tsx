import { useId, useState, type FormEvent } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import { entrarNoPosto, mensagemDaEntrada, type PerfilDaApi, type PostoDaRede } from '../api/entrada';
import { esquecerLogin, lembrarLogin, loginLembrado } from '../lib/login-lembrado';

interface Props {
    readonly posto: PostoDaRede;
    readonly aoEntrar: (usuario: PerfilDaApi) => void;
}

const CLASSE_CAMPO =
    'w-full bg-black/30 text-white rounded-xl px-4 py-3 border border-slate-700 text-base ' +
    'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/60';

/**
 * Usuário e senha da conta DO posto escolhido, dentro do cartão dele.
 *
 * @remarks O usuário fica lembrado por posto (só ele); aparelho que nunca entrou ali pede o usuário
 *          uma vez. Conta de outro posto é recusada com a frase que diz qual posto foi escolhido —
 *          e o usuário lembrado é esquecido, para a próxima entrada perguntar de novo.
 */
export default function FormularioDoPosto({ posto, aoEntrar }: Props) {
    const id = useId();
    const [lembrado, setLembrado] = useState<string | null>(() => loginLembrado(posto.id));
    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState<string | null>(null);
    const [enviando, setEnviando] = useState(false);

    const trocarConta = () => {
        esquecerLogin(posto.id);
        setLembrado(null);
        setErro(null);
    };

    const enviar = async (evento: FormEvent<HTMLFormElement>) => {
        evento.preventDefault();
        const login = (lembrado ?? usuario).trim();
        if (login === '') return setErro('Informe o usuário.');
        if (senha === '') return setErro('Informe a senha.');

        setErro(null);
        setEnviando(true);
        const resultado = await entrarNoPosto(posto, login, senha);
        setEnviando(false);
        resultado.match(
            (perfil) => {
                lembrarLogin(posto.id, login);
                aoEntrar(perfil);
            },
            (falha) => {
                if (falha.tipo === 'conta_de_outro_posto') trocarConta();
                setSenha('');
                setErro(mensagemDaEntrada(falha));
            },
        );
    };

    return (
        <form onSubmit={(e) => void enviar(e)} noValidate className="mt-3 space-y-3" aria-label={`Entrar no ${posto.nome}`}>
            {lembrado === null ? (
                <div>
                    <label htmlFor={`${id}-usuario`} className="block text-xs font-semibold text-slate-400 mb-1">
                        Usuário
                    </label>
                    <input
                        id={`${id}-usuario`}
                        name="usuario"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        className={CLASSE_CAMPO}
                        autoFocus
                    />
                </div>
            ) : (
                <p className="text-sm text-slate-300">
                    Entrando como <strong className="text-white">{lembrado}</strong>
                </p>
            )}

            <div>
                <label htmlFor={`${id}-senha`} className="block text-xs font-semibold text-slate-400 mb-1">
                    Senha
                </label>
                <input
                    id={`${id}-senha`}
                    name="senha"
                    type="password"
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className={CLASSE_CAMPO}
                    autoFocus={lembrado !== null}
                />
            </div>

            {erro !== null && (
                <p role="alert" className="text-sm font-medium text-red-300">
                    {erro}
                </p>
            )}

            <button
                type="submit"
                disabled={enviando}
                className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-white bg-[#D32F2F] active:bg-red-800 disabled:opacity-60"
            >
                {enviando ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
                {enviando ? 'Entrando…' : 'Entrar'}
            </button>

            {lembrado !== null && (
                <button type="button" onClick={trocarConta} className="w-full text-sm text-slate-400 underline-offset-4 hover:underline">
                    Entrar com outra conta
                </button>
            )}
        </form>
    );
}
