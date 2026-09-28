import type { CombustivelDaApi, CombustivelDeclarado, PistaDaApi, TanqueDaApi, TanqueDeclarado } from '../api/cadastro-de-bicos.api';

/**
 * Combustíveis e tanques como a tela os mostra e os formulários os mandam (#157). Dinheiro e
 * litros ficam em STRING do começo ao fim: "6,89" digitado vira "6.89" para a API, e o "6.89" da
 * API vira "R$ 6,89" na tela — nenhum dos dois passa por float.
 */

type Lido<T> = { readonly ok: true; readonly valor: T } | { readonly ok: false; readonly motivo: string };

/** Preço digitado ("6,89" ou "6.89") → "6.89"; zero, vazio ou mais de 2 casas não passam. */
export function precoDoTexto(texto: string): Lido<string> {
    const limpo = texto.trim().replace(',', '.');
    if (!/^\d{1,6}(\.\d{1,2})?$/.test(limpo) || /^0+(\.0+)?$/.test(limpo)) {
        return { ok: false, motivo: 'Informe o preço de venda por litro, como 6,89.' };
    }
    return { ok: true, valor: limpo };
}

/** Litros digitados ("20.000" ou "20000,5") → "20000.5"; o ponto é separador de milhar. */
export function capacidadeDoTexto(texto: string): Lido<string> {
    const limpo = texto.trim().replace(/\./g, '').replace(',', '.');
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(limpo) || /^0+(\.0+)?$/.test(limpo)) {
        return { ok: false, motivo: 'Informe a capacidade do tanque em litros, como 20.000.' };
    }
    return { ok: true, valor: limpo };
}

/** "6.89" da API → "R$ 6,89" (o Laravel já manda 2 casas). */
export function precoParaTela(preco: string): string {
    return `R$ ${preco.replace('.', ',')}`;
}

/** "20000.00" da API → "20.000 L" (sem casas quando inteiro). */
export function litrosParaTela(litros: string): string {
    const [inteiro = '0', casas = ''] = litros.split('.');
    const milhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${milhar}${/^0*$/.test(casas) ? '' : `,${casas}`} L`;
}

/** "20000.00" → "20.000" para voltar ao campo de edição no formato que o gerente digita. */
export function litrosParaCampo(litros: string): string {
    return litrosParaTela(litros).replace(/ L$/, '');
}

export interface CombustivelComTanques {
    readonly combustivel: CombustivelDaApi;
    readonly tanques: readonly TanqueDaApi[];
}

/** Os combustíveis por nome e, em cada um, os tanques dele. Sem `mostrarInativos`, some o desativado. */
export function combustiveisComTanques(pista: PistaDaApi, mostrarInativos: boolean): CombustivelComTanques[] {
    return [...pista.combustiveis]
        .filter((c) => mostrarInativos || c.ativo)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        .map((c) => ({
            combustivel: c,
            tanques: pista.tanques
                .filter((t) => t.combustivel_id === c.id && (mostrarInativos || t.ativo !== false))
                .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })),
        }));
}

export interface FormularioDeCombustivel {
    readonly nome: string;
    readonly codigo: string;
    readonly cor: string;
    readonly preco: string;
    readonly ativo: boolean;
}

export function corpoDoCombustivel(f: FormularioDeCombustivel): Lido<CombustivelDeclarado> {
    if (f.nome.trim() === '') return { ok: false, motivo: 'Informe o nome do combustível.' };
    if (!/^[A-Za-z0-9]{1,6}$/.test(f.codigo.trim())) return { ok: false, motivo: 'Informe o código (até 6 letras ou números), como GC.' };
    const preco = precoDoTexto(f.preco);
    if (!preco.ok) return preco;
    return {
        ok: true,
        valor: { nome: f.nome.trim(), codigo: f.codigo.trim().toUpperCase(), cor: /^#[0-9A-Fa-f]{6}$/.test(f.cor) ? f.cor : null, preco_venda: preco.valor, ativo: f.ativo },
    };
}

export interface FormularioDeTanque {
    readonly nome: string;
    readonly combustivelId: number | null;
    readonly capacidade: string;
    readonly ativo: boolean;
}

export function corpoDoTanque(f: FormularioDeTanque): Lido<TanqueDeclarado> {
    if (f.nome.trim() === '') return { ok: false, motivo: 'Informe o nome do tanque.' };
    if (f.combustivelId === null) return { ok: false, motivo: 'Escolha o combustível do tanque.' };
    const capacidade = capacidadeDoTexto(f.capacidade);
    if (!capacidade.ok) return capacidade;
    return { ok: true, valor: { nome: f.nome.trim(), combustivel_id: f.combustivelId, capacidade: capacidade.valor, ativo: f.ativo } };
}
