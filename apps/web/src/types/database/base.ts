/**
 * Tipos Base do Database
 * 
 * @remarks
 * Tipos fundamentais usados em todo o schema do banco de dados.
 */

/**
 * Tipo JSON genérico do PostgreSQL
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Metadados internos do Supabase
 */
export type InternalSupabase = {
  PostgrestVersion: "13.0.5"
}
