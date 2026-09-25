/**
 * Hook do bloco "Trabalhando agora".
 *
 * @remarks
 * **Por que sondagem e não Realtime.** O que muda aqui não é só o dado do banco:
 * é a passagem do tempo. Mesmo que ninguém escreva nada, "há 2 min" precisa
 * virar "há 3 min" sozinho, senão a tela mente enquanto o dono olha para ela.
 * Uma subscrição de Realtime não dispara evento nenhum nesse caso — daria o
 * trabalho de gerenciar canal (e o risco de vazar conexão, CLAUDE.md §5) e
 * ainda exigiria um timer por cima. Uma sondagem curta resolve os dois.
 */
import { useCallback, useEffect, useState } from 'react';
import { presencasRelevantes, type PresencaFrentista } from '@posto/utils';
import { presencaService } from '../../../services/api';
import { corteDaTelaLigado } from '../../../services/api/base';
import { presencasDaApi } from '../../../services/api/dashboard-cadastro.api';
import { isSuccess } from '../../../types/ui/response-types';

/** De quanto em quanto tempo o painel relê e reavalia os textos de tempo. */
const INTERVALO_SONDAGEM_MS = 30_000;

interface EstadoPresenca {
  readonly presencas: readonly PresencaFrentista[];
  /** Instante da última avaliação — é o `agora` que as funções puras recebem. */
  readonly agora: Date;
  readonly carregando: boolean;
}

export function usePresencaFrentistas(postoId?: number): EstadoPresenca {
  const [presencas, setPresencas] = useState<readonly PresencaFrentista[]>([]);
  const [agora, setAgora] = useState(() => new Date());
  const [carregando, setCarregando] = useState(true);

  const buscar = useCallback(async () => {
    // Com a tela na API (#100 fatia 3), a presença vem de `GET /presencas` — rota com login, que
    // leva a foto; sem posto não há rota, e fica o caminho de sempre.
    const resposta = corteDaTelaLigado(import.meta.env.VITE_API_DASHBOARD) && postoId !== undefined
      ? await presencasDaApi(postoId)
      : await presencaService.getAll(postoId);
    const momento = new Date();

    // Erro não limpa a lista: manter o último estado conhecido é melhor que
    // piscar "ninguém trabalhando" por causa de um engasgo de rede.
    if (isSuccess(resposta)) setPresencas(presencasRelevantes(resposta.data, momento));

    setAgora(momento);
    setCarregando(false);
  }, [postoId]);

  useEffect(() => {
    let vivo = true;

    const ciclo = () => { if (vivo) void buscar(); };

    ciclo();
    const timer = setInterval(ciclo, INTERVALO_SONDAGEM_MS);

    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, [buscar]);

  return { presencas, agora, carregando };
}
