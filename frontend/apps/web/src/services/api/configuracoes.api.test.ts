import { describe, expect, it } from 'vitest';
import { corpoDaForma, corpoDosParametros, paraFormaDaTela } from './configuracoes.api';

describe('configuracoes.api — a borda da tela Configurações com a API', () => {
    it('forma da API vira a da tela; taxa "3.50" vira 3.5 e nula vira 0; tipo "venda" passa como veio', () => {
        expect(paraFormaDaTela({ id: 7, nome: 'Crédito', tipo: 'venda', ativo: true, taxa: '3.50' }))
            .toEqual({ id: '7', name: 'Crédito', type: 'venda', tax: 3.5, active: true });
        expect(paraFormaDaTela({ id: 8, nome: 'Dinheiro', tipo: 'venda', ativo: false, taxa: null }).tax).toBe(0);
    });

    it('formulário vira o corpo: nome aparado, taxa com 2 casas, negativa ou inválida vira 0', () => {
        expect(corpoDaForma({ name: ' Pix ', type: 'pix', tax: 0.99, active: true })).toEqual({ nome: 'Pix', tipo: 'pix', taxa: '0.99', ativo: true });
        expect(corpoDaForma({ name: 'X', type: 'outros', tax: 3.5, active: false }).taxa).toBe('3.50');
        expect(corpoDaForma({ name: 'X', type: 'outros', tax: Number.NaN, active: true }).taxa).toBe('0.00');
    });

    it('parâmetros: tolerância com vírgula vira ponto, dias viram inteiro', () => {
        expect(corpoDosParametros('50,00', '3', '7')).toEqual({ tolerancia_divergencia: '50.00', dias_estoque_critico: 3, dias_estoque_baixo: 7 });
    });
});
