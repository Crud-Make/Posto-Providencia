import { Bomba, Frentista } from './index';

// Exemplo de correção para o erro de tipo da Bomba
// O campo 'localizacao' é obrigatório no tipo Row, mesmo que seja null
export const testeBomba: Bomba = {
  id: 1,
  nome: 'Bomba 1',
  posto_id: 1,
  ativo: true,
  localizacao: null // Adicionado para corrigir o erro
};

// Exemplo de correção para o erro de tipo do Frentista
// Campos como cpf, data_admissao, telefone e user_id são obrigatórios no tipo Row
export const testeFrentista: Frentista = {
  id: 1,
  nome: 'Frentista Teste',
  posto_id: 1,
  ativo: true,
  cpf: '000.000.000-00',       // Obrigatório
  data_admissao: '2024-01-01', // Obrigatório
  telefone: null,              // Obrigatório (pode ser null)
  user_id: null,               // Obrigatório (pode ser null)
  turno_id: null               // Obrigatório (pode ser null)
};
