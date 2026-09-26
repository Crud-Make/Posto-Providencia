import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

/**
 * Caracterização de `services/api.ts` antes de as consultas saírem para as entities (P7a da
 * refatoração FSD do pwa, 22/09/2026). Prende a query, a tabela, as colunas e os efeitos que
 * hoje não têm teste: o Fechamento nasce "não apurado" e é reconsolidado depois do insert do
 * filho, o aviso ao dono nunca lança, a presença não manda `visto_em`, a régua confere a
 * gravação (anti-RLS silenciosa) e as vendas de hoje recortam na meia-noite LOCAL.
 *
 * O dublê é o client do Supabase (`shared/api/supabase`), não `shared/api` inteiro: assim a
 * borda nova (`executar`, P7c) continua real quando as entities passarem a usá-la, e este
 * arquivo tem de passar sem ajuste depois do P8.
 */

type Resposta = { data: unknown; error: { message: string } | null };
type Chamada = { tabela: string; metodos: [string, ...unknown[]][] };

const estado = vi.hoisted(() => ({
    respostas: [] as { data: unknown; error: { message: string } | null }[],
    /** Quando definido, a PRÓXIMA consulta rejeita com isto (falha de rede do client). */
    rejeicao: undefined as unknown,
    chamadas: [] as { tabela: string; metodos: [string, ...unknown[]][] }[],
    ordem: [] as string[],
    invoke: null as unknown as Mock<(...args: unknown[]) => Promise<unknown>>,
    consolidar: null as unknown as Mock<(id: number) => Promise<void>>,
}));

vi.mock('@frentista/shared/api/supabase', async () => {
    const { vi: viMock } = await import('vitest');
    estado.invoke = viMock.fn();
    const METODOS = ['select', 'eq', 'order', 'limit', 'insert', 'update', 'upsert', 'single', 'gte', 'lt'];
    const from = (tabela: string) => {
        const chamada: Chamada = { tabela, metodos: [] };
        estado.chamadas.push(chamada);
        const resposta = estado.respostas.shift() ?? { data: null, error: null };
        // Promise de verdade com os métodos do query builder pendurados: o `await` da API
        // resolve na resposta enfileirada, e cada método encadeado devolve a mesma promise.
        const rejeicao = estado.rejeicao;
        estado.rejeicao = undefined;
        const promessa = rejeicao === undefined ? Promise.resolve(resposta) : Promise.reject(rejeicao);
        const cadeia = Object.assign(promessa, {} as Record<string, unknown>);
        for (const nome of METODOS) {
            cadeia[nome] = (...args: unknown[]) => {
                chamada.metodos.push([nome, ...args]);
                if (nome === 'insert' || nome === 'upsert' || nome === 'update') estado.ordem.push(`${nome}:${tabela}`);
                return cadeia;
            };
        }
        return cadeia;
    };
    return { supabase: { from, functions: { invoke: (...args: unknown[]) => estado.invoke(...args) } } };
});

vi.mock('@posto/api-core', async () => {
    const { vi: viMock } = await import('vitest');
    estado.consolidar = viMock.fn(async (id: number) => { estado.ordem.push(`consolidar:${id}`); });
    return {
        criarAcessoEncerrante: () => ({
            consolidarFechamento: (id: number) => estado.consolidar(id),
        }),
    };
});

const { api } = await import('./api');
const { hojeIso } = await import('@posto/utils');

const responder = (...respostas: Resposta[]) => { estado.respostas.push(...respostas); };
const metodos = (i: number): [string, ...unknown[]][] => estado.chamadas[i]?.metodos ?? [];

beforeEach(() => {
    estado.respostas = [];
    estado.chamadas = [];
    estado.ordem = [];
    estado.rejeicao = undefined;
    estado.invoke.mockReset();
    estado.consolidar.mockClear();
});

