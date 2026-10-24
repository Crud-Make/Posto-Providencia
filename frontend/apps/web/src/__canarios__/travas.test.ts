import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  ARGS_ESLINT,
  coletar,
  comparar,
  compararContagens,
  contar,
  lerDaRef,
  lerDir,
  main,
  parseMedida,
  parseTsc,
  verificarBase,
} from '../../../../scripts/catraca.mjs';

/**
 * Canários das travas de lint (PROC-5 de `docs/arquitetura/regras.md`).
 *
 * Cada teste aqui roda o ESLint **com a config real do monorepo** contra um fixture que
 * viola a regra de propósito, e exige que a regra acuse. Se alguém desligar a regra,
 * remover o plugin ou quebrar o `projectService`, o teste falha — em vez de o CI
 * continuar verde sobre um gate que parou de olhar.
 *
 * É o mesmo padrão de `.claude/hooks/testa-hooks.py`, que já faz isto com os hooks.
 */

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

type Mensagem = { ruleId: string | null; line: number; message: string };
type ResultadoEslint = { filePath: string; messages: Mensagem[] };

/** Roda o eslint nos caminhos (absolutos) e devolve os resultados em JSON. `--no-ignore` porque
 *  os fixtures estão em `ignores` para ficar fora do lint normal. */
