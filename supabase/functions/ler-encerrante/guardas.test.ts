import { describe, expect, it } from 'vitest';
import {
  bytesAproximados,
  corpoCabe,
  criarLimitador,
  identificarCliente,
  imagemCabe,
  LIMITE_OCR,
  LIMITE_PING,
  resolverOrigem,
  segredoConfere,
  TAMANHO_MAXIMO_BASE64,
  TAMANHO_MAXIMO_CORPO,
} from './guardas.ts';

/** Cabeçalhos falsos com a mesma interface de leitura do `Headers` do runtime. */
function cabecalhos(pares: Record<string, string>) {
  const mapa = new Map(Object.entries(pares).map(([k, v]) => [k.toLowerCase(), v]));
  return { get: (nome: string) => mapa.get(nome.toLowerCase()) ?? null };
}

const MINUTO = 60_000;

describe('criarLimitador', () => {
  it('deixa passar até o teto e nega o pedido seguinte', () => {
    const limitador = criarLimitador();
    const agora = 1_000_000;

    for (let i = 0; i < 6; i++) {
      expect(limitador.registrar('ocr:1.2.3.4', agora, LIMITE_OCR).permitido).toBe(true);
    }

    const negado = limitador.registrar('ocr:1.2.3.4', agora, LIMITE_OCR);
    expect(negado.permitido).toBe(false);
    expect(negado.esperarSegundos).toBe(60);
  });

  it('libera de novo quando a janela desliza', () => {
    const limitador = criarLimitador();
    const agora = 1_000_000;
    for (let i = 0; i < 6; i++) limitador.registrar('ocr:x', agora, LIMITE_OCR);

    expect(limitador.registrar('ocr:x', agora + MINUTO - 1, LIMITE_OCR).permitido).toBe(false);
    expect(limitador.registrar('ocr:x', agora + MINUTO + 1, LIMITE_OCR).permitido).toBe(true);
  });

  it('não deixa a tentativa negada empurrar a janela para frente', () => {
    // Sem isto, quem insiste em laço nunca mais consegue entrar — e o cliente honesto
    // que tentou cedo demais uma vez ficaria preso junto.
    const limitador = criarLimitador();
    const agora = 1_000_000;
    for (let i = 0; i < 6; i++) limitador.registrar('ocr:y', agora, LIMITE_OCR);

    for (let i = 0; i < 50; i++) limitador.registrar('ocr:y', agora + 1_000 * i, LIMITE_OCR);

    expect(limitador.registrar('ocr:y', agora + MINUTO + 1, LIMITE_OCR).permitido).toBe(true);
  });

  it('aplica o teto por hora mesmo quando o por minuto nunca estoura', () => {
    const limitador = criarLimitador();
    let agora = 1_000_000;

    // 40 leituras espaçadas de 30s: nunca passa de 6/min, mas fecha o teto de 40/h.
    for (let i = 0; i < 40; i++) {
      expect(limitador.registrar('ocr:z', agora, LIMITE_OCR).permitido).toBe(true);
      agora += 30_000;
    }

    const negado = limitador.registrar('ocr:z', agora, LIMITE_OCR);
    expect(negado.permitido).toBe(false);
    expect(negado.esperarSegundos).toBeGreaterThan(0);
  });

  it('conta cada chave separadamente', () => {
    const limitador = criarLimitador();
    const agora = 1_000_000;
    for (let i = 0; i < 6; i++) limitador.registrar('ocr:a', agora, LIMITE_OCR);

    expect(limitador.registrar('ocr:a', agora, LIMITE_OCR).permitido).toBe(false);
    expect(limitador.registrar('ocr:b', agora, LIMITE_OCR).permitido).toBe(true);
  });

  it('poda chaves vencidas ao estourar o teto de memória', () => {
    // O identificador vem de cabeçalho falsificável: sem poda, rotacionar o
    // `X-Forwarded-For` viraria vazamento de memória no isolate.
    const limitador = criarLimitador(10);
    for (let i = 0; i < 50; i++) limitador.registrar(`ocr:${i}`, 1_000_000, LIMITE_PING);

    expect(limitador.chavesVivas()).toBeLessThanOrEqual(50);

    // Muito depois da janela: a próxima poda deve varrer as antigas.
    limitador.registrar('ocr:novo', 1_000_000 + MINUTO * 10, LIMITE_PING);
    for (let i = 0; i < 11; i++) {
      limitador.registrar(`ocr:recente-${i}`, 1_000_000 + MINUTO * 10, LIMITE_PING);
    }
    expect(limitador.chavesVivas()).toBeLessThan(50);
  });
});

