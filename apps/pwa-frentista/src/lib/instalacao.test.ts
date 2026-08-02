import { describe, it, expect } from 'vitest';
import { detectarPlataforma, jaInstalado, decidirConvite } from './instalacao';

// User agents reais, copiados de aparelhos, não inventados. Se algum dia um
// frentista aparecer com aparelho que não casa, o certo é somar o UA dele aqui.
const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadOS:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 13; SM-A235M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  desktopChrome:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
} as const;

describe('detectarPlataforma', () => {
  it('reconhece iPhone', () => {
    expect(detectarPlataforma(UA.iphoneSafari, 5)).toBe('ios');
  });

  it('reconhece Android', () => {
    expect(detectarPlataforma(UA.androidChrome, 5)).toBe('android');
  });

  it('trata desktop como "outra"', () => {
    expect(detectarPlataforma(UA.desktopChrome, 0)).toBe('outra');
  });

  // iPadOS 13+ mente no user agent: se diz "Macintosh", igualzinho a um Mac.
  // O que separa os dois é a tela ser sensível ao toque. Sem esse desempate o
  // iPad cai em "outra" e o frentista nunca vê como instalar.
  it('reconhece iPad mesmo se declarando Macintosh, pelo toque', () => {
    expect(detectarPlataforma(UA.ipadOS, 5)).toBe('ios');
  });

  it('não confunde Mac de verdade com iPad — Mac não tem toque', () => {
    expect(detectarPlataforma(UA.ipadOS, 0)).toBe('outra');
  });
});

describe('jaInstalado', () => {
  it('detecta app aberto em janela própria pelo display-mode', () => {
    expect(jaInstalado({ standalonePorMedia: true })).toBe(true);
  });

  // No iOS o display-mode não é confiável; o Safari expõe navigator.standalone.
  it('detecta instalado no iOS por navigator.standalone', () => {
    expect(jaInstalado({ standalonePorMedia: false, standalonePorNavigator: true })).toBe(true);
  });

  it('no navegador comum, não está instalado', () => {
    expect(jaInstalado({ standalonePorMedia: false, standalonePorNavigator: false })).toBe(false);
  });

  it('ausência de navigator.standalone não conta como instalado', () => {
    expect(jaInstalado({ standalonePorMedia: false })).toBe(false);
  });
});

describe('decidirConvite', () => {
  const base = {
    plataforma: 'android' as const,
    instalado: false,
    temPromptNativo: false,
    dispensado: false,
  };

  it('some quando o app já está instalado', () => {
    expect(decidirConvite({ ...base, instalado: true, temPromptNativo: true })).toBe('oculto');
  });

  it('some quando o usuário já dispensou', () => {
    expect(decidirConvite({ ...base, temPromptNativo: true, dispensado: true })).toBe('oculto');
  });

  it('oferece o botão nativo quando o navegador disponibilizou o prompt', () => {
    expect(decidirConvite({ ...base, temPromptNativo: true })).toBe('botao');
  });

  // O iOS nunca dispara beforeinstallprompt. Esperar por ele é o erro clássico
  // que faz o convite nunca aparecer em iPhone — lá só resta ensinar o caminho.
  it('ensina o passo a passo no iOS, que não tem prompt nativo', () => {
    expect(decidirConvite({ ...base, plataforma: 'ios' })).toBe('instrucoes-ios');
  });

  it('não ensina passo a passo de iOS se o app já está instalado', () => {
    expect(decidirConvite({ ...base, plataforma: 'ios', instalado: true })).toBe('oculto');
  });

  it('fica oculto no Android enquanto o prompt não chegou', () => {
    expect(decidirConvite(base)).toBe('oculto');
  });

  it('fica oculto no desktop sem prompt', () => {
    expect(decidirConvite({ ...base, plataforma: 'outra' })).toBe('oculto');
  });
});
