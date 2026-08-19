/**
 * Estado de React que sobrevive à troca de tela.
 *
 * @remarks
 * Existe porque toda tela do painel guardava a data num `useState` inicializado em `hojeIso()`.
 * Sair da tela desmonta o componente, o estado morre, e voltar recomeça em hoje — o usuário
 * escolhia maio, ia conferir outra coisa, voltava e estava em agosto de novo.
 *
 * **A duração é escolha por chave, e as duas existem por motivo oposto.**
 *
 * `'sessao'` (padrão, `sessionStorage`) é o certo para **data selecionada**: precisa durar a
 * sessão de trabalho, mas **não** o dia seguinte. Um painel de posto que abre pela manhã na data
 * de ontem é armadilha, porque a tela parece atual e não está. Fechar a aba zera; trocar de
 * tela, não.
 *
 * `'permanente'` (`localStorage`) é o certo para **rascunho digitado** — preço do dia, por
 * exemplo. Ali a lógica se inverte: o que o usuário digitou e ainda não salvou não pode morrer
 * porque uma aba fechou. Quem faz replay de período trabalha por dias, não por aba, e perder
 * quatro preços e seis encerrantes em silêncio custa mais que qualquer conveniência.
 *
 * Em 19/08/2026 este arquivo quase virou `localStorage` inteiro para resolver o preço — o que
 * teria devolvido a armadilha da data. Por isso a escolha desceu para a chamada.
 */
import { useState, useCallback } from 'react';

/** Prefixo das chaves, para não colidir com o que outra coisa guarde na sessão. */
const PREFIXO = 'posto:';

/** `sessao` morre ao fechar a aba; `permanente` sobrevive. Ver o @remarks acima. */
export type DuracaoEstado = 'sessao' | 'permanente';

const cofre = (duracao: DuracaoEstado): Storage =>
  duracao === 'permanente' ? localStorage : sessionStorage;

function ler<T>(chave: string, duracao: DuracaoEstado): T | undefined {
  try {
    const bruto = cofre(duracao).getItem(PREFIXO + chave);
    return bruto === null ? undefined : (JSON.parse(bruto) as T);
  } catch {
    // Sessão indisponível (modo privado, cota) ou JSON corrompido: cai no valor inicial.
    return undefined;
  }
}

function gravar<T>(chave: string, valor: T, duracao: DuracaoEstado): void {
  try {
    cofre(duracao).setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    // Não poder gravar degrada a lembrança, não quebra a tela.
  }
}

/**
 * Como `useState`, mas lembra o valor entre montagens da mesma sessão.
 *
 * @param chave - Identidade do estado. Chave compartilhada = estado compartilhado entre telas.
 * @param inicial - Só é chamado quando não há nada guardado.
 * @param duracao - `'sessao'` (padrão) morre ao fechar a aba; `'permanente'` sobrevive. A
 *                  escolha não é de gosto: data selecionada tem de morrer, rascunho digitado
 *                  não pode. Ver o @remarks do topo do arquivo.
 *
 * @remarks
 * O setter aceita função atualizadora (`(atual) => novo`), igual ao `useState`.
 * **Use a forma de função sempre que o novo valor depender do atual e a
 * chamada puder repetir em sequência síncrona** (ex.: um `forEach` aplicando
 * preço em vários bicos de uma vez) — passar o valor pronto lê `valor` de uma
 * closure presa ao render anterior, e a segunda chamada pisa no resultado da
 * primeira porque as duas partem do mesmo estado "antigo". A forma de função
 * sempre parte do estado mais recente, mesmo entre chamadas do mesmo lote.
 */
export function useEstadoPersistido<T>(
  chave: string,
  inicial: () => T,
  duracao: DuracaoEstado = 'sessao'
): [T, (valor: T | ((atual: T) => T)) => void] {
  const [valor, definirValor] = useState<T>(() => ler<T>(chave, duracao) ?? inicial());

  const definir = useCallback(
    (novoOuAtualizador: T | ((atual: T) => T)) => {
      definirValor(atual => {
        const novo =
          typeof novoOuAtualizador === 'function'
            ? (novoOuAtualizador as (atual: T) => T)(atual)
            : novoOuAtualizador;
        gravar(chave, novo, duracao);
        return novo;
      });
    },
    [chave, duracao]
  );

  return [valor, definir];
}