describe('identificarCliente', () => {
  it('usa o primeiro salto do x-forwarded-for', () => {
    expect(identificarCliente(cabecalhos({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))).toBe('203.0.113.9');
  });

  it('tolera espaço em volta', () => {
    expect(identificarCliente(cabecalhos({ 'x-forwarded-for': '  203.0.113.9  ' }))).toBe('203.0.113.9');
  });

  it('cai para os cabeçalhos alternativos', () => {
    expect(identificarCliente(cabecalhos({ 'cf-connecting-ip': '198.51.100.7' }))).toBe('198.51.100.7');
    expect(identificarCliente(cabecalhos({ 'x-real-ip': '198.51.100.8' }))).toBe('198.51.100.8');
  });

  it('devolve "desconhecido" quando não há nenhum', () => {
    expect(identificarCliente(cabecalhos({}))).toBe('desconhecido');
  });
});

describe('resolverOrigem', () => {
  it('devolve * quando a lista não está configurada — o comportamento de hoje', () => {
    expect(resolverOrigem('https://qualquer.app', undefined)).toBe('*');
    expect(resolverOrigem(null, '')).toBe('*');
    expect(resolverOrigem(null, '   ')).toBe('*');
  });

  it('devolve a origem quando ela está na lista', () => {
    const lista = 'https://painel.posto.app, https://frentista.posto.app';
    expect(resolverOrigem('https://frentista.posto.app', lista)).toBe('https://frentista.posto.app');
  });

  it('bloqueia origem fora da lista', () => {
    expect(resolverOrigem('https://invasor.exemplo', 'https://painel.posto.app')).toBeNull();
  });

  it('bloqueia pedido sem origem quando há lista', () => {
    expect(resolverOrigem(null, 'https://painel.posto.app')).toBeNull();
  });

  it('respeita * declarado explicitamente na lista', () => {
    expect(resolverOrigem('https://qualquer.app', '*')).toBe('*');
  });
});

describe('segredoConfere', () => {
  it('não bloqueia nada quando o segredo não está configurado', () => {
    expect(segredoConfere(null, undefined)).toBe(true);
    expect(segredoConfere('qualquer', '')).toBe(true);
  });

  it('exige igualdade quando está configurado', () => {
    expect(segredoConfere('abc123', 'abc123')).toBe(true);
    expect(segredoConfere('errado', 'abc123')).toBe(false);
    expect(segredoConfere(null, 'abc123')).toBe(false);
  });
});

describe('corpoCabe', () => {
  it('aceita quando o Content-Length não veio — não dá para negar o que não se sabe', () => {
    expect(corpoCabe(null)).toBe(true);
  });

  it('aceita dentro do teto e recusa acima', () => {
    expect(corpoCabe(String(TAMANHO_MAXIMO_CORPO))).toBe(true);
    expect(corpoCabe(String(TAMANHO_MAXIMO_CORPO + 1))).toBe(false);
  });

  it('ignora valor que não é número', () => {
    expect(corpoCabe('abacaxi')).toBe(true);
    expect(corpoCabe('-5')).toBe(true);
  });
});

describe('imagemCabe', () => {
  it('aceita no limite e recusa um caractere acima', () => {
    expect(imagemCabe('a'.repeat(10), 10)).toBe(true);
    expect(imagemCabe('a'.repeat(11), 10)).toBe(false);
  });

  it('usa o teto padrão quando nenhum é passado', () => {
    expect(imagemCabe('a'.repeat(1000))).toBe(true);
    expect(imagemCabe('a'.repeat(TAMANHO_MAXIMO_BASE64 + 1))).toBe(false);
  });
});

describe('bytesAproximados', () => {
  it('converte 4 caracteres de base64 em 3 bytes', () => {
    expect(bytesAproximados(4)).toBe(3);
    expect(bytesAproximados(TAMANHO_MAXIMO_BASE64)).toBe(1.5 * 1024 * 1024);
  });

  it('deixa passar a maior foto real do spike com folga', () => {
    // 582.412 caracteres é a `enc1_25jul.jpg` ANTES da redução do cliente — o pior caso
    // medido. Se este teste ficar vermelho, o teto desceu abaixo do uso real.
    expect(imagemCabe('a'.repeat(582_412))).toBe(true);
    // E a foto que o OCR acertou 6/6, com margem ainda maior.
    expect(imagemCabe('a'.repeat(159_680))).toBe(true);
  });
});
