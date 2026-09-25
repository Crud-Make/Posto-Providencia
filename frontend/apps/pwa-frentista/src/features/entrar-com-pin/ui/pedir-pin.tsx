import { useState } from 'react';
import { entrarComPin } from '@frentista/entities/sessao-do-frentista';
import { FORMATO_DO_PIN, mensagemDoLogin } from '../model/mensagem-do-login';

interface PedirPinProps {
  postoId: number;
  frentista: { id: number; nome: string };
  /** A sessão já foi guardada no aparelho; quem chama só segue o fluxo. */
  aoEntrar: () => void;
  aoCancelar: () => void;
}

/**
 * Pede o PIN do frentista escolhido (#101 — PIN por frentista, decisão do dono de 19/09/2026).
 *
 * @remarks Aparece ao escolher o frentista na lista e quando a sessão vence no meio do turno.
 *          Só dígitos, teclado numérico, sem eco. O PIN nunca é guardado: o que fica no aparelho
 *          é o token da sessão, que vence no fim do turno.
 */
export const PedirPin = ({ postoId, frentista, aoEntrar, aoCancelar }: PedirPinProps) => {
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  const entrar = (): void => {
    if (!FORMATO_DO_PIN.test(pin)) {
      setErro('O PIN tem de 4 a 6 números.');
      return;
    }
    setEntrando(true);
    void entrarComPin(postoId, frentista.id, pin).match(
      () => { setEntrando(false); aoEntrar(); },
      (falha) => { setEntrando(false); setPin(''); setErro(mensagemDoLogin(falha)); },
    );
  };

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center" role="dialog" aria-label={`PIN de ${frentista.nome}`}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={aoCancelar} />
      <form
        className="relative w-full max-w-sm bg-[#10141d] rounded-t-3xl sm:rounded-3xl p-6 border border-slate-800 flex flex-col gap-4"
        onSubmit={(e) => { e.preventDefault(); entrar(); }}
      >
        <h3 className="text-lg font-bold text-white">PIN de {frentista.nome}</h3>
        <input
          aria-label="PIN"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={6}
          value={pin}
          onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setErro(null); }}
          className="w-full bg-[#0A0D14] border border-slate-700 rounded-xl px-4 py-3 text-2xl tracking-[0.5em] text-center text-white outline-none focus:border-indigo-500"
        />
        {erro !== null && <p className="text-red-400 text-sm font-medium">{erro}</p>}
        <div className="flex gap-3">
          <button type="button" onClick={aoCancelar} className="flex-1 py-3 rounded-xl font-bold text-slate-300 bg-slate-800">Cancelar</button>
          <button type="submit" disabled={entrando} className="flex-1 py-3 rounded-xl font-bold text-white bg-indigo-600 disabled:opacity-60">
            {entrando ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
};
