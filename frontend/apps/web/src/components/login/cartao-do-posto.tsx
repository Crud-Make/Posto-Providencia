import React, { useRef } from 'react';
import { ArrowRight, Pencil } from 'lucide-react';
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
  /** O que o cartão mostra no lugar do nome quando é o escolhido: a senha. */
  children?: React.ReactNode;
}

/**
 * Um posto na tela de entrada (desenho aprovado em 28/09/2026): cartão deitado, foto à esquerda com a
 * ✏️, nome e "Entrar" à direita. Escolhido, o nome dá lugar à senha e o contorno fica amarelo.
 *
 * @remarks A ✏️ e o nome são botões IRMÃOS: botão dentro de botão não é HTML válido e o toque iria para
 *          os dois.
 */
const CartaoDoPosto: React.FC<Props> = ({ id, nome, caminhoDaFoto, selecionado, aoEscolher, aoEscolherFoto, children }) => {
  const seletor = useRef<HTMLInputElement>(null);
  const foto = fotoDoPosto(id, caminhoDaFoto);

  return (
    <div
      className="relative flex w-full overflow-hidden rounded-2xl bg-[var(--cartao)] text-[var(--texto)] shadow-[0_16px_34px_rgba(19,41,75,0.3)] sm:w-[320px]"
      style={{ outline: selecionado ? '3px solid #E5BE41' : '3px solid transparent' }}
    >
      <div className="relative h-[108px] w-[112px] shrink-0 bg-[#2A9C98]">
        {foto === null ? (
          <span className="flex h-full w-full items-center justify-center font-display text-5xl font-bold text-white">{iniciaisDoPosto(nome)}</span>
        ) : (
          <img src={foto} alt={`Fachada do ${nome}`} className="h-full w-full object-cover" />
        )}
        <button
          type="button"
          onClick={() => seletor.current?.click()}
          title="Trocar a foto do posto"
          aria-label={`Trocar a foto do ${nome}`}
          className="absolute left-1.5 top-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-[#13294B]/75 text-white transition hover:bg-[#13294B] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#E5BE41]"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {selecionado ? (
        children
      ) : (
        <button
          type="button"
          onClick={aoEscolher}
          aria-pressed={false}
          className="flex min-w-0 flex-1 flex-col justify-between px-4 py-3 text-left transition hover:bg-[var(--fundo)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-[#2A9C98]"
        >
          <span className="truncate font-display text-[26px] font-bold leading-none">{nome}</span>
          <span className="flex items-center gap-1.5 self-end rounded-full bg-[var(--texto)] px-3.5 py-2 text-sm font-bold text-[var(--cartao)]">
            Entrar <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </button>
      )}

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