function lintarCaminhos(alvos: string[]): ResultadoEslint[] {
  try {
    const saida = execFileSync(
      'bunx',
      ['eslint', '--no-ignore', '--format', 'json', ...alvos],
      { cwd: RAIZ, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return JSON.parse(saida) as ResultadoEslint[];
  } catch (erro) {
    // O eslint sai com código 1 quando encontra erro — que é exatamente o caso esperado.
    const comSaida = erro as { stdout?: string };
    if (typeof comSaida.stdout === 'string' && comSaida.stdout.trim() !== '') {
      return JSON.parse(comSaida.stdout) as ResultadoEslint[];
    }
    throw erro;
  }
}

/** Um fixture só, por caminho relativo à raiz do frontend. */
function lintarFixture(relativo: string): ResultadoEslint[] {
  return lintarCaminhos([path.join(RAIZ, relativo)]);
}

/** Mensagens de uma regra num arquivo do resultado, pelo fim do caminho. */
function mensagensDe(resultado: ResultadoEslint[], fimDoCaminho: string, regra: string): Mensagem[] {
  return resultado.find((r) => r.filePath.endsWith(fimDoCaminho))?.messages.filter((m) => m.ruleId === regra) ?? [];
}

/** Função com CCN `ccn` (1 + (ccn − 1) `if`), para gerar arquivo em tempo de teste. */
function funcaoComCcn(nome: string, ccn: number): string {
  const ifs = Array.from({ length: ccn - 1 }, (_, i) => `  if (n > ${i + 1}) r += 1;`).join('\n');
  return `export function ${nome}(n: number): number {\n  let r = 0;\n${ifs}\n  return r;\n}\n`;
}

/** Arquivo com exatamente `total` linhas físicas: 1 de código + (total − 1) de comentário. */
function arquivoComLinhas(total: number): string {
  return `export const a = 1;\n${'// linha\n'.repeat(total - 1)}`;
}

describe('canário: neverthrow/must-use-result (RES-2)', () => {
  const resultado = lintarFixture('apps/web/src/__canarios__/neverthrow-must-use-result.fixture.ts');
  const acusacoes = resultado[0]?.messages.filter((m) => m.ruleId === 'neverthrow/must-use-result') ?? [];

  it('acusa o Result que foi descartado', () => {
    expect(acusacoes.length).toBeGreaterThan(0);
  });

  it('não acusa o Result consumido com match', () => {
    // `trataOResultado` usa `.match()`. Se a regra acusasse as duas, ela estaria
    // reprovando tudo — verde por acidente do outro lado.
    expect(acusacoes.length).toBe(1);
  });
}, 120_000);

describe('canário: FSD, promise solta e booleano estrito (18/09)', () => {
  // O fixture mora DENTRO de uma camada (widgets/) porque a regra do boundaries só vale
  // para arquivo classificado como elemento. Em apps/web/src/__canarios__ ele não acusaria.
  const resultado = lintarFixture('apps/web/src/widgets/__canarios__/fsd.fixture.ts');
  const mensagens = resultado[0]?.messages ?? [];
  const linhasDe = (regra: string) => mensagens.filter((m) => m.ruleId === regra).map((m) => m.line);

  it('camada de baixo importando a de cima (widget → page)', () => {
    expect(linhasDe('boundaries/dependencies')).toContain(3);
  });

  it('slice vizinho da mesma camada (widget → widget)', () => {
    expect(linhasDe('boundaries/dependencies')).toContain(4);
  });

  it('import de arquivo interno em vez da Public API', () => {
    expect(linhasDe('no-restricted-imports')).toContain(4);
  });

  it('import de arquivo interno pelo alias @/ (o tsconfig tem @/* e @widgets/*)', () => {
    expect(linhasDe('no-restricted-imports')).toEqual([4, 6]);
  });

  it('legado fora das camadas continua livre (strangler)', () => {
    expect(mensagens.filter((m) => m.line === 5)).toEqual([]);
  });

  it('promise solta', () => {
    expect(linhasDe('@typescript-eslint/no-floating-promises')).toEqual([12]);
  });

  it('número como condição — o R$ 0,00 falsy', () => {
    expect(linhasDe('@typescript-eslint/strict-boolean-expressions')).toEqual([15]);
  });
}, 120_000);

describe('canário: eslint-disable não esconde erro da catraca (18/09)', () => {
  const fixture = path.join(RAIZ, 'apps/web/src/__canarios__/eslint-disable.fixture.ts');
  /** Linhas de no-explicit-any que o eslint acusa no fixture com estes argumentos. */
  function linhasAny(args: string[]): number[] {
    let saida = '';
    try {
      saida = execFileSync('bunx', ['eslint', ...args, '--no-ignore', fixture], {
        cwd: RAIZ,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (erro) {
      saida = String((erro as { stdout?: string }).stdout ?? '');
    }
    const resultado = JSON.parse(saida) as Array<{ messages: Array<{ ruleId: string | null; line: number }> }>;
    return (resultado[0]?.messages ?? [])
      .filter((m) => m.ruleId === '@typescript-eslint/no-explicit-any')
      .map((m) => m.line);
  }

  it('com os argumentos da catraca, os dois any suprimidos aparecem', () => {
    expect(linhasAny([...ARGS_ESLINT])).toEqual([4, 6]);
  });

  it('sem --no-inline-config eles somem — prova de que o fixture esconde de verdade', () => {
    expect(linhasAny(ARGS_ESLINT.filter((a) => a !== '--no-inline-config'))).toEqual([]);
  });
}, 120_000);

describe('canário: flags estritas do tsconfig', () => {
  it('índice de array é T | undefined (noUncheckedIndexedAccess)', () => {
    // Projeto temporário que HERDA o tsconfig real: se alguém desligar a flag lá, o
    // erro some daqui e o teste falha.
    const dir = mkdtempSync(path.join(RAIZ, '.canario-tsc-'));
    try {
      writeFileSync(path.join(dir, 'a.ts'), 'export const f = (xs: number[]): number => xs[0] + 1;\n');
      writeFileSync(
        path.join(dir, 'tsconfig.json'),
        JSON.stringify({ extends: '../tsconfig.json', include: ['a.ts'], compilerOptions: { paths: {} } }),
      );
      let saida = '';
      try {
        execFileSync(path.join(RAIZ, 'node_modules/.bin/tsc'), ['--noEmit', '-p', dir], { encoding: 'utf-8' });
      } catch (erro) {
        saida = String((erro as { stdout?: string }).stdout ?? '');
      }
      expect(saida).toMatch(/TS2532|TS18048/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}, 120_000);

describe('catraca: só erro novo reprova', () => {
  const v = (arquivo: string, regra: string, linha = 1) => ({ arquivo, regra, linha, mensagem: '' });

  it('dívida congelada passa', () => {
    const r = comparar([v('a.ts', 'X'), v('a.ts', 'X', 2)], { 'a.ts|X': 2 });
    expect(r.novas).toEqual([]);
  });

  it('um erro a mais da mesma regra no mesmo arquivo reprova', () => {
    const r = comparar([v('a.ts', 'X'), v('a.ts', 'X', 2), v('a.ts', 'X', 3)], { 'a.ts|X': 2 });
    expect(r.novas).toEqual([{ chave: 'a.ts|X', antes: 2, agora: 3 }]);
  });

  it('regra nova num arquivo com dívida reprova', () => {
    expect(comparar([v('a.ts', 'Y')], { 'a.ts|X': 5 }).novas).toHaveLength(1);
  });

  it('erro de config do tsc (sem arquivo) não some na leitura', () => {
    expect(parseTsc("error TS5023: Unknown compiler option 'x'.")).toHaveLength(1);
  });

  it('lint parcial não acusa baixa de arquivo fora do escopo', () => {
    const r = comparar([], { 'a.ts|X': 1, 'b.ts|X': 1 }, (a) => a === 'a.ts');
    expect(r.baixaram.map((b) => b.chave)).toEqual(['a.ts|X']);
  });
});

describe('catraca de medida: o valor congelado não pode crescer (19/09)', () => {
  // Regras de medida (complexity, max-lines, max-lines-per-function) congelam o VALOR, não só
  // a quantidade. Antes, uma função congelada em CCN 27 podia ir a 40 e passar verde.
  const m = (arquivo: string, valor: number, regra = 'complexity', linha = 1) => ({
    arquivo,
    regra,
    linha,
    mensagem: regra === 'complexity' ? `f has a complexity of ${valor}. Maximum allowed is 10.` : `f has too many lines (${valor}). Maximum allowed is 60.`,
  });

  it('parseMedida lê as três mensagens do ESLint 9.39.2', () => {
    expect(parseMedida('complexity', 'Function f has a complexity of 27. Maximum allowed is 10.')).toBe(27);
    expect(parseMedida('max-lines', 'File has too many lines (345). Maximum allowed is 300.')).toBe(345);
    expect(parseMedida('max-lines-per-function', 'Arrow function has too many lines (74). Maximum allowed is 60.')).toBe(74);
  });

  it('regra que não é medida devolve null e continua contada por quantidade', () => {
    expect(parseMedida('@typescript-eslint/no-explicit-any', 'complexity of 3')).toBeNull();
    expect(contar([m('a.ts', 3, '@typescript-eslint/no-explicit-any')])).toEqual({ 'a.ts|@typescript-eslint/no-explicit-any': 1 });
  });

  it('contar guarda a lista de valores em ordem decrescente', () => {
    expect(contar([m('a.ts', 12), m('a.ts', 27), m('a.ts', 14)])).toEqual({ 'a.ts|complexity': [27, 14, 12] });
  });

  it('mensagem de medida sem número falha alto em vez de congelar zero', () => {
    expect(() => contar([{ arquivo: 'a.ts', regra: 'complexity', linha: 1, mensagem: 'texto mudou' }])).toThrow(/parseMedida/);
  });

  it('função congelada que CRESCE reprova: [25] → [26]', () => {
    const r = comparar([m('a.ts', 26)], { 'a.ts|complexity': [25] });
    expect(r.novas).toEqual([{ chave: 'a.ts|complexity', antes: [25], agora: [26] }]);
    expect(r.detalhe).toHaveLength(1);
  });

  it('função congelada que DIMINUI passa e pede atualizar: [25] → [20]', () => {
    const r = comparar([m('a.ts', 20)], { 'a.ts|complexity': [25] });
    expect(r.novas).toEqual([]);
    expect(r.baixaram).toEqual([{ chave: 'a.ts|complexity', antes: [25], agora: [20] }]);
  });

  it('função nova acima do teto num arquivo já congelado reprova: [27] → [27, 12]', () => {
    const r = comparar([m('a.ts', 27), m('a.ts', 12)], { 'a.ts|complexity': [27] });
    expect(r.novas).toEqual([{ chave: 'a.ts|complexity', antes: [27], agora: [27, 12] }]);
  });

  it('a que era menor cresceu enquanto a maior encolheu: [27, 14] → [20, 15] reprova', () => {
    // Lista decrescente comparada posição a posição: só passa se cada função de hoje cabe
    // numa vaga congelada de valor igual ou maior. 15 não cabe em 14.
    expect(comparar([m('a.ts', 20), m('a.ts', 15)], { 'a.ts|complexity': [27, 14] }).novas).toHaveLength(1);
    expect(comparar([m('a.ts', 14), m('a.ts', 10)], { 'a.ts|complexity': [27, 14] }).novas).toEqual([]);
  });

  it('vale igual para max-lines-per-function', () => {
    expect(comparar([m('a.ts', 74, 'max-lines-per-function')], { 'a.ts|max-lines-per-function': [70] }).novas).toHaveLength(1);
    expect(comparar([m('a.ts', 70, 'max-lines-per-function')], { 'a.ts|max-lines-per-function': [70] }).novas).toEqual([]);
  });

  it('número sob regra de medida é formato antigo, sem valor: a lista atual conta como nova', () => {
    expect(comparar([m('a.ts', 27)], { 'a.ts|complexity': 1 }).novas).toHaveLength(1);
  });

  it('chave numérica antiga segue funcionando ao lado da lista', () => {
    const r = comparar([m('a.ts', 27), m('a.ts', 1, 'X')], { 'a.ts|complexity': [27], 'a.ts|X': 1 });
    expect(r.novas).toEqual([]);
    expect(r.baixaram).toEqual([]);
  });

  it('número dos DOIS lados sob regra de medida (formato antigo × antigo) compara quantidade', () => {
    // Falso vermelho de 19/09: {'a.ts|complexity': 3} igual nos dois lados dava "base [] → árvore 3".
    // É o verificar-base entre duas listas anteriores à catraca de medida.
    expect(compararContagens({ 'a.ts|complexity': 3 }, { 'a.ts|complexity': 3 })).toEqual({ novas: [], baixaram: [] });
    expect(compararContagens({ 'a.ts|complexity': 4 }, { 'a.ts|complexity': 3 }).novas).toEqual([{ chave: 'a.ts|complexity', antes: 3, agora: 4 }]);
    expect(compararContagens({ 'a.ts|complexity': 2 }, { 'a.ts|complexity': 3 }).baixaram).toEqual([{ chave: 'a.ts|complexity', antes: 3, agora: 2 }]);
    expect(compararContagens({}, { 'a.ts|complexity': 3 }).baixaram).toEqual([{ chave: 'a.ts|complexity', antes: 3, agora: 0 }]);
  });

  it('lista congelada trocada por número à mão é regressão de formato: reprova', () => {
    // O valor congelado se perdeu — "1" não diz mais que a função estava em 27.
    expect(compararContagens({ 'a.ts|complexity': 1 }, { 'a.ts|complexity': [27] }).novas).toHaveLength(1);
  });
});

describe('catraca: recusas do --atualizar (sem teste até 19/09)', () => {
  const v = { arquivo: 'a.ts', regra: 'X', linha: 1, mensagem: '' };
  const deps = (congelado: Record<string, number | number[]>, atuais: (typeof v)[]) => ({
    coletar: vi.fn(() => atuais),
    ler: vi.fn(() => congelado),
    gravar: vi.fn(),
    lerDaRef: vi.fn(() => () => ({})),
    log: vi.fn(),
    erro: vi.fn(),
    env: {},
  });

  it('--atualizar com lista parcial devolve 2 sem rodar a ferramenta', () => {
    const d = deps({}, []);
    expect(main(['eslint', '--atualizar', 'a.ts'], d)).toBe(2);
    expect(d.coletar).not.toHaveBeenCalled();
    expect(d.gravar).not.toHaveBeenCalled();
  });

  it('--atualizar com dívida nova sem --aceitar-divida devolve 1 e não regrava', () => {
    const d = deps({ 'a.ts|X': 1 }, [v, { ...v, linha: 2 }]);
    expect(main(['eslint', '--atualizar'], d)).toBe(1);
    expect(d.gravar).not.toHaveBeenCalled();
  });

  it('--atualizar --aceitar-divida regrava', () => {
    const d = deps({ 'a.ts|X': 1 }, [v, { ...v, linha: 2 }]);
    expect(main(['eslint', '--atualizar', '--aceitar-divida'], d)).toBe(0);
    expect(d.gravar).toHaveBeenCalledWith('eslint', { 'a.ts|X': 2 });
  });

  it('--atualizar só para baixo regrava', () => {
    const d = deps({ 'a.ts|X': 3 }, [v]);
    expect(main(['eslint', '--atualizar'], d)).toBe(0);
    expect(d.gravar).toHaveBeenCalledWith('eslint', { 'a.ts|X': 1 });
  });

  it('erro novo sem --atualizar devolve 1', () => {
    expect(main(['eslint'], deps({}, [v]))).toBe(1);
  });
});

describe('catraca: verificar-base (a lista não sobe à mão)', () => {
  // Dois .catraca/ em diretórios temporários: o da "árvore" e o da "base". Chave que subiu
  // ou apareceu reprova; que desceu passa. É o que o CI roda contra a base do PR.
  function comDiretorios(arvore: object, base: object, aceitaDivida = false): number {
    const raiz = mkdtempSync(path.join(RAIZ, '.canario-catraca-'));
    try {
      for (const [nome, conteudo] of [['arvore', arvore], ['base', base]] as const) {
        const dir = path.join(raiz, nome);
        mkdirSync(dir);
        writeFileSync(path.join(dir, 'eslint.json'), JSON.stringify(conteudo));
      }
      return verificarBase(lerDir(path.join(raiz, 'arvore')), lerDir(path.join(raiz, 'base')), { aceitaDivida, log: () => {}, erro: () => {} });
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  }

  it('subiu → 1', () => {
    expect(comDiretorios({ 'a.ts|X': 3 }, { 'a.ts|X': 2 })).toBe(1);
  });

  it('desceu → 0', () => {
    expect(comDiretorios({ 'a.ts|X': 1 }, { 'a.ts|X': 2 })).toBe(0);
  });

  it('chave nova → 1', () => {
    expect(comDiretorios({ 'a.ts|X': 1, 'b.ts|X': 1 }, { 'a.ts|X': 1 })).toBe(1);
  });

  it('valor de medida que cresceu → 1; que encolheu → 0', () => {
    expect(comDiretorios({ 'a.ts|complexity': [30] }, { 'a.ts|complexity': [27] })).toBe(1);
    expect(comDiretorios({ 'a.ts|complexity': [20] }, { 'a.ts|complexity': [27] })).toBe(0);
  });

  it('ACEITA_DIVIDA libera a subida', () => {
    expect(comDiretorios({ 'a.ts|X': 3 }, { 'a.ts|X': 2 }, true)).toBe(0);
  });

  it('listas iguais, e tsc.json ausente dos dois lados, → 0', () => {
    expect(comDiretorios({}, {})).toBe(0);
  });

  it('chave de medida em número igual dos dois lados (formato antigo) → 0', () => {
    // Reproduzido em 19/09 com exit 1 e "base [] → árvore 3" antes do conserto.
    expect(comDiretorios({ 'a.ts|complexity': 3 }, { 'a.ts|complexity': 3 })).toBe(0);
    expect(comDiretorios({ 'a.ts|complexity': 4 }, { 'a.ts|complexity': 3 })).toBe(1);
  });
});

describe('catraca: lerDaRef distingue ref inválida de lista ausente na ref (19/09)', () => {
  // Os dois caminhos continuam fail-closed (`{}` = nada congelado, toda chave conta como nova);
  // o que muda é a mensagem — antes um fetch raso sem a base parecia dívida nova no CI.
  it('ref que não existe → {} e avisa "ref inválida"', () => {
    const erro = vi.fn();
    expect(lerDaRef('canario-ref-que-nao-existe', erro)('eslint')).toEqual({});
    expect(erro).toHaveBeenCalledTimes(1);
    expect(String(erro.mock.calls[0]?.[0])).toMatch(/ref inválida: "canario-ref-que-nao-existe"/);
  });

  it('ref válida sem a lista → {} e avisa que a ref existe mas não tem o arquivo', () => {
    const erro = vi.fn();
    expect(lerDaRef('HEAD', erro)('ferramenta-inexistente')).toEqual({});
    expect(erro).toHaveBeenCalledTimes(1);
    expect(String(erro.mock.calls[0]?.[0])).toMatch(/HEAD existe, mas não tem \.catraca\/ferramenta-inexistente\.json/);
  });

  it('ref válida com a lista → a lista, sem aviso', () => {
    const erro = vi.fn();
    const lista = lerDaRef('HEAD', erro)('eslint') as Record<string, unknown>;
    expect(Object.keys(lista).length).toBeGreaterThan(0);
    expect(erro).not.toHaveBeenCalled();
  });
});

describe('canário: tetos de complexidade e tamanho — Q-1, Q-2, Q-3 (19/09)', () => {
  // Fixtures fixos (em __canarios__, fora do lint normal pelo `ignores`) e arquivos GERADOS numa
  // pasta temporária dentro de apps/web/src — onde o `files` do bloco de tamanho alcança e o
  // tsconfig da raiz inclui, para o projectService reconhecer o arquivo.
  const dir = mkdtempSync(path.join(RAIZ, 'apps/web/src/canario-tetos-'));
  const arquivo = (nome: string, conteudo: string): string => {
    const p = path.join(dir, nome);
    writeFileSync(p, conteudo);
    return p;
  };
  let resultado: ResultadoEslint[] = [];
  try {
    const gerados = [
      arquivo('arquivo-301.ts', arquivoComLinhas(301)),
      arquivo('arquivo-300.ts', arquivoComLinhas(300)),
      // Teste: 301 linhas físicas E função de 61 linhas úteis (fora dos tetos de tamanho), mas
      // com CCN 11 (dentro do teto de complexidade). Tudo no mesmo arquivo.
      arquivo(
        'teste-fora-do-tamanho.test.ts',
        `${funcaoComCcn('onzeNoTeste', 11)}export function longa(): number {\n  let n = 0;\n${'  n += 1;\n'.repeat(57)}  return n;\n}\n${'// linha\n'.repeat(301 - 14 - 61)}`,
      ),
    ];
    resultado = lintarCaminhos([
      path.join(RAIZ, 'apps/web/src/__canarios__/complexidade-11.fixture.ts'),
      path.join(RAIZ, 'apps/web/src/__canarios__/funcao-61-linhas.fixture.ts'),
      ...gerados,
    ]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  it('Q-1: função de CCN 11 é acusada com o valor; a de CCN 10 não', () => {
    const acusacoes = mensagensDe(resultado, 'complexidade-11.fixture.ts', 'complexity');
    expect(acusacoes.map((m) => m.line)).toEqual([22]); // `onze`; `dez` está na linha 8
    expect(acusacoes[0]?.message).toMatch(/complexity of 11\. Maximum allowed is 10\./);
  });

  it('Q-3: função de 61 linhas úteis é acusada; a de 60 úteis (73 físicas) não', () => {
    const acusacoes = mensagensDe(resultado, 'funcao-61-linhas.fixture.ts', 'max-lines-per-function');
    expect(acusacoes.map((m) => m.line)).toEqual([84]); // `sessentaEUma`; `sessenta` está na linha 10
    expect(acusacoes[0]?.message).toMatch(/too many lines \(61\)\. Maximum allowed is 60\./);
  });

  it('Q-2: arquivo de 301 linhas FÍSICAS (300 de comentário) é acusado; o de 300 não', () => {
    const de301 = mensagensDe(resultado, 'arquivo-301.ts', 'max-lines');
    expect(de301.map((m) => m.message)).toEqual(['File has too many lines (301). Maximum allowed is 300.']);
    expect(mensagensDe(resultado, 'arquivo-300.ts', 'max-lines')).toEqual([]);
  });

  it('teste fica fora dos tetos de tamanho, mas dentro do de complexidade', () => {
    expect(mensagensDe(resultado, 'teste-fora-do-tamanho.test.ts', 'max-lines')).toEqual([]);
    expect(mensagensDe(resultado, 'teste-fora-do-tamanho.test.ts', 'max-lines-per-function')).toEqual([]);
    expect(mensagensDe(resultado, 'teste-fora-do-tamanho.test.ts', 'complexity').map((m) => m.line)).toEqual([1]);
  });

  it('os tetos saíram do oxlint: .oxlintrc.json não tem complexity nem max-lines nem isenções', () => {
    // Sem isto os dois lints poderiam divergir (o oxlint tinha teto 20 e 13 arquivos em 35).
    const oxlintrc = JSON.parse(readFileSync(path.join(RAIZ, '.oxlintrc.json'), 'utf-8')) as {
      rules?: Record<string, unknown>;
      overrides?: unknown[];
    };
    expect(Object.keys(oxlintrc.rules ?? {})).not.toContain('eslint/complexity');
    expect(Object.keys(oxlintrc.rules ?? {})).not.toContain('eslint/max-lines');
    expect(oxlintrc.overrides ?? []).toEqual([]);
  });
}, 300_000);

describe('canário real da catraca: o teto barra pelo lint:eslint, não só pelo eslint (19/09)', () => {
  // Aqui roda a CATRACA de verdade (`scripts/catraca.mjs eslint <arquivo>`, o mesmo comando do
  // hook trava-ts.py, do pre-commit e do `bun run lint:eslint`) contra um arquivo gerado. Os
  // testes de `comparar` acima provam a aritmética; este prova a cadeia inteira: ESLint real,
  // config real, parseMedida real, lista real.
  const dir = mkdtempSync(path.join(RAIZ, 'apps/web/src/canario-catraca-real-'));
  const novo = path.join(dir, 'novo-ccn-11.ts');
  const congelada = path.join(dir, 'congelada-ccn-12.ts');
  writeFileSync(novo, funcaoComCcn('onze', 11));
  writeFileSync(congelada, funcaoComCcn('doze', 12));
  const relNovo = path.relative(RAIZ, novo);
  const relCongelada = path.relative(RAIZ, congelada);

  /** `bun scripts/catraca.mjs eslint <arquivo>` com a lista congelada REAL; devolve exit e saída. */
  function catracaReal(rel: string): { status: number; saida: string } {
    try {
      const saida = execFileSync('bun', ['scripts/catraca.mjs', 'eslint', rel], { cwd: RAIZ, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
      return { status: 0, saida };
    } catch (erro) {
      const e = erro as { status?: number; stdout?: string; stderr?: string };
      return { status: e.status ?? -1, saida: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
  }

  /** `main` com o ESLint real (`coletar`) e SÓ a lista congelada trocada. */
  function comListaCongelada(rel: string, congelado: Record<string, number | number[]>): { codigo: number; erros: string[] } {
    const erro = vi.fn();
    const codigo = main(['eslint', rel], {
      coletar,
      ler: () => congelado,
      gravar: vi.fn(),
      lerDaRef: vi.fn(() => () => ({})),
      log: vi.fn(),
      erro,
      env: {},
    });
    return { codigo, erros: erro.mock.calls.map((c) => String(c[0])) };
  }

  let novoReal: { status: number; saida: string };
  let cresceu: { codigo: number; erros: string[] };
  let igual: { codigo: number; erros: string[] };
  try {
    novoReal = catracaReal(relNovo);
    cresceu = comListaCongelada(relCongelada, { [`${relCongelada}|complexity`]: [11] });
    igual = comListaCongelada(relCongelada, { [`${relCongelada}|complexity`]: [12] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }

  it('arquivo NOVO com CCN 11 é barrado pela catraca real (exit 1, "ERRO NOVO")', () => {
    expect(novoReal.status).toBe(1);
    expect(novoReal.saida).toMatch(/ERRO NOVO/);
    expect(novoReal.saida).toMatch(/complexity {2}Function 'onze' has a complexity of 11/);
    expect(novoReal.saida).toContain(`${relNovo}|complexity: congelado [], agora [11]`);
  });

  it('função congelada em 11 que CRESCE para 12 é barrada', () => {
    expect(cresceu.codigo).toBe(1);
    expect(cresceu.erros.join('\n')).toContain(`${relCongelada}|complexity: congelado [11], agora [12]`);
  });

  it('a mesma função congelada em 12 passa', () => {
    expect(igual.codigo).toBe(0);
    expect(igual.erros).toEqual([]);
  });
}, 300_000);