describe('services/api — getOrCreateFechamento', () => {
    it('devolve o id do Fechamento que já existe, sem inserir', async () => {
        responder({ data: [{ id: 42 }, { id: 43 }], error: null });

        await expect(api.getOrCreateFechamento(1, '2026-09-22', 1)).resolves.toBe(42);

        expect(estado.chamadas).toHaveLength(1);
        expect(estado.chamadas[0]?.tabela).toBe('Fechamento');
        expect(metodos(0)).toEqual([
            ['select', 'id'],
            ['eq', 'posto_id', 1],
            ['eq', 'data', '2026-09-22'],
            ['eq', 'turno_id', 1],
        ]);
    });

    it('cria o Fechamento "não apurado": total_vendas null, total_recebido 0, diferenca null', async () => {
        responder({ data: [], error: null }, { data: { id: 99 }, error: null });

        await expect(api.getOrCreateFechamento(1, '2026-09-22', 1)).resolves.toBe(99);

        expect(estado.chamadas[1]?.tabela).toBe('Fechamento');
        expect(metodos(1)).toEqual([
            ['insert', {
                posto_id: 1,
                data: '2026-09-22',
                turno_id: 1,
                total_vendas: null,
                total_recebido: 0,
                diferenca: null,
                status: 'ABERTO',
                usuario_id: 1,
            }],
            ['select'],
            ['single'],
        ]);
    });

    it('lista vazia vinda como null também cria', async () => {
        responder({ data: null, error: null }, { data: { id: 7 }, error: null });
        await expect(api.getOrCreateFechamento(1, '2026-09-22', 1)).resolves.toBe(7);
    });

    it('erro na busca lança com a mensagem do banco', async () => {
        responder({ data: null, error: { message: 'busca falhou' } });
        await expect(api.getOrCreateFechamento(1, '2026-09-22', 1)).rejects.toThrow('busca falhou');
    });

    it('erro no insert lança com a mensagem do banco', async () => {
        responder({ data: [], error: null }, { data: null, error: { message: 'insert falhou' } });
        await expect(api.getOrCreateFechamento(1, '2026-09-22', 1)).rejects.toThrow('insert falhou');
    });
});

describe('services/api — submitFrentistaClosing', () => {
    const payload = {
        fechamento_id: 5, frentista_id: 2, posto_id: 1, encerrante: 1000,
        valor_pix: 300, valor_dinheiro: 700, valor_moedas: 0, baratao: 0, valor_nota: 0,
        valor_cartao_debito: 0, valor_cartao_credito: 0, valor_cartao: 0,
        valor_conferido: 1000, diferenca_calculada: 0, observacoes: 'Fechamento via PWA Frentista',
    };

    it('insere o payload inteiro e só DEPOIS reconsolida o pai', async () => {
        responder({ data: { id: 31 }, error: null });

        await expect(api.submitFrentistaClosing(payload)).resolves.toEqual({ id: 31 });

        expect(estado.chamadas[0]?.tabela).toBe('FechamentoFrentista');
        expect(metodos(0)).toEqual([['insert', payload], ['select'], ['single']]);
        expect(estado.consolidar).toHaveBeenCalledWith(5);
        expect(estado.ordem).toEqual(['insert:FechamentoFrentista', 'consolidar:5']);
    });

    it('erro no insert lança e não reconsolida', async () => {
        responder({ data: null, error: { message: 'duplicado' } });

        await expect(api.submitFrentistaClosing(payload)).rejects.toThrow('duplicado');
        expect(estado.consolidar).not.toHaveBeenCalled();
    });

    it.each([
        ['id em texto', { id: '31' }],
        ['sem id', { criado: true }],
        ['null', null],
    ])('insert gravado com resposta fora do formato (%s) é SUCESSO: resolve null, reconsolida, só avisa no console', async (_rotulo, devolvido) => {
        // Revisão do lote 1 (22/09): se a validação da linha criada rejeitasse aqui, o App
        // mostraria erro com o envio já gravado e o frentista reenviaria — envio em dobro.
        const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        responder({ data: devolvido, error: null });

        await expect(api.submitFrentistaClosing(payload)).resolves.toBeNull();

        expect(estado.ordem).toEqual(['insert:FechamentoFrentista', 'consolidar:5']);
        expect(aviso).toHaveBeenCalledTimes(1);
        expect(String(aviso.mock.calls[0]?.[0])).toContain('FechamentoFrentista (enviado)');
        aviso.mockRestore();
    });
});

describe('services/api — avisarDono', () => {
    it('manda só o id para a Edge Function notifica-dono', async () => {
        estado.invoke.mockResolvedValue({ error: null });

        await api.avisarDono(31);

        expect(estado.invoke).toHaveBeenCalledWith('notifica-dono', { body: { fechamentoFrentistaId: 31 } });
    });

    it('nunca lança: nem com erro devolvido, nem com rejeição', async () => {
        const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        estado.invoke.mockResolvedValueOnce({ error: { message: 'push fora' } });
        await expect(api.avisarDono(1)).resolves.toBeUndefined();
        estado.invoke.mockRejectedValueOnce(new Error('rede caiu'));
        await expect(api.avisarDono(2)).resolves.toBeUndefined();
        expect(erro).toHaveBeenCalledTimes(2);
        erro.mockRestore();
    });
});

describe('services/api — marcarPresenca', () => {
    it('faz upsert por frentista SEM visto_em (o trigger do banco carimba)', async () => {
        responder({ data: null, error: null });

        await api.marcarPresenca(3, 1);

        expect(estado.chamadas[0]?.tabela).toBe('PresencaFrentista');
        expect(metodos(0)).toEqual([
            ['upsert', { frentista_id: 3, posto_id: 1 }, { onConflict: 'frentista_id' }],
        ]);
    });

    it('falha em silêncio', async () => {
        const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        responder({ data: null, error: { message: 'rls' } });
        await expect(api.marcarPresenca(3, 1)).resolves.toBeUndefined();
        expect(aviso).toHaveBeenCalledTimes(1);
        aviso.mockRestore();
    });
});

