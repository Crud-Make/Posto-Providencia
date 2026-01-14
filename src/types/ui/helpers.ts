// [14/01 10:00] Criação de utility types para relacionamentos
// Helper para combinar tipos de tabelas com seus relacionamentos
export type WithRelations<T, R> = T & R;
