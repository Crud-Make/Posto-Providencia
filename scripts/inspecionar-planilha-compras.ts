/**
 * Inspeciona a planilha "Posto,Jorro, 2025.xlsx" e imprime:
 * - nomes das abas
 * - ocorrências de textos relacionados a compras
 * - fórmulas encontradas (com endereço da célula)
 *
 * Objetivo: permitir comparar a lógica do app (tela /compras) com a lógica da planilha.
 */

import path from 'path';
import process from 'process';
import * as XLSX from 'xlsx';

/**
 * Estrutura do resultado de busca por texto dentro de uma célula.
 */
interface EncontradoTexto {
  sheetName: string;
  address: string;
  value: string;
}

/**
 * Estrutura do resultado de busca por fórmula dentro de uma célula.
 */
interface EncontradaFormula {
  sheetName: string;
  address: string;
  formula: string;
  value?: unknown;
}

/**
 * Parâmetros suportados via CLI.
 */
interface CliArgs {
  sheet?: string;
  cells?: string[];
  limitText?: number;
}

/**
 * Normaliza texto para busca (remove acentos básicos, lowercase e colapsa espaços).
 */
function normalizarTexto(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Determina se um valor de célula é "texto" (string) e não está vazio.
 */
function isTextoCelula(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Determina se um objeto de célula tem fórmula.
 */
function temFormula(cell: XLSX.CellObject | undefined): cell is XLSX.CellObject & { f: string } {
  return Boolean(cell && typeof cell.f === 'string' && cell.f.trim().length > 0);
}

/**
 * Faz parsing simples de argumentos do processo.
 */
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (const raw of argv) {
    if (raw.startsWith('--sheet=')) {
      args.sheet = raw.slice('--sheet='.length).trim();
      continue;
    }

    if (raw.startsWith('--cells=')) {
      const cellsRaw = raw.slice('--cells='.length);
      const cells = cellsRaw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      args.cells = cells.length > 0 ? cells : undefined;
      continue;
    }

    if (raw.startsWith('--limitText=')) {
      const n = Number(raw.slice('--limitText='.length));
      if (!Number.isNaN(n) && Number.isFinite(n) && n >= 0) {
        args.limitText = Math.floor(n);
      }
    }
  }

  return args;
}

/**
 * Imprime o objeto completo de uma célula (útil para validar se há fórmula).
 */
function imprimirCelula(sheetName: string, sheet: XLSX.WorkSheet, address: string): void {
  const cell = sheet[address] as XLSX.CellObject | undefined;
  if (!cell) {
    console.log(`[${sheetName}] ${address}: (vazio)`);
    return;
  }

  const printable = {
    t: cell.t,
    v: cell.v,
    w: (cell as unknown as { w?: unknown }).w,
    f: (cell as unknown as { f?: unknown }).f,
    z: (cell as unknown as { z?: unknown }).z,
  };
  console.log(`[${sheetName}] ${address}:`, JSON.stringify(printable));
}

/**
 * Inspeciona uma aba e retorna textos e fórmulas que "parecem" relacionadas a compras.
 */
function inspecionarAba(
  sheetName: string,
  sheet: XLSX.WorkSheet,
  termosBusca: string[]
): { textos: EncontradoTexto[]; formulas: EncontradaFormula[] } {
  const textos: EncontradoTexto[] = [];
  const formulas: EncontradaFormula[] = [];

  const termosNormalizados = termosBusca.map(normalizarTexto);

  for (const address of Object.keys(sheet)) {
    if (address.startsWith('!')) continue;
    const cell = sheet[address] as XLSX.CellObject | undefined;
    if (!cell) continue;

    if (isTextoCelula(cell.v)) {
      const vNorm = normalizarTexto(cell.v);
      if (termosNormalizados.some(t => vNorm.includes(t))) {
        textos.push({ sheetName, address, value: cell.v });
      }
    }

    if (temFormula(cell)) {
      const fNorm = normalizarTexto(cell.f);
      if (
        termosNormalizados.some(t => fNorm.includes(t)) ||
        fNorm.includes('custo') ||
        fNorm.includes('compra') ||
        fNorm.includes('despesa') ||
        fNorm.includes('estoque') ||
        fNorm.includes('venda')
      ) {
        formulas.push({ sheetName, address, formula: cell.f, value: cell.v });
      }
    }
  }

  return { textos, formulas };
}

/**
 * Ponto de entrada.
 */
function main(): void {
  const cliArgs = parseArgs(process.argv.slice(2));
  const arquivoXlsx = path.join(
    process.cwd(),
    'documentos',
    'Posto,Jorro, 2025.xlsx'
  );

  const workbook = XLSX.readFile(arquivoXlsx, {
    cellFormula: true,
    cellText: true,
    cellDates: true,
  });

  console.log('Arquivo:', arquivoXlsx);
  console.log('Abas:', workbook.SheetNames.join(' | '));

  if (cliArgs.sheet && cliArgs.cells && cliArgs.cells.length > 0) {
    const sheet = workbook.Sheets[cliArgs.sheet];
    if (!sheet) {
      console.log(`Aba não encontrada: ${cliArgs.sheet}`);
      return;
    }

    console.log(`\n=== Inspeção de células: ${cliArgs.sheet} ===`);
    for (const addr of cliArgs.cells) {
      imprimirCelula(cliArgs.sheet, sheet, addr);
    }
    return;
  }

  const termosBusca = [
    'compras',
    'compra',
    'litros',
    'lt',
    'valor',
    'custo',
    'despesa',
    'estoque',
    'perda',
    'sobra',
    'margem',
    'lucro',
    'venda',
  ];

  const encontradosTextos: EncontradoTexto[] = [];
  const encontradasFormulas: EncontradaFormula[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const { textos, formulas } = inspecionarAba(sheetName, sheet, termosBusca);
    encontradosTextos.push(...textos);
    encontradasFormulas.push(...formulas);
  }

  console.log('\n=== Textos encontrados (filtro compras/estoque/etc.) ===');
  const limiteTextos = cliArgs.limitText ?? 200;
  for (const [idx, item] of encontradosTextos.entries()) {
    if (idx >= limiteTextos) break;
    console.log(`[${item.sheetName}] ${item.address}: ${item.value}`);
  }
  if (encontradosTextos.length > limiteTextos) {
    console.log(`... (${encontradosTextos.length - limiteTextos} textos omitidos)`);
  }

  console.log('\n=== Fórmulas encontradas (filtro compras/estoque/etc.) ===');
  for (const f of encontradasFormulas) {
    console.log(`[${f.sheetName}] ${f.address}: =${f.formula}`);
  }

  console.log('\nTotais:');
  console.log('Textos:', encontradosTextos.length);
  console.log('Fórmulas:', encontradasFormulas.length);
}

main();