describe('services/api — salvarMedicaoTanque (conferência anti-RLS)', () => {
    it('grava por upsert (tanque, data) e confere relendo', async () => {
        responder({ data: null, error: null }, { data: { volume_fisico: 5000 }, error: null });

        await expect(api.salvarMedicaoTanque(2, '2026-09-22', 5000)).resolves.toBeUndefined();

        expect(estado.chamadas.map((c) => c.tabela)).toEqual(['HistoricoTanque', 'HistoricoTanque']);
        expect(metodos(0)).toEqual([
            ['upsert', { tanque_id: 2, data: '2026-09-22', volume_fisico: 5000 }, { onConflict: 'tanque_id, data' }],
        ]);
        expect(metodos(1)).toEqual([
            ['select', 'volume_fisico'],
            ['eq', 'tanque_id', 2],
            ['eq', 'data', '2026-09-22'],
            ['single'],
        ]);
    });

    it('volume relido como string numérica igual ainda vale', async () => {
        responder({ data: null, error: null }, { data: { volume_fisico: '5000' }, error: null });
        await expect(api.salvarMedicaoTanque(2, '2026-09-22', 5000)).resolves.toBeUndefined();
    });

    it('volume relido diferente = gravação barrada, erro explícito', async () => {
        responder({ data: null, error: null }, { data: { volume_fisico: 4000 }, error: null });
        await expect(api.salvarMedicaoTanque(2, '2026-09-22', 5000)).rejects.toThrow('A medição não foi gravada');
    });

    it('releitura vazia = gravação barrada, erro explícito', async () => {
        responder({ data: null, error: null }, { data: null, error: null });
        await expect(api.salvarMedicaoTanque(2, '2026-09-22', 5000)).rejects.toThrow('A medição não foi gravada');
    });

    it('erro no upsert lança sem reler', async () => {
        responder({ data: null, error: { message: 'fora da janela' } });
        await expect(api.salvarMedicaoTanque(2, '2026-09-22', 5000)).rejects.toThrow('fora da janela');
        expect(estado.chamadas).toHaveLength(1);
    });
});

describe('services/api — getVendasProdutoHoje (recorte de meia-noite local)', () => {
    it('recorta de 00:00 local de hoje até 00:00 local de amanhã, em ISO UTC', async () => {
        // Linha completa (as colunas do select): no P8 a resposta passou a ser validada por Zod,
        // e o `[{ id: 1 }]` que estava aqui no P7a não é uma linha que o banco devolveria.
        const venda = {
            id: 1, quantidade: 2, valor_unitario: 5.5, valor_total: 11, data: '2026-09-22T15:00:00+00:00',
            produto: { nome: 'Água', categoria: 'Bebidas' },
        };
        responder({ data: [venda], error: null });

        await expect(api.getVendasProdutoHoje(4)).resolves.toEqual([venda]);

        const inicio = new Date(`${hojeIso()}T00:00:00`);
        const fim = new Date(inicio);
        fim.setDate(fim.getDate() + 1);
        const m = metodos(0);
        expect(estado.chamadas[0]?.tabela).toBe('VendaProduto');
        expect(m).toContainEqual(['eq', 'frentista_id', 4]);
        expect(m).toContainEqual(['gte', 'data', inicio.toISOString()]);
        expect(m).toContainEqual(['lt', 'data', fim.toISOString()]);
        expect(m).toContainEqual(['order', 'data', { ascending: false }]);
        // Em America/Sao_Paulo (o TZ do `bun run test`) a meia-noite local é 03:00Z.
        expect(inicio.toISOString()).toMatch(/T03:00:00\.000Z$/);
    });

    it('null do banco vira lista vazia', async () => {
        responder({ data: null, error: null });
        await expect(api.getVendasProdutoHoje(4)).resolves.toEqual([]);
    });
});

