import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { okAsync, type ResultAsync } from 'neverthrow';

/**
 * Lápis do cartão (27/09/2026): a foto já veio escolhida; a janela pede só a senha quando o usuário
 * daquele posto está lembrado, e passa a lembrá-lo depois de uma troca certa.
 */

const trocar = vi.fn<(posto: number, email: string, senha: string, foto: string) => ResultAsync<string | null, never>>(
  () => okAsync<string | null, never>('/api/postos/2/foto?v=2'),
);
vi.mock('../../services/api/foto-do-posto.api', () => ({
  TAMANHO_MAXIMO_DA_FOTO: 300000,
  trocarFotoComSenha: (...a: [number, string, string, string]) => trocar(...a),
  mensagemDaTrocaDeFoto: () => 'erro',
}));
vi.mock('../../shared/lib/reduzir-foto', () => ({
  reduzirFoto: () => okAsync('data:image/jpeg;base64,AA=='),
  mensagemDeFoto: () => 'erro',
}));

const { default: TrocarFotoNoCartao } = await import('./trocar-foto-no-cartao');

let raiz: Root;
let div: HTMLDivElement;
const aoTrocar = vi.fn();

async function montar(): Promise<void> {
  div = document.createElement('div');
  document.body.appendChild(div);
  raiz = createRoot(div);
  const arquivo = new File(['x'], 'fachada.jpg', { type: 'image/jpeg' });
  await act(async () => raiz.render(<TrocarFotoNoCartao postoId={2} nome="Posto BR" arquivo={arquivo} aoTrocar={aoTrocar} aoFechar={vi.fn()} />));
}

function preencher(nome: string, valor: string): void {
  const campo = div.querySelector<HTMLInputElement>(`input[name="${nome}"]`);
  if (campo === null) throw new Error(`sem campo ${nome}`);
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(campo, valor);
}

async function enviar(): Promise<void> {
  await act(async () => {
    div.querySelector('form')?.requestSubmit();
    await new Promise((r) => setTimeout(r, 0));
  });
}

beforeEach(() => {
  localStorage.clear();
  trocar.mockClear();
  aoTrocar.mockClear();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:previa', revokeObjectURL: vi.fn() }));
});
afterEach(() => {
  act(() => raiz.unmount());
  div.remove();
});

describe('TrocarFotoNoCartao', () => {
  it('usuário lembrado do posto: pede SÓ a senha e troca com ele', async () => {
    localStorage.setItem('painel.login-do-posto.2', 'elias');
    await montar();

    expect(div.querySelector('input[name="usuario"]')).toBeNull();
    expect(div.textContent).toContain('Como elias');
    preencher('senha', 'testes');
    await enviar();

    expect(trocar).toHaveBeenCalledWith(2, 'elias', 'testes', 'data:image/jpeg;base64,AA==');
    expect(aoTrocar).toHaveBeenCalledWith('/api/postos/2/foto?v=2');
  });

  it('sem usuário lembrado: pede usuário e senha, e lembra o usuário depois da troca', async () => {
    await montar();

    preencher('usuario', 'elias');
    preencher('senha', 'testes');
    await enviar();

    expect(trocar).toHaveBeenCalledWith(2, 'elias', 'testes', expect.any(String));
    expect(localStorage.getItem('painel.login-do-posto.2')).toBe('elias');
  });

  it('sem senha não chama o servidor', async () => {
    localStorage.setItem('painel.login-do-posto.2', 'elias');
    await montar();
    await enviar();

    expect(trocar).not.toHaveBeenCalled();
    expect(div.textContent).toContain('Informe a senha.');
  });
});
