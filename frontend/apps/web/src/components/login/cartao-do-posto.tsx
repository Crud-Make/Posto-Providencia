import React from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { fotoDoPosto, iniciaisDoPosto } from './escolha-de-posto-estilo';

interface Props {
  id: number;
  nome: string;
  selecionado: boolean;
  aoEscolher: () => void;
}

/** Um posto na tela de entrada: foto (ou as iniciais), nome e "Entrar". Marcado quando escolhido. */
const CartaoDoPosto: React.FC<Props> = ({ id, nome, selecionado, aoEscolher }) => {
  const foto = fotoDoPosto(id);
  return (
    <button
      type="button"
      onClick={aoEscolher}
      aria-pressed={selecionado}
      className="flex flex-col overflow-hidden rounded-2xl border-2 text-left transition duration-150 hover:-translate-y-0.5 hover:shadow-xl hover:[border-color:var(--acento)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:[outline-color:var(--azul)]"
      style={{ background: 'var(--cartao)', borderColor: selecionado ? 'var(--acento)' : 'var(--borda-cartao)' }}
    >
      <div className="relative h-32 w-full sm:h-44">
        {foto === null ? (
          <div className="flex h-full w-full items-center justify-center" style={{ background: 'var(--azul-fundo)' }}>
            <span className="font-display text-5xl font-bold" style={{ color: 'var(--azul)' }}>
              {iniciaisDoPosto(nome)}
            </span>
          </div>
        ) : (
          <img src={foto} alt={`Fachada do ${nome}`} className="h-full w-full object-cover" />
        )}
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="whitespace-nowrap font-display text-xl font-semibold" style={{ color: 'var(--texto)' }}>
          {nome}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm font-bold" style={{ color: 'var(--acento)' }}>
          {selecionado ? 'Escolhido' : 'Entrar'}
          {selecionado ? <Check className="h-5 w-5" aria-hidden="true" /> : <ArrowRight className="h-5 w-5" aria-hidden="true" />}
        </span>
      </div>
    </button>
  );
};

export default CartaoDoPosto;
