import { useCallback, useEffect, useState } from 'react';
import { buscarPostosAtivos, postoParaEntrar, postosSemRede, type Posto } from '@frentista/entities/posto';
import { esquecerSessao, sessaoEhDoPosto } from '@frentista/entities/sessao-do-frentista';

/** Onde a porta do posto está: esperando a lista, falhou, perguntando, ou dentro de um posto. */
export type EtapaDaEscolha =
  | { readonly etapa: 'carregando' }
  | { readonly etapa: 'erro'; readonly mensagem: string }
  | { readonly etapa: 'perguntar'; readonly postos: readonly Posto[] }
  | { readonly etapa: 'escolhido'; readonly posto: Posto; readonly postos: readonly Posto[] };

export interface EscolhaDePosto {
  readonly estado: EtapaDaEscolha;
  readonly escolher: (posto: Posto) => void;
  readonly trocar: () => void;
  readonly tentarDeNovo: () => void;
}

/** Descarta a sessão de PIN (e o que o app guarda junto) quando ela não é do posto `postoId`. */
function descartarSessaoDeOutroPosto(postoId: number, aoMudarDePosto: () => void): void {
  if (sessaoEhDoPosto(postoId)) return;
  esquecerSessao();
  aoMudarDePosto();
}

/** Entra em `posto`: a sessão guardada só continua se foi aberta nele. Idempotente. */
function entrar(posto: Posto, postos: readonly Posto[], aoMudarDePosto: () => void): EtapaDaEscolha {
  descartarSessaoDeOutroPosto(posto.id, aoMudarDePosto);
  return { etapa: 'escolhido', posto, postos };
}

/** Com a lista em mãos: um posto só → entra nele; dois ou mais → pergunta. */
function resolver(postos: readonly Posto[], aoMudarDePosto: () => void): EtapaDaEscolha {
  const posto = postoParaEntrar(postos);
  return posto === null ? { etapa: 'perguntar', postos } : entrar(posto, postos, aoMudarDePosto);
}

/**
 * O posto é escolhido NA HORA, toda vez que o PWA abre (decisão do dono, 27/09/2026 — substituiu o
 * "escolhe na 1ª vez e lembra" de 26/09). Nada de posto guardado no aparelho.
 *
 * @param aoMudarDePosto Chamado quando a sessão de PIN guardada NÃO é do posto escolhido (de outro
 *        posto, ou de antes de a sessão levar o posto) e na troca de posto: quem usa apaga o que não
 *        é da sessão mas anda com ela (o frentista selecionado no `App`). A sessão em si é apagada
 *        aqui. Tem de ser estável (função de módulo ou `useCallback`): a leitura da lista depende dela.
 *
 * @remarks Sessão aberta no MESMO posto escolhido agora continua valendo: reabrir o app e escolher o
 *          mesmo posto não pede o PIN de novo. Sem a API (instalação Supabase, um posto só) a
 *          resolução é síncrona: o app abre no primeiro render, como antes.
 */
export function useEscolhaDePosto(aoMudarDePosto: () => void): EscolhaDePosto {
  const [estado, setEstado] = useState<EtapaDaEscolha>(() => {
    const locais = postosSemRede();
    return locais === null ? { etapa: 'carregando' } : resolver(locais, aoMudarDePosto);
  });
  const [versao, setVersao] = useState(0);

  useEffect(() => {
    if (postosSemRede() !== null) return undefined;
    let vivo = true;
    void buscarPostosAtivos().match(
      (postos) => { if (vivo) setEstado(resolver(postos, aoMudarDePosto)); },
      (erro) => { if (vivo) setEstado({ etapa: 'erro', mensagem: erro.mensagem }); },
    );
    return () => { vivo = false; };
  }, [versao, aoMudarDePosto]);

  const escolher = useCallback((posto: Posto) => {
    setEstado(entrar(posto, estado.etapa === 'perguntar' ? estado.postos : [posto], aoMudarDePosto));
  }, [estado, aoMudarDePosto]);

  const trocar = useCallback(() => {
    esquecerSessao();
    aoMudarDePosto();
    setEstado((atual) => (atual.etapa === 'escolhido' ? { etapa: 'perguntar', postos: atual.postos } : atual));
  }, [aoMudarDePosto]);

  const tentarDeNovo = useCallback(() => {
    setEstado({ etapa: 'carregando' });
    setVersao((v) => v + 1);
  }, []);

  return { estado, escolher, trocar, tentarDeNovo };
}
