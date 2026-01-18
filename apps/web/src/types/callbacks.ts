/**
 * Tipos auxiliares para callbacks e funções genéricas
 * [13/01 08:24] Criado para eliminar uso de 'any' em callbacks
 */

/**
 * Tipo genérico para dados de array desconhecidos
 */
export type UnknownArrayItem = Record<string, unknown>;

/**
 * Tipo para callback de reduce genérico
 */
export type ReduceCallback<T, R> = (accumulator: R, current: T, index: number, array: T[]) => R;

/**
 * Tipo para callback de forEach genérico
 */
export type ForEachCallback<T> = (item: T, index: number, array: T[]) => void;

/**
 * Tipo para callback de map genérico
 */
export type MapCallback<T, R> = (item: T, index: number, array: T[]) => R;

/**
 * Tipo para callback de filter genérico
 */
export type FilterCallback<T> = (item: T, index: number, array: T[]) => boolean;
