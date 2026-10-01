import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mensagemDaTrocaDeFoto, podeTrocarFotoDoPosto, trocarFotoComSenha } from './foto-do-posto.api';
import { esquecerTokenDaApi, guardarTokenDaApi, lerTokenDaApi } from './token-da-api';

/**
 * Troca da foto pelo cartão da tela de entrada (27/09/2026): a senha do gerente vale SÓ para a troca —
 * o token nasce no login, vai no PUT e é encerrado, dando certo ou não; a sessão do painel não é tocada.
 */

vi.mock('../supabase', () => ({ supabase: {} }));

type Chamada = { url: string; metodo: string; token: string | null };
let chamadas: Chamada[] = [];
let corpos: unknown[] = [];

function rede(respostas: Record<string, { status: number; corpo?: unknown }>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (entrada: string, init?: RequestInit) => {
      const url = String(entrada).replace('http://api.test', '');
      const metodo = init?.method ?? 'GET';
      const auth = new Headers(init?.headers).get('Authorization');
      chamadas.push({ url, metodo, token: auth === null ? null : auth.replace('Bearer ', '') });
      corpos.push(typeof init?.body === 'string' ? JSON.parse(init.body) : null);
      const r = respostas[`${metodo} ${url}`] ?? { status: 404, corpo: {} };
      return r.status === 204 ? new Response(null, { status: 204 }) : new Response(JSON.stringify(r.corpo ?? {}), { status: r.status });
    }),
  );
}

const FOTO = 'data:image/jpeg;base64,/9j/AA==';

beforeEach(() => {
  chamadas = [];
  corpos = [];
  vi.stubEnv('VITE_API_URL', 'http://api.test');
  esquecerTokenDaApi();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('trocarFotoComSenha', () => {
  it('entra, grava com o token da troca e encerra — a sessão do painel fica intacta', async () => {
    guardarTokenDaApi('sessao-do-painel');
    rede({
      'POST /api/login': { status: 200, corpo: { token: 'tk-troca', usuario: {} } },
      'PUT /api/postos/2/foto': { status: 200, corpo: { data: { foto: '/api/postos/2/foto?v=9' } } },
      'POST /api/sair': { status: 204 },
    });

    const r = await trocarFotoComSenha(2, 'elias.br@ensaio.local', 'testes', FOTO);

    expect(r.isOk() && r.value).toBe('/api/postos/2/foto?v=9');
    expect(chamadas).toEqual([
      { url: '/api/login', metodo: 'POST', token: null },
      { url: '/api/postos/2/foto', metodo: 'PUT', token: 'tk-troca' },
      { url: '/api/sair', metodo: 'POST', token: 'tk-troca' },
    ]);
    expect(lerTokenDaApi()).toBe('sessao-do-painel');
  });

  it('conta de outro posto: 403, e o token da troca é encerrado mesmo assim', async () => {
    rede({
      'POST /api/login': { status: 200, corpo: { token: 'tk-troca', usuario: {} } },
      'PUT /api/postos/2/foto': { status: 403, corpo: { message: 'Sem acesso' } },
      'POST /api/sair': { status: 204 },
    });

    const r = await trocarFotoComSenha(2, 'elias.jorro@ensaio.local', 'testes', FOTO);

    expect(r.isErr() && mensagemDaTrocaDeFoto(r.error)).toBe('Esta conta não pode trocar a foto deste posto.');
    expect(chamadas.map((c) => `${c.metodo} ${c.url}`)).toEqual(['POST /api/login', 'PUT /api/postos/2/foto', 'POST /api/sair']);
    expect(lerTokenDaApi()).toBeNull();
  });

  it('senha errada: 401 no login, nada é gravado', async () => {
    rede({ 'POST /api/login': { status: 401, corpo: { message: 'x' } } });

    const r = await trocarFotoComSenha(2, 'elias.br@ensaio.local', 'errada', FOTO);

    expect(r.isErr() && mensagemDaTrocaDeFoto(r.error)).toBe('Usuário ou senha incorretos.');
    expect(chamadas).toHaveLength(1);
  });
});

describe('trocarFotoComSenha — quem entra', () => {
  it('nome de usuário entra pelo cartão do posto da foto; com "@", pelo e-mail', async () => {
    rede({ 'POST /api/login': { status: 401, corpo: { message: 'x' } } });

    const porUsuario = await trocarFotoComSenha(2, 'elias', 'testes', FOTO);
    const porEmail = await trocarFotoComSenha(2, 'admin@ensaio.local', 'testes', FOTO);

    expect(porUsuario.isErr() && porEmail.isErr()).toBe(true);

    expect(corpos).toEqual([
      { posto_id: 2, usuario: 'elias', senha: 'testes', dispositivo: 'foto-do-posto' },
      { email: 'admin@ensaio.local', senha: 'testes', dispositivo: 'foto-do-posto' },
    ]);
  });
});

describe('podeTrocarFotoDoPosto', () => {
  const perfil = (role: string, papel: string) => ({ id: 1, nome: 'x', email: 'x', role, postos: [{ id: 2, nome: 'BR', papel }] });

  it('papel vem em minúsculas da API', () => {
    expect(podeTrocarFotoDoPosto(perfil('GERENTE', 'gerente'), 2)).toBe(true);
    expect(podeTrocarFotoDoPosto(perfil('OPERADOR', 'operador'), 2)).toBe(false);
    expect(podeTrocarFotoDoPosto(perfil('GERENTE', 'gerente'), 1)).toBe(false);
    expect(podeTrocarFotoDoPosto(perfil('ADMIN', 'operador'), 1)).toBe(true);
    expect(podeTrocarFotoDoPosto(null, 2)).toBe(false);
  });
});
