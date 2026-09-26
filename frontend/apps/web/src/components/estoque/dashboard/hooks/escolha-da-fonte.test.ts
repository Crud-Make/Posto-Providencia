import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * A flag `VITE_API_TANQUES` escolhe a fonte da tela INTEIRA (#103): `0` deixa leitura e medição no
 * Supabase, como sempre foram, mesmo com `VITE_API_URL`; ausente, segue o `VITE_API_URL`.
 */
const { saveHistory, getAll } = vi.hoisted(() => ({
    saveHistory: vi.fn(async () => ({ success: true, data: undefined })),
    getAll: vi.fn(async () => ({ success: false, error: 'sem sessão' })),
}));
vi.mock('../../../../services/supabase', () => ({ supabase: {} }));
vi.mock('../../../../services/api', () => ({ tanqueService: { saveHistory, getAll, getHistory: vi.fn() } }));

import { carregarPainel } from './carregar-painel';
import { gravarMedicao } from './gravar-medicao';

describe('a flag VITE_API_TANQUES', () => {
    let fetchFalso: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.stubEnv('VITE_API_URL', 'http://api.teste');
        fetchFalso = vi.fn(async () => new Response(JSON.stringify({ data: { tanque_id: 10, data: '2026-09-25', volume_fisico: '100.50' } }), { status: 200 }));
        vi.stubGlobal('fetch', fetchFalso);
        saveHistory.mockClear();
        getAll.mockClear();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('em 0: a medição vai ao Supabase com o número, e a leitura também — nada à API', async () => {
        vi.stubEnv('VITE_API_TANQUES', '0');

        (await gravarMedicao(1, 10, '2026-09-25', 100.5))._unsafeUnwrap();
        const erro = (await carregarPainel(1)).match(() => 'gravou', (e) => e);

        expect(saveHistory).toHaveBeenCalledWith({ tanque_id: 10, data: '2026-09-25', volume_fisico: 100.5 });
        expect(getAll).toHaveBeenCalledWith(1);
        expect(erro).toBe('sem sessão');
        expect(fetchFalso).not.toHaveBeenCalled();
    });

    it('ausente com VITE_API_URL: a medição vai à API em string decimal, e o Supabase não é chamado', async () => {
        (await gravarMedicao(1, 10, '2026-09-25', 100.5))._unsafeUnwrap();

        expect(saveHistory).not.toHaveBeenCalled();
        const [url, init] = fetchFalso.mock.calls[0] as [string, RequestInit];
        expect(`${init.method} ${new URL(url).pathname}`).toBe('PUT /api/postos/1/tanques/medicoes');
        expect(JSON.parse(String(init.body))).toEqual({ tanque_id: 10, data: '2026-09-25', volume_fisico: '100.5' });
    });

    it('volume que o contrato não aceita (expoente) não sai do cliente', async () => {
        const erro = (await gravarMedicao(1, 10, '2026-09-25', 1e-7)).match(() => 'gravou', (e) => e);

        expect(erro).toBe('Valor de medição fora do formato aceito.');
        expect(fetchFalso).not.toHaveBeenCalled();
    });
});
