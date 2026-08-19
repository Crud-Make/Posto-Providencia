/**
 * Estado de React que sobrevive à troca de tela.
 *
 * @remarks
 * Existe porque toda tela do painel guardava a data num `useState` inicializado em `hojeIso()`.
 * Sair da tela desmonta o componente, o estado morre, e voltar recomeça em hoje — o usuário
 * escolhia maio, ia conferir outra coisa, voltava e estava em agosto de novo.
 *
 * **`sessionStorage`, não `localStorage`, e isso é decisão.** A escolha precisa durar a sessão
 * de trabalho (é o que o usuário pediu), mas **não** o dia seguinte: um painel de posto que abre
 * pela manhã na data de ontem é armadilha, porque a tela parece atual e não está. Fechar a aba
 * zera; trocar de tela, não.
 */
import { useState, useCallback } from 'react';

/** Prefixo das chaves, para não colidir com o que outra coisa guarde na sessão. */
const PREFIXO = 'posto:';

function ler<T>(chave: string): T | undefined {
  try {
    const bruto = sessionStorage.getItem(PREFIXO + chave);
    return bruto === null ? undefined : (JSON.parse(bruto) as T);
  } catch {
    // Sessão indisponível (modo privado, cota) ou JSON corrompido: cai no valor inicial.
    return undefined;
  }
}

function gravar<T>(chave: string, valor: T): void {
  try {
    sessionStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch {
    // Não poder gravar degrada a lembrança, não quebra a tela.
  }
}

/**
 * Como `useState`, mas lembra o valor entre montagens da mesma sessão.
 *
 * @param chave - Identidade do estado. Chave compartilhada = estado compartilhado entre telas.
 * @param inicial - Só é chamado quando não há nada guardado.
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
  inicial: () => T
): [T, (valor: T | ((atual: T) => T)) => void] {
  const [valor, definirValor] = useState<T>(() => ler<T>(chave) ?? inicial());

  const definir = useCallback(
    (novoOuAtualizador: T | ((atual: T) => T)) => {
      definirValor(atual => {
        const novo =
          typeof novoOuAtualizador === 'function'
            ? (novoOuAtualizador as (atual: T) => T)(atual)
            : novoOuAtualizador;
        gravar(chave, novo);
        return novo;
      });
    },
    [chave]
  );

  return [valor, definir];
}
