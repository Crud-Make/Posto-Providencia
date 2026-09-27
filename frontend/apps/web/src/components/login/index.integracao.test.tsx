import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { errAsync, okAsync, ResultAsync } from 'neverthrow';

/**
 * A tela de entrada com os provedores DE VERDADE (Auth + Posto), só a rede simulada. O teste irmão
 * (`index.test.tsx`) simula `useAuth` e `usePosto` e por isso não via o defeito do ensaio de 27/09: o
 * posto era marcado dentro do envio do formulário (action do React 19) e chegava depois do usuário;
 * nesse meio-tempo a tela recusava a conta como "de outro posto" e chamava `/api/sair`.
 */

const JORRO = { id: 1, nome: 'Posto Jorro' };
const BR = { id: 2, nome: 'Posto BR' };

const rede = {
    postosDoLogin: [JORRO] as { id: number; nome: string }[],
    sair: vi.fn(() => okAsync(null)),
};

vi.mock('../../services/api/base', () => ({ loginPelaApiLigado: () => true }));
vi.mock('../../services/api/token-da-api', () => ({ lerTokenDaApi: () => null }));
vi.mock('../../contexts/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('../../services/api/sessao.api', () => ({
    postosDaRede: () => okAsync([JORRO, BR]),
    // A resposta chega depois de um `await` de rede, como no navegador.
    entrarNaApi: () =>
        ResultAsync.fromSafePromise(
            new Promise((resolver) => setTimeout(resolver, 5)).then(() => ({
                id: 7,
                nome: 'Elias',
                email: 'elias@ensaio.local',
                role: 'GERENTE',
                postos: rede.postosDoLogin.map((p) => ({ ...p, papel: 'GERENTE' })),
            })),
        ),
    perfilDaSessao: () => errAsync({ tipo: 'rede' }),
    sairDaApi: () => rede.sair(),
    mensagemDoLogin: () => 'E-mail ou senha incorretos.',
}));

const { AuthProvider } = await import('../../contexts/AuthContext');
const { PostoProvider } = await import('../../contexts/PostoContext');
const { usePosto } = await import('../../contexts/usePosto');
const { default: TelaDeEntrada } = await import('./index');

const Sonda = () => <output data-testid="posto-ativo">{usePosto().postoAtivo?.nome ?? ''}</output>;

function postoAtivo(): string {
    return div.querySelector('[data-testid="posto-ativo"]')?.textContent ?? '';
}

let raiz: Root;
let div: HTMLDivElement;

async function montar(): Promise<void> {
    div = document.createElement('div');
    document.body.appendChild(div);
    raiz = createRoot(div);
    await act(async () =>
        raiz.render(
            <AuthProvider>
                <PostoProvider>
                    <TelaDeEntrada />
                    <Sonda />
                </PostoProvider>
            </AuthProvider>,
        ),
    );
}

function botao(texto: string): HTMLButtonElement {
    const achado = [...div.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(texto));
    if (achado === undefined) throw new Error(`sem botão "${texto}"`);
    return achado;
}

function campo(nome: string): HTMLInputElement {
    const achado = div.querySelector<HTMLInputElement>(`input[name="${nome}"]`);
    if (achado === null) throw new Error(`sem campo "${nome}"`);
    return achado;
}

async function entrarNoCartao(posto: string): Promise<void> {
    await act(async () => botao(posto).click());
    campo('email').value = 'elias@ensaio.local';
    campo('senha').value = 'testes';
    await act(async () => {
        div.querySelector('form')?.requestSubmit();
        await new Promise((resolver) => setTimeout(resolver, 30));
    });
}

beforeEach(() => {
    rede.sair.mockClear();
});
afterEach(() => {
    act(() => raiz.unmount());
    div.remove();
});

describe('TelaDeEntrada com os provedores de verdade', () => {
    it('conta do posto escolhido entra e FICA: nada de /api/sair', async () => {
        rede.postosDoLogin = [JORRO];
        await montar();
        await entrarNoCartao('Posto Jorro');

        expect(rede.sair).not.toHaveBeenCalled();
        expect(postoAtivo()).toBe('Posto Jorro');
    });

    it('conta de outro posto é recusada e sai', async () => {
        rede.postosDoLogin = [BR];
        await montar();
        await entrarNoCartao('Posto Jorro');

        expect(rede.sair).toHaveBeenCalledTimes(1);
        expect(div.textContent).toContain('Esta conta não é do Posto Jorro.');
    });
});
