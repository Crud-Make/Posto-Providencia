-- Tokens do login próprio da API (Laravel Sanctum, #102).
--
-- O esquema do domínio vive em banco/init, não em migration do Laravel; esta tabela segue a
-- mesma regra. Espelha a migration do pacote (vendor/laravel/sanctum, create_personal_access_tokens):
-- quem muda de versão do Sanctum confere se ela mudou.
--
-- `token` guarda o SHA-256 do segredo, nunca o segredo: vazar esta tabela não entrega sessão.
-- `tokenable_type` é a classe do dono (App\Pessoas\Domain\Usuario), `tokenable_id` o id dele.

CREATE TABLE IF NOT EXISTS public.personal_access_tokens (
    id bigserial PRIMARY KEY,
    tokenable_type varchar(255) NOT NULL,
    tokenable_id bigint NOT NULL,
    name text NOT NULL,
    token varchar(64) NOT NULL UNIQUE,
    abilities text,
    last_used_at timestamp(0) without time zone,
    expires_at timestamp(0) without time zone,
    created_at timestamp(0) without time zone,
    updated_at timestamp(0) without time zone
);

CREATE INDEX IF NOT EXISTS personal_access_tokens_tokenable_type_tokenable_id_index
    ON public.personal_access_tokens (tokenable_type, tokenable_id);
CREATE INDEX IF NOT EXISTS personal_access_tokens_expires_at_index
    ON public.personal_access_tokens (expires_at);
