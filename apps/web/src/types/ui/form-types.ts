// [14/01 15:50] Criação de tipos derivados para formulários da UI
import type { Cliente } from './smart-types';

type FormFields<T> = {
  [K in keyof T]: T[K] extends number ? string : T[K];
};

export type ClienteFormFields = FormFields<
  Pick<
    Cliente,
    'nome' | 'documento' | 'telefone' | 'email' | 'limite_credito' | 'endereco'
  >
>;

