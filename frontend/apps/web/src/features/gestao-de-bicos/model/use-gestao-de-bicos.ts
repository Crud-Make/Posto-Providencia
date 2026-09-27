import { useCallback, useEffect, useState } from 'react';
import type { ResultAsync } from 'neverthrow';
import { descreverErroDaApi, type ErroDaApi } from '@/services/api/base';
import {
    gravarBicoNaApi,
    gravarBombaNaApi,
    lerPistaDaApi,
    type BicoDeclarado,
    type BombaDeclarada,
    type PistaDaApi,
} from '../api/cadastro-de-bicos.api';

/** Recusa de regra do servidor chega com a frase pronta para o gerente; o resto vira diagnóstico. */
export function mensagemDoErro(erro: ErroDaApi): string {
    return erro.tipo === 'recusado' ? erro.mensagem : descreverErroDaApi(erro);
}

export interface GestaoDeBicos {
    readonly pista: PistaDaApi | null;
    readonly carregando: boolean;
    readonly erro: string | null;
    /** Grava e recarrega a pista; devolve a mensagem da recusa, ou `null` se gravou. */
    readonly gravarBomba: (id: number | null, corpo: BombaDeclarada) => Promise<string | null>;
    readonly gravarBico: (id: number | null, corpo: BicoDeclarado) => Promise<string | null>;
}

/** O catálogo da pista do posto e as escritas dele, todos pela API (#153). */
export function useGestaoDeBicos(postoId: number | null): GestaoDeBicos {
    const [pista, setPista] = useState<PistaDaApi | null>(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    // Cada gravação bem-sucedida sobe a versão, e o effect relê a pista.
    const [versao, setVersao] = useState(0);

    useEffect(() => {
        if (postoId === null) return undefined;
        let vivo = true;
        void lerPistaDaApi(postoId).match(
            (dados) => {
                if (!vivo) return;
                setPista(dados);
                setErro(null);
                setCarregando(false);
            },
            (e) => {
                if (!vivo) return;
                setErro(mensagemDoErro(e));
                setCarregando(false);
            },
        );
        return () => { vivo = false; };
    }, [postoId, versao]);

    const gravar = useCallback(async <T,>(escrita: (posto: number) => ResultAsync<T, ErroDaApi>): Promise<string | null> => {
        if (postoId === null) return 'Nenhum posto escolhido.';
        const gravado = await escrita(postoId);
        if (gravado.isErr()) return mensagemDoErro(gravado.error);
        setVersao((v) => v + 1);
        return null;
    }, [postoId]);

    const gravarBomba = useCallback(
        (id: number | null, corpo: BombaDeclarada) => gravar((posto) => gravarBombaNaApi(posto, id, corpo)),
        [gravar],
    );
    const gravarBico = useCallback(
        (id: number | null, corpo: BicoDeclarado) => gravar((posto) => gravarBicoNaApi(posto, id, corpo)),
        [gravar],
    );

    return { pista, carregando, erro, gravarBomba, gravarBico };
}
