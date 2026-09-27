import { useState, type ChangeEvent } from 'react';
import { criarChave } from '@frentista/entities/sessao-do-frentista';
import { FORMATO_DO_PIN } from '../model/mensagem-do-login';
import { jaTemChave, mensagemDaChave } from '../model/mensagem-da-chave';

interface CriarChaveProps {
  postoId: number;
  frentista: { id: number; nome: string };
  /** A sessão já foi guardada no aparelho; quem chama só segue o fluxo. */
  aoEntrar: () => void;
  /** A API disse que ele já tem chave (409): quem chama passa para a tela do PIN, com a mensagem. */
  aoJaTerChave: (mensagem: string) => void;
  aoCancelar: () => void;
}

const CAMPO = 'w-full bg-[#0A0D14] border border-slate-700 rounded-xl px-4 py-3 text-2xl tracking-[0.5em] text-center text-white outline-none focus:border-indigo-500';

/**
 * "Crie sua chave" — o PRIMEIRO ACESSO do frentista (decisão do dono, 27/09/2026): quem ainda não
 * tem PIN cria o próprio, digitando duas vezes. Teclado numérico, 4 a 6 dígitos, sem eco. Criada a
 * chave, ele já entra (a API devolve a sessão). Zerar a chave é do gerente.
 */
export const CriarChave = ({ postoId, frentista, aoEntrar, aoJaTerChave, aoCancelar }: CriarChaveProps) => {
  const [pin, setPin] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  const criar = (): void => {
    if (!FORMATO_DO_PIN.test(pin)) {
      setErro('A chave tem de 4 a 6 números.');
      return;
    }
    if (confirmacao !== pin) {
      setErro('As duas chaves não são iguais.');
      return;
    }
    setCriando(true);
    void criarChave(postoId, frentista.id, pin, confirmacao).match(
      () => { setCriando(false); aoEntrar(); },
      (falha) => {
        setCriando(false);
        setPin('');
        setConfirmacao('');
        if (jaTemChave(falha)) aoJaTerChave(mensagemDaChave(falha));
        else setErro(mensagemDaChave(falha));
      },
    );
  };

  const digitar = (definir: (valor: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    definir(e.target.value.replace(/\D/g, ''));
    setErro(null);
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center" role="dialog" aria-label={`Chave de ${frentista.nome}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={aoCancelar} />
      <form
        className="relative w-full max-w-sm bg-[#10141d] rounded-t-3xl sm:rounded-3xl p-6 border border-slate-800 flex flex-col gap-4"
        onSubmit={(e) => { e.preventDefault(); criar(); }}
      >
        <h3 className="text-lg font-bold text-white">Crie sua chave, {frentista.nome}</h3>
        <p className="text-sm text-slate-400">De 4 a 6 números. É com ela que você entra em todo turno.</p>
        <input aria-label="Nova chave" type="password" inputMode="numeric" autoComplete="off" autoFocus maxLength={6}
          value={pin} onChange={digitar(setPin)} className={CAMPO} />
        <input aria-label="Confirme a chave" type="password" inputMode="numeric" autoComplete="off" maxLength={6}
          value={confirmacao} onChange={digitar(setConfirmacao)} className={CAMPO} />
        {erro !== null && <p className="text-red-400 text-sm font-medium">{erro}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={aoCancelar} className="flex-1 py-3 rounded-xl font-bold text-slate-300 bg-slate-800">Cancelar</button>
          <button type="submit" disabled={criando} className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 disabled:opacity-60">
            {criando ? 'Criando...' : 'Criar chave'}
          </button>
        </div>
      </form>
    </div>
  );
};
