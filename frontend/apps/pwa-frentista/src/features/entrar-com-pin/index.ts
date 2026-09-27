// Public API da feature entrar-com-pin (FSD-3): o PIN do frentista (#101) e o primeiro acesso, em
// que ele cria a própria chave (27/09/2026).
export { PedirPin } from './ui/pedir-pin';
export { CriarChave } from './ui/criar-chave';
export { EntrarNoTurno } from './ui/entrar-no-turno';
export { JA_TEM_CHAVE, jaTemChave, mensagemDaChave } from './model/mensagem-da-chave';
export { FORMATO_DO_PIN, mensagemDoLogin } from './model/mensagem-do-login';
