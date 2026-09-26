import { useCallback, useRef } from 'react';

/**
 * A chave de idempotência do envio pela API (#101): UMA por tentativa de envio.
 *
 * @remarks Se a rede cai DEPOIS de o servidor gravar, o frentista toca "Enviar" de novo com os
 *          mesmos valores — e a mesma chave faz a API devolver a linha já gravada (200 `repetido`)
 *          em vez de recusar como "já enviado". Mudou qualquer valor (ou a data, ou o frentista), a
 *          assinatura muda e nasce chave nova. `esquecer` roda depois do sucesso.
 */
export function useChaveDoEnvio(gerar: () => string = () => crypto.randomUUID()): {
  chavePara: (assinatura: string) => string;
  esquecer: () => void;
} {
  const atual = useRef<{ assinatura: string; chave: string } | null>(null);

  const chavePara = useCallback((assinatura: string): string => {
    if (atual.current?.assinatura !== assinatura) {
      atual.current = { assinatura, chave: gerar() };
    }
    return atual.current.chave;
  }, [gerar]);

  const esquecer = useCallback((): void => { atual.current = null; }, []);

  return { chavePara, esquecer };
}
