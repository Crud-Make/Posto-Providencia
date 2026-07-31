/**
 * ID do usuário do sistema usado como FK nos registros gravados pelo painel web.
 *
 * @remarks
 * `Fechamento.usuario_id` e `Leitura.usuario_id` são FKs obrigatórias para `Usuario`.
 * O painel web não tem sessão de usuário: aponta para `Usuario.id = 1` ("Administrador"),
 * a única linha real da tabela.
 *
 * Passou a ser explícita quando o mecanismo de login morto foi removido do `apps/web`.
 * Antes vinha disfarçada de `user.id` do `AuthContext`, que inicializava o estado com
 * `MOCK_ADMIN_USER` (`id: 1`) — logo `!user` nunca era verdade, a `TelaLogin` e o guard
 * do `MainLayout` eram inalcançáveis em runtime e todo o tráfego já saía como role
 * `anon`. O valor gravado no banco sempre foi 1; só o caminho até ele era indireto.
 */
export const USUARIO_SISTEMA_ID = 1;
