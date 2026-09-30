-- Login por nome de usuário no cartão do posto (tela de entrada do painel).
--
-- Idempotente: pode rodar de novo em qualquer banco que já tenha 01 carregado.
--
-- O dono quer entrar digitando um nome curto ("elias") e a senha, no cartão do posto que escolheu,
-- em vez do e-mail. As contas são SEPARADAS por posto (decisão do dono, 27/09): o Elias tem uma conta
-- no Jorro e outra no BR, e as duas se chamam "elias". Por isso o nome mora no VÍNCULO
-- ("UsuarioPosto"), e não no "Usuario": o mesmo nome se repete em postos diferentes, e é o par
-- (posto escolhido, nome) que aponta uma conta só.
--
-- O índice único é por (posto_id, lower(usuario)): "Elias" e "elias" no mesmo posto são o mesmo
-- login, e o mesmo nome em dois postos é permitido. NULL (vínculo sem login por nome, ex. ADMIN que
-- entra pelo e-mail) fica fora do índice.

ALTER TABLE public."UsuarioPosto" ADD COLUMN IF NOT EXISTS usuario text;

CREATE UNIQUE INDEX IF NOT EXISTS usuarioposto_login_por_posto
    ON public."UsuarioPosto" USING btree (posto_id, lower(usuario))
    WHERE usuario IS NOT NULL;
