import { describe, it, expect } from 'vitest';
import { analisarValor, formatarValorSimples, paraReais } from './formatters';

/**
 * Regressão dos bugs de dinheiro de 31/07/2026.
 *
 * @remarks Estes testes travam a fronteira entre as DUAS convenções que convivem no sistema:
 *          encerrante (litro, 3 casas decimais) e dinheiro (real, 2 casas). Misturar as duas
 *          já produziu valores 1000× menores e 100× maiores em produção.
 */
describe('analisarValor — convenção de ENCERRANTE, não de dinheiro', () => {
   // Este é o comportamento CORRETO e intencional para leitura de bomba: litro tem 3 casas,
   // e o operador digita o encerrante sem separador nenhum.
   it('sem vírgula, assume os últimos 3 dígitos como decimais (litros)', () => {
      expect(analisarValor('1861811422')).toBeCloseTo(1861811.422, 3);
      expect(analisarValor('2436')).toBeCloseTo(2.436, 3);
   });

   it('com vírgula, respeita o formato brasileiro', () => {
      expect(analisarValor('1.861.811,422')).toBeCloseTo(1861811.422, 3);
      expect(analisarValor('2.436,00')).toBe(2436);
      expect(analisarValor('R$ 2.436,00')).toBe(2436);
   });

   /**
    * A armadilha que causou o bug do "Auto-preencher dos Frentistas": um valor monetário
    * chegando aqui SEM vírgula sai dividido por mil. Este teste existe para que a próxima
    * pessoa veja o perigo escrito, em vez de descobrir na tela.
    */
   it('DOCUMENTA O PERIGO: valor monetário sem vírgula sai dividido por mil', () => {
      expect(analisarValor('100')).toBe(0.1);
      expect(analisarValor('50')).toBe(0.05);
      // Por isso: valor que já é `number` deve ser formatado com `paraReais`, nunca
      // convertido com `.toString()` e passado por aqui.
      expect(analisarValor(paraReais(100))).toBe(100);
      expect(analisarValor(paraReais(50))).toBe(50);
   });
});

describe('formatarValorSimples — não aceita ponto decimal', () => {
   /**
    * Regressão de `usePagamentos.carregarPagamentos`: fazia
    * `formatarValorSimples(Recebimento.valor.toFixed(2))`. O `toFixed` gera ponto decimal e
    * esta função trata TODO ponto como separador de milhar — R$ 2.436,00 salvos voltavam
    * como "R$ 243.600" na tela.
    */
   it('trata ponto como separador de milhar, então toFixed(2) corrompe o valor', () => {
      expect(formatarValorSimples('2436.00')).toBe('R$ 243.600');
      expect(formatarValorSimples('50.00')).toBe('R$ 5.000');
   });

   it('paraReais faz a ida e volta sem perder valor — é o caminho correto', () => {
      for (const salvo of [2436, 1300, 1000, 2700, 50, 7436.5]) {
         expect(analisarValor(paraReais(salvo))).toBeCloseTo(salvo, 2);
      }
   });
});
