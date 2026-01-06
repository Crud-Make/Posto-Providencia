CREATE OR REPLACE FUNCTION user_has_posto_access(p_posto_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    current_email text;
BEGIN
    -- Pega o email do usuário logado via JWT (mais rápido que query na auth.users)
    current_email := auth.jwt() ->> 'email';
    
    -- Fallback se não vier no JWT (ex: triggers internas)
    IF current_email IS NULL THEN
        SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();
    END IF;

    IF current_email IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Se for ADMIN, libera acesso a qualquer posto
    IF EXISTS (
        SELECT 1 FROM "Usuario" u
        WHERE u.email = current_email
        AND u.role = 'ADMIN'
    ) THEN
        RETURN TRUE;
    END IF;

    -- Verifica se o usuário tem vínculo ativo com o posto na tabela UsuarioPosto
    -- Fazendo join com Usuario para garantir que estamos pegando o ID correto pelo email
    RETURN EXISTS (
        SELECT 1 
        FROM "UsuarioPosto" up
        JOIN "Usuario" u ON u.id = up.usuario_id
        WHERE u.email = current_email
        AND up.posto_id = p_posto_id
        AND up.ativo = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
