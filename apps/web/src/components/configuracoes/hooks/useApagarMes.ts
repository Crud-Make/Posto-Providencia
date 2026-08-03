/**
 * Estado do "apagar um mês de movimento".
 *
 * @remarks
 * Conta ANTES de apagar para o dono ver o tamanho do estrago que está
 * autorizando, e devolve o resultado da recontagem depois — que é a única prova
 * de que algo saiu (ver `limpezaMes.service.ts`).
 */
import { useCallback, useEffect, useState } from 'react';
import { limpezaMesService, type ContagemDoMes, type ResultadoLimpeza } from '../../../services/api';
import { isSuccess } from '../../../types/ui/response-types';

interface EstadoApagarMes {
  readonly mes: string;
  readonly definirMes: (mes: string) => void;
  readonly contagem: ContagemDoMes | null;
  readonly contando: boolean;
  readonly apagando: boolean;
  readonly resultado: ResultadoLimpeza | null;
  readonly erro: string | null;
  readonly apagar: () => Promise<void>;
  readonly limpar: () => void;
}

/** `aaaa-mm` do mês corrente, no fuso local. */
function mesCorrente(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`;
}

export function useApagarMes(postoId: number | undefined, aberto: boolean): EstadoApagarMes {
  const [mes, setMes] = useState(mesCorrente);
  const [contagem, setContagem] = useState<ContagemDoMes | null>(null);
  const [contando, setContando] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoLimpeza | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Recontar a cada troca de mês é o que impede o dono de confirmar olhando o
  // número do mês anterior.
  useEffect(() => {
    if (!aberto || !mes) return;

    let vivo = true;

    // Os `setState` moram aqui dentro, e não no corpo do efeito, porque
    // `react-hooks/set-state-in-effect` proíbe o corpo — a regra existe para
    // evitar render em cascata, e uma função assíncrona já sai desse caminho.
    const carregar = async () => {
      setContando(true);
      setResultado(null);
      setErro(null);

      const resposta = await limpezaMesService.contarDoMes(mes, postoId);
      if (!vivo) return;

      if (isSuccess(resposta)) setContagem(resposta.data);
      else { setContagem(null); setErro(resposta.error); }
      setContando(false);
    };

    void carregar();

    return () => { vivo = false; };
  }, [mes, postoId, aberto]);

  const apagar = useCallback(async () => {
    setApagando(true);
    setErro(null);

    const resposta = await limpezaMesService.apagarMes(mes, postoId);
    if (isSuccess(resposta)) {
      setResultado(resposta.data);
      setContagem(resposta.data.depois);
    } else {
      setErro(resposta.error);
    }

    setApagando(false);
  }, [mes, postoId]);

  const limpar = useCallback(() => {
    setResultado(null);
    setErro(null);
  }, []);

  const definirMes = useCallback((novo: string) => setMes(novo), []);

  return { mes, definirMes, contagem, contando, apagando, resultado, erro, apagar, limpar };
}
