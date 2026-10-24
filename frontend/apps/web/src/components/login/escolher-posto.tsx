import React from 'react';
import { ArrowRight, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import { usePosto } from '../../contexts/usePosto';
import { useTheme } from '../../contexts/useTheme';
import type { Posto } from '../../types/database/index';
import { fotoDoPosto, fraseDoDia, iniciaisDoPosto, saudacao, variaveisDoTema } from './escolha-de-posto-estilo';

const FAIXA = ['#042992', '#A30E19', '#E5BE41'] as const;

const FaixaDaMarca: React.FC = () => (
  <div className="absolute inset-x-0 top-0 grid h-1.5 grid-cols-3" aria-hidden="true">
    {FAIXA.map((cor) => (
      <div key={cor} style={{ background: cor }} />
    ))}
  </div>
);

const CartaoDoPosto: React.FC<{ posto: Posto; papel: string; aoEscolher: () => void }> = ({ posto, papel, aoEscolher }) => {
  const foto = fotoDoPosto(posto.id);
  return (
    <button
      type="button"
      onClick={aoEscolher}
      className="flex flex-col overflow-hidden rounded-2xl border text-left transition duration-150 hover:-translate-y-0.5 hover:shadow-xl hover:[border-color:var(--acento)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:[outline-color:var(--azul)]"
      style={{ background: 'var(--cartao)', borderColor: 'var(--borda-cartao)' }}
    >
      <div className="relative h-36 w-full sm:h-52">
        {foto === null ? (
          <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--azul-fundo)' }}>
            <span className="font-display text-5xl font-bold" style={{ color: 'var(--azul)' }}>
              {iniciaisDoPosto(posto.nome)}
            </span>
          </div>
        ) : (
          <img src={foto} alt={`Fachada do ${posto.nome}`} className="h-full w-full object-cover" />
        )}
        <span className="absolute right-3 top-3 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#042992]">
          {papel}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5">
        <span className="whitespace-nowrap font-display text-xl font-semibold" style={{ color: 'var(--texto)' }}>
          {posto.nome}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-bold" style={{ color: 'var(--acento)' }}>
          Entrar
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </button>
  );
};

/**
 * "Escolha o posto para começar" — aparece só para quem tem mais de um posto da rede (desde
 * 27/09/2026 cada posto tem contas próprias; na prática, o ADMIN). Redesenho do canvas de 27/09:
 * logo nova, frase do dia, foto do posto no cartão, modo claro e escuro.
 */
const TelaEscolherPosto: React.FC = () => {
  const { usuario, sair } = useAuth();
  const { postos, setPostoAtivo } = usePosto();
  const { theme, toggleTheme } = useTheme();
  const agora = new Date();
  const papelDe = (id: number): string => usuario?.postos.find((p) => p.id === id)?.papel ?? '';

  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-12" style={{ ...variaveisDoTema(theme), background: 'var(--fundo)', color: 'var(--texto)' }}>
      <FaixaDaMarca />
      <aside className="flex flex-col gap-6 lg:col-span-5 xl:col-span-4 px-5 pb-6 pt-9 lg:justify-between lg:border-r lg:px-10 lg:py-14" style={{ background: 'var(--painel)', borderColor: 'var(--linha)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-xl bg-white px-3 py-2">
            <img src="/logo-providencia.png" alt="Posto Providência" className="h-auto w-44 lg:w-64" />
          </div>
          <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'} className="flex h-11 w-11 items-center justify-center rounded-xl border" style={{ borderColor: 'var(--borda-botao)', background: 'var(--botao)', color: 'var(--texto-medio)' }}>
            {theme === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--acento)' }}>{saudacao(agora, usuario?.nome ?? '')}</span>
          <div className="h-1 w-12 rounded-sm bg-[#E5BE41]" aria-hidden="true" />
          <p className="font-display text-2xl font-semibold leading-tight lg:text-4xl">{fraseDoDia(agora)}</p>
        </div>
        <div className="hidden items-center justify-between gap-4 border-t pt-6 lg:flex" style={{ borderColor: 'var(--linha)' }}>
          <span className="text-sm" style={{ color: 'var(--texto-suave)' }}>{usuario?.email}</span>
          <button type="button" onClick={() => void sair()} className="flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold" style={{ borderColor: 'var(--borda-botao)', background: 'var(--botao)', color: 'var(--texto-medio)' }}>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </aside>
      <main className="flex flex-col justify-center gap-6 lg:col-span-7 xl:col-span-8 px-5 pb-8 lg:px-14 lg:py-16">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-base font-bold lg:font-display lg:text-xl">{postos.length === 0 ? 'Sua conta ainda não tem posto' : 'Escolha o posto para começar'}</h1>
          <span className="whitespace-nowrap text-sm" style={{ color: 'var(--texto-suave)' }}>{postos.length} {postos.length === 1 ? 'posto' : 'postos'}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
          {postos.map((posto) => (
            <CartaoDoPosto key={posto.id} posto={posto} papel={papelDe(posto.id)} aoEscolher={() => setPostoAtivo(posto)} />
          ))}
        </div>
        <p className="text-sm" style={{ color: 'var(--texto-suave)' }}>
          © {agora.getFullYear()} Rede Providência. Todos os direitos reservados.
        </p>
        <button type="button" onClick={() => void sair()} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold lg:hidden" style={{ borderColor: 'var(--borda-botao)', background: 'var(--botao)', color: 'var(--texto-medio)' }}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair
        </button>
      </main>
    </div>
  );
};

export default TelaEscolherPosto;
