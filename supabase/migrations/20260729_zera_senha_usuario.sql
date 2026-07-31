-- Zera a coluna `Usuario.senha`, que guardava senha em TEXTO PURO.
--
-- Contexto (29/07/2026):
--   O probe com a anon key mostrou que `Usuario` responde a qualquer anônimo da internet
--   (policy "Enable Select for Anon on Usuario", USING true). A única linha da tabela era
--   `admin@postoprovidencia.com`, role ADMIN, com `senha` de 8 caracteres em claro — ou seja,
--   e-mail e senha de administrador legíveis por quem abrisse o site e pegasse a chave do bundle.
--   Não era hash: não tinha prefixo bcrypt, era o valor digitável.
--
-- Por que zerar em vez de proteger:
--   O login do painel foi removido em 63f209d por ser código inalcançável (o AuthContext
--   inicializava o usuário com um mock, então a tela de login nunca renderizava; o último
--   last_sign_in_at de auth.users é de 06/01/2026). Nada no repositório lê essa coluna para
--   comparar senha — não existe bcrypt nem comparação em JS em lugar algum. A coluna é resto
--   de uma autenticação caseira que nunca chegou a existir de verdade.
--
--   Revogar o acesso do `anon` a `Usuario` NÃO era alternativa: como o painel fala com o banco
--   como `anon`, isso derrubaria o embed `usuario:Usuario(id, nome)` das três queries de
--   fechamento (apps/web/src/services/api/fechamento.service.ts).
--
-- NULL e não string vazia: a coluna aceita NULL, e NULL diz "não há senha aqui", enquanto ''
-- pareceria uma senha vazia deliberada.
--
-- A LINHA CONTINUA EXISTINDO. `Usuario.id = 1` é FK obrigatória de `Fechamento.usuario_id` e
-- `Leitura.usuario_id` (ver apps/web/src/shared/constants/usuario-sistema.ts). Apagar a linha
-- derrubaria o envio de fechamento. Só o segredo sai.

UPDATE public."Usuario"
   SET senha = NULL
 WHERE senha IS NOT NULL;
