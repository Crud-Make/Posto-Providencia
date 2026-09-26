/**
 * O corpo do "Salvar" pela API (`POST /compras`, #103) a partir do estado da tela — os MESMOS
 * valores que `usePersistenciaRegistro` mandava ao Supabase, combustível por combustível:
 *
 * - compra só com litros > 0 e fornecedor escolhido (o painel pulava o resto);
 * - dinheiro quantizado em centavos (`emCentavos`) e em string; litros em string com as 3 casas que
 *   o `InputFinanceiro` aceita — o `numeric(15,2)` arredonda no banco, como arredondava antes;
 * - com tanque: `volume_livro` = `calcEstoqueHoje(c)` e `volume_fisico` só quando medido (> 0),
 *   no texto do float que o `JSON.stringify` do painel mandava ao PostgREST ({@link decimalDoFloat}).
 *
 * Nenhuma conta nova: quem calcula o escritural continua sendo `useCalculosRegistro`.
 */
import { emCentavos } from '@posto/utils';
import { parseBRFloat } from '../../../utils/formatters';
import type { RegistroDeComprasDeclarado } from '../../../services/api/compras.api';
import type { CombustivelHibrido } from './tipos-do-registro';

type ItemDoRegistro = RegistroDeComprasDeclarado['itens'][number];

/**
 * O número como o `JSON.stringify` o escrevia no corpo do PostgREST (`String(n)`), para o Postgres
 * arredondar o MESMO texto de antes. Não finito vira `null`, como o `JSON.stringify` fazia com `NaN`.
 * Expoente (só abaixo de 1e-6, que a coluna zera de todo modo) sai em casas fixas.
 */
export function decimalDoFloat(n: number): string | null {
    if (!Number.isFinite(n)) return null;
    const texto = String(n);
    return /e/i.test(texto) ? n.toFixed(20).replace(/\.?0+$/, '') : texto;
}

function item(c: CombustivelHibrido, calcEstoqueHoje: (c: CombustivelHibrido) => number, fornecedorId: number | null): ItemDoRegistro {
    const litros = parseBRFloat(c.compra_lt);
    const fisico = parseBRFloat(c.estoque_tanque);
    const tanque = c.tanque_id ?? null;

    return {
        combustivel_id: c.id,
        tanque_id: tanque,
        compra: litros > 0 && fornecedorId !== null
            ? { quantidade_litros: litros.toFixed(3), valor_total: emCentavos(parseBRFloat(c.compra_rs)).toFixed(2) }
            : null,
        volume_livro: tanque === null ? null : decimalDoFloat(calcEstoqueHoje(c)),
        volume_fisico: tanque !== null && fisico > 0 ? decimalDoFloat(fisico) : null,
    };
}

/** O corpo sem a chave — a assinatura que decide se um clique repete a tentativa anterior. */
export function montarRegistroDeCompras(
    combustiveis: readonly CombustivelHibrido[],
    calcEstoqueHoje: (c: CombustivelHibrido) => number,
    fornecedorId: number | null,
    data: string,
): Omit<RegistroDeComprasDeclarado, 'chave'> {
    return {
        data,
        fornecedor_id: fornecedorId,
        itens: combustiveis.map((c) => item(c, calcEstoqueHoje, fornecedorId)),
    };
}
