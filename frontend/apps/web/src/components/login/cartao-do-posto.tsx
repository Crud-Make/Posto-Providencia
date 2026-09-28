import React, { useRef } from 'react';
import { ArrowRight, Check, Pencil } from 'lucide-react';
import { fotoDoPosto, iniciaisDoPosto } from './escolha-de-posto-estilo';

interface Props {
  id: number;
  nome: string;
  /** Caminho versionado da foto na API (`GET /api/postos`), ou `null`. */
  caminhoDaFoto: string | null;
  selecionado: boolean;
  aoEscolher: () => void;
  /** A ✏️ no canto da foto abre a galeria/câmera; a foto escolhida vem para cá (27/09/2026). */
  aoEscolherFoto: (arquivo: File) => void;
}

/** Um posto na tela de entrada: foto (ou as iniciais), nome e "Entrar". Marcado quando escolhido. */
const CartaoDoPosto: React.FC<Props> = ({ id, nome, caminhoDaFoto, selecionado, aoEscolher, aoEscolherFoto }) => {
  const seletor = useRef<HTMLInputElement>(null);
  const foto = fotoDoPosto(id, caminhoDaFoto);
  // A ✏️ é irmã do cartão, não filha: botão dentro de botão não é HTML válido e o toque iria para os dois.
  return (
    <div className="relative">
    <button
      type="button"
      onClick={aoEscolher}
      aria-pressed={selecionado}
      className="flex w-full flex-col overflow-hidden rounded-2xl border-2 text-left transition duration-150 hover:-translate-y-0.5 hover:shadow-xl hover:[border-color:var(--acento)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-[3px] focus-visible:[outline-color:var(--azul)]"
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
    <button
      type="button"
      onClick={() => seletor.current?.click()}
      title="Trocar a foto do posto"
      aria-label={`Trocar a foto do ${nome}`}
      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white shadow-md backdrop-blur-sm transition hover:bg-black/75 focus-visible:outline focus-visible:outline-[3px] focus-visible:[outline-color:var(--azul)]"
    >
      <Pencil className="h-4 w-4" aria-hidden="true" />
    </button>
    <input
      ref={seletor}
      type="file"
      accept="image/*"
      className="hidden"
      aria-hidden="true"
      tabIndex={-1}
      onChange={(evento) => {
        const arquivo = evento.target.files?.[0];
        evento.target.value = '';
        if (arquivo !== undefined) aoEscolherFoto(arquivo);
      }}
    />
    </div>
  );
};

export default CartaoDoPosto;
