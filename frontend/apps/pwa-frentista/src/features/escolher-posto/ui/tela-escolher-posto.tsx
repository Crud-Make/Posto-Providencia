import { Moon, Sun } from 'lucide-react';
import type { Posto } from '@frentista/entities/posto';
import { fraseDoDia, saudacao } from '@frentista/shared/lib';
import { CORES_DA_MARCA, useTema, variaveisDoTema, type Tema } from '@frentista/shared/ui';
import { CartaoDoPosto } from './cartao-do-posto';

interface TelaEscolherPostoProps {
  readonly postos: readonly Posto[];
  readonly aoEscolher: (posto: Posto) => void;
  /** Só para teste: a data que decide a frase do dia e a saudação. */
  readonly agora?: Date;
}

const FaixaDaMarca = () => (
  <div className="absolute inset-x-0 top-0 grid h-1.5 grid-cols-3" aria-hidden="true">
    {CORES_DA_MARCA.map((cor) => (
      <div key={cor} style={{ background: cor }} />
    ))}
  </div>
);

const BotaoDoTema = ({ tema, alternar }: { readonly tema: Tema; readonly alternar: () => void }) => (
  <button
    type="button"
    onClick={alternar}
    aria-label={tema === 'dark' ? 'Usar modo claro' : 'Usar modo escuro'}
    className="flex h-11 w-11 items-center justify-center rounded-xl border focus-visible:outline focus-visible:outline-[3px] focus-visible:[outline-color:var(--azul)]"
    style={{ borderColor: 'var(--borda-botao)', background: 'var(--botao)', color: 'var(--texto-medio)' }}
  >
    {tema === 'dark' ? <Sun className="h-5 w-5" aria-hidden="true" /> : <Moon className="h-5 w-5" aria-hidden="true" />}
  </button>
);

/** Logo da rede (numa placa branca também no escuro: o PNG tem fundo branco), tema, saudação e frase do dia. */
const Cabecalho = ({ agora, tema, alternar }: { readonly agora: Date; readonly tema: Tema; readonly alternar: () => void }) => (
  <header className="flex flex-col gap-5">
    <div className="flex items-center justify-between gap-3">
      <div className="rounded-xl bg-white px-3 py-2">
        <img src="/logo-providencia.png" alt="Posto Providência" className="h-auto w-44" />
      </div>
      <BotaoDoTema tema={tema} alternar={alternar} />
    </div>
    <div className="flex flex-col gap-3">
      <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--acento)' }}>{saudacao(agora)}</span>
      <div className="h-1 w-12 rounded-sm bg-[#E5BE41]" aria-hidden="true" />
      <p className="font-display text-2xl font-semibold leading-tight">{fraseDoDia(agora)}</p>
    </div>
  </header>
);

/**
 * A primeira tela do PWA, toda vez que ele abre com dois ou mais postos ativos (#101, decisão do
 * dono de 27/09/2026: escolhe na hora, não guarda). Marca nova da rede, igual à do painel: faixa
 * tricolor, logo, frase do dia, um cartão com foto por posto, tema claro/escuro (começa no do
 * aparelho; o botão sol/lua alterna).
 */
export const TelaEscolherPosto = ({ postos, aoEscolher, agora = new Date() }: TelaEscolherPostoProps) => {
  const { tema, alternar } = useTema();
  return (
    <div
      data-tema={tema}
      className="relative flex min-h-screen flex-col gap-6 px-5 pb-8 pt-9 font-marca"
      style={{ ...variaveisDoTema(tema), background: 'var(--fundo)', color: 'var(--texto)' }}
    >
      <FaixaDaMarca />
      <Cabecalho agora={agora} tema={tema} alternar={alternar} />
      <main className="flex flex-col gap-4">
        <h1 className="text-base font-bold">{postos.length === 0 ? 'Nenhum posto ativo. Fale com o gerente.' : 'Escolha o posto para começar'}</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {postos.map((posto) => (
            <CartaoDoPosto key={posto.id} posto={posto} aoEscolher={aoEscolher} />
          ))}
        </div>
      </main>
      <p className="text-sm" style={{ color: 'var(--texto-suave)' }}>
        © {agora.getFullYear()} Rede Providência. Todos os direitos reservados.
      </p>
    </div>
  );
};
