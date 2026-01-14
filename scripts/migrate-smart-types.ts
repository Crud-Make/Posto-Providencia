/**
 * Script de migração para Smart Types nos services da API.
 *
 * Responsável por substituir tipos baseados em Database['public']['Tables']
 * pelos aliases centralizados em src/types/database/aliases.ts quando
 * disponíveis, mantendo o código estrito em TypeScript.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface TypeMapping {
  tableName: string;
  aliasName: string;
}

/**
 * Mapeamento estático entre nomes de tabela e aliases de tipos.
 *
 * Este mapeamento é focado nos services que ainda utilizam
 * Database['public']['Tables'][T] diretamente.
 */
const TYPE_MAPPINGS: TypeMapping[] = [
  { tableName: 'Despesa', tableNameAlias: 'DBDespesa', aliasName: 'DBDespesa' } as unknown as TypeMapping,
  { tableName: 'Divida', aliasName: 'DBDivida' },
  { tableName: 'Compra', aliasName: 'Compra' },
  { tableName: 'Fornecedor', aliasName: 'Fornecedor' },
  { tableName: 'Parcela', aliasName: 'Parcela' },
  { tableName: 'Emprestimo', aliasName: 'Emprestimo' },
  { tableName: 'Tanque', aliasName: 'Tanque' },
];

/**
 * Aplica substituições de tipos em um conteúdo de arquivo de service.
 */
function migrateServiceContent(content: string): string {
  let updated = content;

  for (const mapping of TYPE_MAPPINGS) {
    const { tableName, aliasName } = mapping;
    const rowPattern = new RegExp(
      `Database\\['public'\\]\\['Tables'\\]\\['${tableName}'\\]\\['Row'\\]`,
      'g'
    );
    const insertPattern = new RegExp(
      `Database\\['public'\\]\\['Tables'\\]\\['${tableName}'\\]\\['Insert'\\]`,
      'g'
    );
    const updatePattern = new RegExp(
      `Database\\['public'\\]\\['Tables'\\]\\['${tableName}'\\]\\['Update'\\]`,
      'g'
    );

    updated = updated.replace(rowPattern, aliasName);
    updated = updated.replace(insertPattern, `InsertTables<'${tableName}'>`);
    updated = updated.replace(updatePattern, `UpdateTables<'${tableName}'>`);
  }

  return updated;
}

/**
 * Atualiza um arquivo de service aplicando a migração de tipos.
 */
function migrateServiceFile(relativePath: string): void {
  const fullPath = join(process.cwd(), relativePath);
  const original = readFileSync(fullPath, 'utf8');
  const migrated = migrateServiceContent(original);

  if (migrated !== original) {
    writeFileSync(fullPath, migrated, 'utf8');
    // eslint-disable-next-line no-console
    console.log(`Migrado: ${relativePath}`);
  }
}

/**
 * Ponto de entrada do script.
 */
function main(): void {
  const filesToMigrate = [
    'src/services/api/despesa.service.ts',
    'src/services/api/compra.service.ts',
    'src/services/api/fornecedor.service.ts',
    'src/services/api/parcela.service.ts',
    'src/services/api/emprestimo.service.ts',
    'src/services/api/tanque.service.ts',
  ];

  filesToMigrate.forEach(migrateServiceFile);
}

main();

