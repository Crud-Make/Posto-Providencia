/**
 * Cores dos produtos, na ordem em que são distribuídas.
 *
 * @remarks É a faixa lateral que liga a mesma gasolina nas três tabelas e nos
 *          três painéis — sem ela, `G. Comum.` na tabela de venda e na de
 *          estoque são duas palavras iguais sem nada dizendo que são a mesma
 *          coisa. A lista dá a volta quando acabam as cores.
 *
 *          Só entra em cena quando o `Combustivel` do banco vem com `cor` nula:
 *          a cor cadastrada é a que manda, para a planilha e o resto do painel
 *          pintarem o mesmo produto do mesmo jeito.
 */
export const PALETA = ['#e11d48', '#0284c7', '#0f9d58', '#b58900', '#7c3aed', '#ea580c'] as const;
