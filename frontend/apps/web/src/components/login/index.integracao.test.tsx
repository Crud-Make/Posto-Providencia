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
    /** Quem a tela chamou: `['posto', 1, 'elias']` (cartão) ou `['email', 'x@y']`. */
    logins: [] as unknown[][],
};

// A resposta chega depois de um `await` de rede, como no navegador.
const perfilDepoisDaRede = () =>
    ResultAsync.fromSafePromise(
        new Promise((resolver) => setTimeout(resolver, 5)).then(() => ({
            id: 7,
            nome: 'Elias',
            email: 'elias@ensaio.local',
            role: 'GERENTE',
            postos: rede.postosDoLogin.map((p) => ({ ...p, papel: 'GERENTE' })),
        })),
    );

vi.mock('../../services/api/base', () => ({ loginPelaApiLigado: () => true }));
vi.mock('../../services/api/token-da-api', () => ({ lerTokenDaApi: () => null }));
vi.mock('../../contexts/useTheme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('../../services/api/sessao.api', () => ({
    postosDaRede: () => okAsync([JORRO, BR]),
    entrarNaApi: (email: string) => {
        rede.logins.push(['email', email]);
        return perfilDepoisDaRede();
    },
    entrarNoPosto: (postoId: number, usuario: string) => {
        rede.logins.push(['posto', postoId, usuario]);
        return perfilDepoisDaRede();
    },
    perfilDaSessao: () => errAsync({ tipo: 'rede' }),
    sairDaApi: () => rede.sair(),
    mensagemDoLogin: () => 'Usuário ou senha incorretos.',
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

async function entrarNoCartao(posto: string, login = 'elias'): Promise<void> {
    await act(async () => botao(posto).click());
    campo('usuario').value = login;
    campo('senha').value = 'testes';
    await act(async () => {
        div.querySelector('form')?.requestSubmit();
        await new Promise((resolver) => setTimeout(resolver, 30));
    });
}

beforeEach(() => {
    rede.sair.mockClear();
    rede.logins = [];
    localStorage.clear();
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

    it('o usuário digitado no cartão entra NAQUELE posto: "elias" no BR vai com o id do BR', async () => {
        rede.postosDoLogin = [BR];
        await montar();
        await entrarNoCartao('Posto BR', '  elias ');

        expect(rede.logins).toEqual([['posto', 2, 'elias']]);
        expect(postoAtivo()).toBe('Posto BR');
    });

    it('com "@" no campo usuário, entra pelo e-mail (conta sem usuário, como o ADMIN)', async () => {
        rede.postosDoLogin = [JORRO];
        await montar();
        await entrarNoCartao('Posto Jorro', 'admin@ensaio.local');

        expect(rede.logins).toEqual([['email', 'admin@ensaio.local']]);
    });

    it('usuário vazio não chama o servidor e pede o usuário', async () => {
        await montar();
        await entrarNoCartao('Posto Jorro', '');

        expect(rede.logins).toEqual([]);
        expect(div.textContent).toContain('Informe o usuário.');
    });

    it('"Esqueceu a senha?" no modo API responde com a instrução, sem fingir que mandou e-mail', async () => {
        await montar();
        await act(async () => botao('Posto Jorro').click());
        await act(async () => botao('Esqueceu a senha?').click());

        expect(div.textContent).toContain('Peça ao administrador para redefinir a sua senha.');
    });

    it('conta de outro posto é recusada e sai', async () => {
        rede.postosDoLogin = [BR];
        await montar();
        await entrarNoCartao('Posto Jorro');

        expect(rede.sair).toHaveBeenCalledTimes(1);
        expect(div.textContent).toContain('Esta conta não é do Posto Jorro.');
    });

    it('entrou uma vez: na volta o cartão lembra o usuário e pede só a senha', async () => {
        rede.postosDoLogin = [JORRO];
        await montar();
        await entrarNoCartao('Posto Jorro');
        expect(localStorage.getItem('painel.login-do-posto.1')).toBe('elias');
        act(() => raiz.unmount());
        div.remove();

        await montar();
        await act(async () => botao('Posto Jorro').click());

        // Só a senha à vista: o usuário lembrado vai num campo escondido, só para o envio e o cofre.
        expect(campo('usuario').readOnly).toBe(true);
        expect(campo('usuario').value).toBe('elias');
        expect(div.querySelector('input[aria-label="Usuário do Posto Jorro"]')).toBeNull();
        expect(div.querySelector('input[aria-label="Senha do Posto Jorro"]')).not.toBeNull();
        expect(localStorage.getItem('painel.login-do-posto.2')).toBeNull();
        expect(Object.keys(localStorage).some((k) => /senha|token/i.test(k) || /testes/.test(localStorage.getItem(k) ?? ''))).toBe(false);
    });

    it('"Entrar com outra conta" esquece o usuário e volta a pedir', async () => {
        localStorage.setItem('painel.login-do-posto.1', 'outro');
        await montar();
        await act(async () => botao('Posto Jorro').click());
        expect(campo('usuario').readOnly).toBe(true);
        await act(async () => botao('Entrar com outra conta').click());

        expect(campo('usuario').readOnly).toBe(false);
        expect(campo('usuario').value).toBe('');
        expect(localStorage.getItem('painel.login-do-posto.1')).toBeNull();
    });

    it('conta de outro posto recusada não fica lembrada', async () => {
        rede.postosDoLogin = [BR];
        await montar();
        await entrarNoCartao('Posto Jorro');

        expect(localStorage.getItem('painel.login-do-posto.1')).toBeNull();
    });
});
