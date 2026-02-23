// [14/01 15:50] Criação de tipos derivados para formulários da UI

/**
 * Campos do formulário de cliente - todos como string para uso em inputs
 */
export interface ClienteFormFields {
  nome: string;
  documento: string;
  telefone: string;
  email: string;
  limite_credito: string;
  endereco: string;
}
