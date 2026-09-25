import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import * as React from 'react';
import type { PerfilDaApi } from '../services/api/sessao.api';
import type { PostoContextType } from './PostoContext';
import { usePostosDaApi } from './usePostosDaApi';

/**
 * Qual posto fica ativo no login pela API (#102). A regra que se prende: nunca abrir num posto que a
 * pessoa não escolheu quando ela tem mais de um — o painel mostraria o movimento de um posto da rede
 * no lugar do outro.
 */

let perfil: PerfilDaApi | null = null;
vi.mock('./useAuth', () => ({ useAuth: () => ({ usuario: perfil, carregando: false }) }));

const JORRO = { id: 1, nome: 'Posto Jorro', papel: 'gerente' };
const BR = { id: 2, nome: 'Posto BR', papel: 'gerente' };

function comPostos(postos: PerfilDaApi['postos']): void {
    perfil = { id: 7, nome: 'Elias', email: 'e@teste.com', role: 'GERENTE', postos };
}

let raiz: Root;
let atual: PostoContextType;

/** Entrega o valor do hook por efeito — escrever em variável de fora durante o render é efeito colateral. */
function Sonda({ aoMudar }: { aoMudar: (valor: PostoContextType) => void }): null {
    const valor = usePostosDaApi();
    React.useEffect(() => aoMudar(valor), [valor, aoMudar]);
    return null;
}

function montar(): void {
    const div = document.createElement('div');
    raiz = createRoot(div);
    act(() =>
        raiz.render(
            <Sonda
                aoMudar={(valor) => {
                    atual = valor;
                }}
            />,
        ),
    );
}

beforeEach(() => localStorage.clear());
afterEach(() => act(() => raiz.unmount()));

describe('usePostosDaApi', () => {
    it('um posto só: entra direto nele', () => {
        comPostos([JORRO]);
        montar();
        expect(atual.postoAtivo?.nome).toBe('Posto Jorro');
        expect(atual.postoAtivoId).toBe(1);
    });

    it('dois postos e nenhuma escolha: nenhum ativo (vai para a tela de escolha)', () => {
        comPostos([JORRO, BR]);
        montar();
        expect(atual.postos.map((p) => p.nome)).toEqual(['Posto Jorro', 'Posto BR']);
        expect(atual.postoAtivo).toBeNull();
    });

    it('escolher o BR ativa o BR e lembra a escolha', () => {
        comPostos([JORRO, BR]);
        montar();
        act(() => atual.setPostoAtivoById(2));
        expect(atual.postoAtivo?.nome).toBe('Posto BR');
        expect(localStorage.getItem('postoAtivoId')).toBe('2');
    });

    it('escolha guardada de um posto que a conta NÃO tem é ignorada', () => {
        localStorage.setItem('postoAtivoId', '99');
        comPostos([JORRO, BR]);
        montar();
        expect(atual.postoAtivo).toBeNull();
        act(() => atual.setPostoAtivoById(99));
        expect(atual.postoAtivo).toBeNull();
    });

    it('conta sem posto: lista vazia e nenhum ativo', () => {
        comPostos([]);
        montar();
        expect(atual.postos).toEqual([]);
        expect(atual.postoAtivo).toBeNull();
    });
});
