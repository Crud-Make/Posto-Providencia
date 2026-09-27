import { useState } from 'react';
import { CriarChave } from './criar-chave';
import { PedirPin } from './pedir-pin';

interface EntrarNoTurnoProps {
  postoId: number;
  /** `temChave: false` (da lista de escolha pela API) abre "Crie sua chave"; senão, o PIN. */
  frentista: { id: number; nome: string; temChave?: boolean | undefined };
  aoEntrar: () => void;
  aoCancelar: () => void;
}

/**
 * O passo depois de tocar no nome (#101): quem ainda não tem chave cria a sua (primeiro acesso,
 * 27/09/2026); quem tem digita o PIN. Se a lista estava velha e a chave já existe (409), cai no PIN
 * com a mensagem do servidor.
 */
export const EntrarNoTurno = ({ postoId, frentista, aoEntrar, aoCancelar }: EntrarNoTurnoProps) => {
  const [criar, setCriar] = useState(frentista.temChave === false);
  const [aviso, setAviso] = useState<string | null>(null);

  if (criar) {
    return (
      <CriarChave
        postoId={postoId}
        frentista={frentista}
        aoEntrar={aoEntrar}
        aoJaTerChave={(mensagem) => { setAviso(mensagem); setCriar(false); }}
        aoCancelar={aoCancelar}
      />
    );
  }
  return <PedirPin postoId={postoId} frentista={frentista} aviso={aviso} aoEntrar={aoEntrar} aoCancelar={aoCancelar} />;
};
