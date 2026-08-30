import { describe, it, expect } from 'vitest';
import { decidirEstadoPush, chaveVapidParaBytes, descreverAparelho } from './push';

/** Só o que o teste precisa mudar aparece em cada caso; o resto é o caminho feliz. */
const sinais = (mudanca: Partial<Parameters<typeof decidirEstadoPush>[0]> = {}) =>
    decidirEstadoPush({
        temApi: true,
        instalado: true,
        ios: true,
        permissao: 'default',
        jaInscrito: false,
        ...mudanca,
    });

describe('decidirEstadoPush', () => {
    it('no iPhone fora da tela de início, manda instalar — não diz "sem suporte"', () => {
        // A armadilha: no Safari do iPhone a PushManager NEM EXISTE antes de
        // instalar. Ler isso como "seu aparelho não suporta" mandaria o dono
        // desistir de algo que o aparelho dele faz.
        expect(sinais({ instalado: false, temApi: false })).toBe('precisa-instalar');
    });

    it('no Android sem a API, aí sim é falta de suporte', () => {
        expect(sinais({ ios: false, temApi: false })).toBe('sem-suporte');
    });

    it('oferece o botão quando dá para pedir', () => {
        expect(sinais()).toBe('disponivel');
    });

    it('reconhece quem já está inscrito', () => {
        expect(sinais({ jaInscrito: true, permissao: 'granted' })).toBe('inscrito');
    });

    it('permissão negada vence a inscrição existente', () => {
        // Revogar a permissão não apaga a inscrição do navegador. Se o estado
        // "inscrito" ganhasse, a tela diria que está tudo certo enquanto nada
        // chega no celular.
        expect(sinais({ jaInscrito: true, permissao: 'denied' })).toBe('negado');
    });

    it('instalar vem antes de tudo no iOS, mesmo com permissão concedida', () => {
        expect(sinais({ instalado: false, permissao: 'granted' })).toBe('precisa-instalar');
    });
});

describe('chaveVapidParaBytes', () => {
    it('devolve os 65 bytes de uma chave VAPID pública real', () => {
        // Chave pública P-256 sem preenchimento e com - / _ — o formato exato
        // que o `generateVAPIDKeys` produz.
        const chave = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';

        const bytes = chaveVapidParaBytes(chave);

        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBe(65);
        expect(bytes[0]).toBe(0x04); // marcador de ponto não comprimido
    });

    it('traduz - e _ , que o atob puro recusa', () => {
        // `atob('A-B_')` estoura com InvalidCharacterError: o alfabeto do base64
        // padrão tem + e /, não - e _. É exatamente por isso que esta função
        // existe, em vez de passar a chave direto para o atob.
        expect(() => atob('A-B_')).toThrow();

        expect(Array.from(chaveVapidParaBytes('A-B_'))).toEqual(Array.from(
            Uint8Array.from(atob('A+B/'), (c) => c.charCodeAt(0)),
        ));
    });
});

describe('descreverAparelho', () => {
    it('reconhece o iPhone', () => {
        expect(descreverAparelho('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)')).toBe('iPhone');
    });

    it('cai num rótulo genérico em vez de mentir', () => {
        expect(descreverAparelho('curl/8.0')).toBe('Navegador');
    });
});
