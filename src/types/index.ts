// [09/01 20:04] Centralizador de exportação de tipos para o sistema
/**
 * Ponto central de exportação de tipos.
 * Resolve conflitos entre tipos de UI e Database.
 */

// Exportamos tudo de UI (que contém as interfaces de visualização)
export * from './ui';
export * from './fechamento';

// Exportamos tudo de Database
export * from './database';

/**
 * Re-exportamos explicitamente os tipos de banco que conflitam, 
 * caso alguém precise deles com nomes distintos.
 * O alias 'Divida' em database.ts já foi renomeado para 'DBDivida'.
 */
