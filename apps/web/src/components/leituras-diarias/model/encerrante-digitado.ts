/**
 * Leitura do encerrante digitado na tela de Leituras Diárias.
 *
 * @remarks Existe porque o parse estava **inline e errado** em
 *          `useLeiturasDiarias.ts`: `replace('.', '')` sem a flag `/g` remove
 *          só o primeiro separador de milhar. Encerrante acima de 1 milhão tem
 *          dois pontos, então `"1.861.796,633"` virava `1861.796` — **mil vezes
 *          menor** — e ia para o banco assim.
 *
 *          O bug atingia só o Bico 01 (Gasolina Comum), o único que passa de 1
 *          milhão na operação real; os outros cinco ficam abaixo de 700 mil e
 *          têm um ponto só. Foi o que o manteve invisível.
 *
 *          Pior que o valor errado era a divergência: `calcLitros`
 *          (`useLeituras.ts`) já parseava certo, então **a tela mostrava
 *          348,487 L enquanto o banco recebia 0,349 L**. Por isso esta função
 *          repete a normalização da exibição — salvar e mostrar precisam ler o
 *          mesmo número.
 *
 * @todo Unificar com `numeroDoCampo` (`widgets/planilha-do-mes/model`), que é a
 *       versão canônica. Hoje importá-lo daqui seria import lateral entre
 *       fatias (§2); a unificação exige subir o módulo para um lugar comum e é
 *       trabalho à parte desta correção.
 */

/**
 * Converte o texto do campo de encerrante em número.
 *
 * @param texto Conteúdo do campo, em pt-BR e com separador de milhar —
 *              `"1.861.796,633"`. A máscara da tela sempre insere o milhar.
 * @returns O valor lido, ou **`null`** quando o campo está vazio ou ilegível —
 *          nunca zero.
 *
 * @remarks **A primeira versão devolvia `0` para campo vazio, e isso era um
 *          bug pior que o que ela consertava.** O `parseFloat` antigo devolvia
 *          `NaN`, e como toda comparação com `NaN` é falsa, a linha era
 *          FILTRADA FORA da gravação. Ao trocar por `0`, a linha passou a
 *          atravessar o filtro e gravar `leitura_inicial: 0` — fazendo o
 *          odômetro inteiro da bomba virar litros vendidos do dia.
 *
 *          Zero é um valor legítimo (bico que não girou); ausência não é.
 *          Devolver `null` obriga quem chama a decidir o que fazer com o campo
 *          em branco, em vez de tratá-lo como número. É a mesma escolha, pelo
 *          mesmo motivo, do `numeroDoCampo` da `/planilha`.
 */
export const numeroDoEncerrante = (texto: string | undefined | null): number | null => {
    if (!texto) return null;
    const limpo = texto.trim();
    if (limpo === '') return null;
    const n = parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
};
