import React from 'react';
import { Fuel, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { usePosto } from '../../contexts/usePosto';

/**
 * "Em qual posto você quer entrar?" — aparece depois do login pela API (#102) quando a conta tem
 * mais de um posto da rede e ainda não escolheu. Cada posto vê só o próprio dado; trocar depois é
 * pelo seletor do cabeçalho.
 *
 * @remarks Conta sem nenhum posto (vínculo ainda não criado) vê o aviso e o botão de sair, nunca
 *          um painel vazio que pareça "posto sem movimento".
 */
const TelaEscolherPosto: React.FC = () => {
  const { usuario, sair } = useAuth();
  const { postos, setPostoAtivo } = usePosto();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-6 py-8 text-white">
      <div className="w-full max-w-[420px]">
        <img src="/logo-login.jpg" alt="Rede Providência" className="mx-auto h-auto w-[96px] select-none rounded-xl" />
        <h1 className="mt-6 text-center font-display text-[24px] font-bold tracking-tight text-balance">
          {postos.length === 0 ? 'Sua conta ainda não tem posto' : 'Em qual posto você quer entrar?'}
        </h1>
        <p className="mt-1.5 text-center text-[14px] font-medium text-slate-400">
          {postos.length === 0
            ? 'Peça ao administrador para ligar a sua conta a um posto.'
            : `Olá, ${usuario?.nome ?? ''}. Cada posto mostra só o próprio movimento.`}
        </p>

        <ul className="mt-8 flex flex-col gap-3">
          {postos.map((posto) => (
            <li key={posto.id}>
              <button
                type="button"
                onClick={() => setPostoAtivo(posto)}
                className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-slate-800 px-4 py-4 text-left text-[16px] font-semibold transition-colors duration-150 hover:border-marca-vermelho/60 hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-marca-vermelho/40"
              >
                <Fuel className="h-5 w-5 shrink-0 text-marca-vermelho" aria-hidden="true" />
                {posto.nome}
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() => void sair()}
          className="mx-auto mt-8 flex items-center gap-2 text-[13px] font-medium text-slate-400 transition-colors duration-150 hover:text-slate-200 focus-visible:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-marca-vermelho/40"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </button>
      </div>
    </main>
  );
};

export default TelaEscolherPosto;