describe('services/api — leituras simples (tabela e colunas)', () => {
    it('getFrentistas: ativos do posto, por nome', async () => {
        responder({ data: [{ id: 1, nome: 'Ana', foto: null }], error: null });
        await expect(api.getFrentistas(1)).resolves.toEqual([{ id: 1, nome: 'Ana', foto: null }]);
        expect(estado.chamadas[0]?.tabela).toBe('Frentista');
        expect(metodos(0)).toEqual([
            ['select', 'id, nome, foto'], ['eq', 'posto_id', 1], ['eq', 'ativo', true], ['order', 'nome'],
        ]);
    });

    it('getProdutos: ativos do posto, por nome; null vira []', async () => {
        responder({ data: null, error: null });
        await expect(api.getProdutos(1)).resolves.toEqual([]);
        expect(estado.chamadas[0]?.tabela).toBe('Produto');
        expect(metodos(0)).toEqual([
            ['select', 'id, nome, preco_venda, estoque_atual, categoria, unidade_medida'],
            ['eq', 'posto_id', 1], ['eq', 'ativo', true], ['order', 'nome'],
        ]);
    });

    it('getTanques: do posto, por id', async () => {
        responder({ data: [{ id: 1, combustivel: { nome: 'Gasolina', codigo: 'GC' } }], error: null });
        await expect(api.getTanques(1)).resolves.toEqual([{ id: 1, combustivel: { nome: 'Gasolina', codigo: 'GC' } }]);
        expect(estado.chamadas[0]?.tabela).toBe('Tanque');
        expect(metodos(0)).toEqual([
            ['select', 'id, combustivel:Combustivel(nome, codigo)'], ['eq', 'posto_id', 1], ['order', 'id'],
        ]);
    });

    it('getMedicoesDoDia: HistoricoTanque do dia', async () => {
        responder({ data: [{ tanque_id: 1, volume_fisico: 10 }], error: null });
        await expect(api.getMedicoesDoDia('2026-09-22')).resolves.toEqual([{ tanque_id: 1, volume_fisico: 10 }]);
        expect(metodos(0)).toEqual([['select', 'tanque_id, volume_fisico'], ['eq', 'data', '2026-09-22']]);
    });

    it('getEnviosDoDia: filtra pelo pai (posto e data), ordem de envio', async () => {
        responder({ data: null, error: null });
        await expect(api.getEnviosDoDia(1, '2026-09-22')).resolves.toEqual([]);
        expect(estado.chamadas[0]?.tabela).toBe('FechamentoFrentista');
        const m = metodos(0);
        expect(m[1]).toEqual(['eq', 'fechamento.posto_id', 1]);
        expect(m[2]).toEqual(['eq', 'fechamento.data', '2026-09-22']);
        expect(m[3]).toEqual(['order', 'data_hora_envio', { ascending: true }]);
    });

    it('getHistoricoFrentista: últimos 20 do frentista, do mais novo', async () => {
        responder({ data: null, error: null });
        await expect(api.getHistoricoFrentista(2)).resolves.toEqual([]);
        const m = metodos(0);
        expect(m[1]).toEqual(['eq', 'frentista_id', 2]);
        expect(m[2]).toEqual(['order', 'id', { ascending: false }]);
        expect(m[3]).toEqual(['limit', 20]);
    });

    it('salvarFotoFrentista: update só da foto, pelo id', async () => {
        responder({ data: null, error: null });
        await expect(api.salvarFotoFrentista(2, null)).resolves.toBeUndefined();
        expect(metodos(0)).toEqual([['update', { foto: null }], ['eq', 'id', 2]]);
    });

    it('registrarVendaProduto: insere o payload literal com o instante do envio', async () => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-09-22T12:34:56.000Z'));
        responder({ data: { id: 8 }, error: null });
        const venda = { frentista_id: 1, produto_id: 2, quantidade: 3, valor_unitario: 4.5, valor_total: 13.5 };

        await expect(api.registrarVendaProduto(venda)).resolves.toEqual({ id: 8 });

        expect(estado.chamadas[0]?.tabela).toBe('VendaProduto');
        expect(metodos(0)).toEqual([
            ['insert', { ...venda, data: '2026-09-22T12:34:56.000Z' }], ['select'], ['single'],
        ]);
        vi.useRealTimers();
    });

    it('registrarVendaProduto: venda gravada com resposta fora do formato é SUCESSO (resolve null, sem reenvio)', async () => {
        const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        responder({ data: { id: 'oito' }, error: null });
        const venda = { frentista_id: 1, produto_id: 2, quantidade: 3, valor_unitario: 4.5, valor_total: 13.5 };

        await expect(api.registrarVendaProduto(venda)).resolves.toBeNull();

        expect(estado.chamadas).toHaveLength(1);
        expect(String(aviso.mock.calls[0]?.[0])).toContain('VendaProduto (registrada)');
        aviso.mockRestore();
    });

    it('rejeição do client sobe como veio, sem embrulho (contrato da fachada)', async () => {
        const causa = new TypeError('Failed to fetch');
        estado.rejeicao = causa;
        await expect(api.getFrentistas(1)).rejects.toBe(causa);
    });

    it('erro de leitura lança com a mensagem do banco', async () => {
        responder({ data: null, error: { message: 'caiu' } });
        await expect(api.getFrentistas(1)).rejects.toThrow('caiu');
    });
});
