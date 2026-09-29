import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { mensagemDaTrocaDeFoto, TAMANHO_MAXIMO_DA_FOTO, trocarFotoComSenha } from '../../services/api/foto-do-posto.api';
import { mensagemDeFoto, reduzirFoto } from '../../shared/lib/reduzir-foto';
import { emailLembrado, lembrarEmail } from './email-lembrado';

interface Props {
  postoId: number;
  nome: string;
  /** A foto já escolhida no lápis do cartão. */
  arquivo: File;
  aoTrocar: (caminhoDaFoto: string | null) => void;
  aoFechar: () => void;
}

const CLASSE_CAMPO = 'block h-11 w-full rounded-lg border px-3 text-[15px] focus:outline-none focus:ring-[3px] focus:ring-marca-vermelho/25';
const ESTILO_CAMPO = { background: 'var(--fundo)', borderColor: 'var(--borda-cartao)', color: 'var(--texto)' } as const;

/** A prévia da foto escolhida; o endereço temporário é liberado ao fechar. */
function usePrevia(arquivo: File): string {
  const url = useMemo(() => URL.createObjectURL(arquivo), [arquivo]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return url;
}

/**
 * Confirma a troca da foto do posto pelo lápis do cartão (pedido do dono, 27/09/2026): a foto já foi
 * escolhida, falta só a senha do gerente — o e-mail vem lembrado daquele posto quando o aparelho já
 * entrou nele. A senha vale só para esta troca: não entra no painel, nada fica guardado além do e-mail.
 */
const TrocarFotoNoCartao: React.FC<Props> = ({ postoId, nome, arquivo, aoTrocar, aoFechar }) => {
  const [lembrado, setLembrado] = useState(() => emailLembrado(postoId));
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const previa = usePrevia(arquivo);

  const aoEnviar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const email = (lembrado ?? String(dados.get('email') ?? '')).trim();
    const senha = String(dados.get('senha') ?? '');
    if (email === '' || senha === '') return setErro(lembrado === null ? 'Informe o e-mail e a senha do gerente.' : 'Informe a senha.');

    setErro(null);
    setEnviando(true);
    await reduzirFoto(arquivo, TAMANHO_MAXIMO_DA_FOTO)
      .mapErr(mensagemDeFoto)
      .andThen((foto) => trocarFotoComSenha(postoId, email, senha, foto).mapErr(mensagemDaTrocaDeFoto))
      .match((caminho) => {
        lembrarEmail(postoId, email);
        aoTrocar(caminho);
      }, setErro);
    setEnviando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" onClick={aoFechar}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label={`Trocar a foto do ${nome}`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void aoEnviar(e)}
        className="flex w-full max-w-md flex-col gap-4 rounded-2xl border p-5"
        style={{ background: 'var(--painel)', borderColor: 'var(--borda-cartao)', color: 'var(--texto)' }}
        noValidate
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Nova foto do {nome}</h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-lg p-1.5 hover:opacity-70">
            <X className="h-5 w-5" />
          </button>
        </div>

        <img src={previa} alt="Prévia da foto nova" className="h-40 w-full rounded-xl object-cover" />

        {lembrado === null ? (
          <input name="email" type="email" autoComplete="username" placeholder="E-mail do gerente" aria-label="E-mail do gerente" className={CLASSE_CAMPO} style={ESTILO_CAMPO} />
        ) : (
          <p className="flex items-center justify-between gap-3 text-sm" style={{ color: 'var(--texto-medio)' }}>
            <span className="min-w-0 truncate">
              Como <strong style={{ color: 'var(--texto)' }}>{lembrado}</strong>
            </span>
            <button type="button" onClick={() => setLembrado(null)} className="shrink-0 font-semibold hover:underline" style={{ color: 'var(--acento)' }}>
              Trocar
            </button>
          </p>
        )}
        <input name="senha" type="password" autoComplete="current-password" placeholder="Senha" aria-label="Senha" autoFocus className={CLASSE_CAMPO} style={ESTILO_CAMPO} />

        {erro !== null && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {erro}
          </p>
        )}

        <button type="submit" disabled={enviando} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#A30E19] font-semibold text-white disabled:opacity-60">
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
          {enviando ? 'Enviando…' : 'Trocar foto'}
        </button>
      </form>
    </div>
  );
};

export default TrocarFotoNoCartao;
