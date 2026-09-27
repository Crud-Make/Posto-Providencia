import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SessaoFrentista } from '../../../types/fechamento';
import type { Frentista } from '../../../types/database/index';
import { EnviosMobile } from './EnviosMobile';

/**
 * "N recebidos" conta quem mandou caixa. A tela semeia uma linha vazia por frentista ativo, e o
 * contador somava essas também: "3 recebidos" com 1 envio só (ensaio do Posto BR, 27/09/2026).
 */

const vazia = (tempId: string, frentistaId: number): SessaoFrentista =>
  ({
    tempId, frentistaId, valor_cartao: '', valor_cartao_debito: '', valor_cartao_credito: '', valor_nota: '',
    valor_pix: '', valor_dinheiro: '', valor_moedas: '', valor_baratao: '', valor_encerrante: '',
    valor_conferido: '', observacoes: '', status: 'pendente',
  }) as unknown as SessaoFrentista;

const frentistas = [
  { id: 247, nome: 'Ana (BR)' },
  { id: 248, nome: 'Bruno (BR)' },
  { id: 249, nome: 'Carla (BR)' },
] as unknown as Frentista[];

let raiz: Root;
let div: HTMLDivElement;

async function montar(sessoes: SessaoFrentista[]): Promise<void> {
  div = document.createElement('div');
  document.body.appendChild(div);
  raiz = createRoot(div);
  await act(async () => raiz.render(<EnviosMobile sessoes={sessoes} frentistas={frentistas} />));
}

afterEach(() => {
  act(() => raiz.unmount());
  div.remove();
});

describe('EnviosMobile — contador de recebidos', () => {
  it('1 envio e 2 linhas semeadas vazias: "1 recebido"', async () => {
    await montar([
      { ...vazia('a', 247), valor_pix: 'R$ 300,00', valor_dinheiro: 'R$ 200,00' },
      vazia('b', 248),
      vazia('c', 249),
    ]);
    expect(div.textContent).toContain('1 recebido');
    expect(div.textContent).not.toContain('3 recebidos');
  });

  it('nenhum envio: "0 recebidos"', async () => {
    await montar([vazia('b', 248), vazia('c', 249)]);
    expect(div.textContent).toContain('0 recebidos');
  });
});
