/**
 * Borda web do módulo canônico de Fechamento (@posto/utils/fechamento).
 *
 * @remarks
 * Converte uma `SessaoFrentista` (valores em string, formato BR) no value object
 * `MeiosPagamento` (reais) esperado pelo módulo. É o único ponto do web que sabe
 * como parsear a UI — os hooks/serviços chamam `cartao`/`conferido`/`diferenca`
 * sobre o resultado, sem reimplementar soma.
 */
import { meiosFromFechamentoRow, type MeiosPagamento } from '@posto/utils';
import type { SessaoFrentista } from '../types/fechamento';
import { parseValue } from './formatters';

/** Constrói {@link MeiosPagamento} a partir de uma `SessaoFrentista` da UI. */
export const meiosDaSessao = (s: SessaoFrentista): MeiosPagamento =>
    meiosFromFechamentoRow({
        valor_dinheiro: parseValue(s.valor_dinheiro),
        valor_moedas: parseValue(s.valor_moedas ?? ''),
        valor_pix: parseValue(s.valor_pix),
        valor_cartao: parseValue(s.valor_cartao),
        valor_cartao_debito: parseValue(s.valor_cartao_debito),
        valor_cartao_credito: parseValue(s.valor_cartao_credito),
        valor_nota: parseValue(s.valor_nota),
        valor_baratao: parseValue(s.valor_baratao),
    });
