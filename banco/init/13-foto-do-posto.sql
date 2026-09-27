-- Foto da fachada do posto (decisão do dono, 27/09/2026).
--
-- Idempotente: pode rodar de novo em qualquer banco que já tenha 01 carregado.
--
-- O GERENTE ou ADMIN do posto sobe a foto pelo painel (`PUT /api/postos/{posto}/foto`); os cartões
-- da tela de entrada e a escolha de posto do PWA a mostram (`GET /api/postos/{posto}/foto`, pública).
-- Mesma forma da foto do frentista (`frentista_foto_tamanho`, 01-esquema-base.sql): JPEG em data URL,
-- com teto maior (300.000 caracteres ≈ 220 KB de JPEG) porque é fachada, não rosto em miniatura.
--
-- `foto_atualizada_em` versiona a URL pública (`?v=`), o que deixa a resposta ser cacheada para
-- sempre: foto nova, URL nova. As duas colunas são NULL em todo posto antigo; nenhuma coluna
-- existente muda.

ALTER TABLE public."Posto" ADD COLUMN IF NOT EXISTS foto text;

ALTER TABLE public."Posto" ADD COLUMN IF NOT EXISTS foto_atualizada_em timestamptz;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'posto_foto_tamanho' AND conrelid = 'public."Posto"'::regclass
    ) THEN
        ALTER TABLE public."Posto" ADD CONSTRAINT "posto_foto_tamanho"
            CHECK (foto IS NULL OR (foto LIKE 'data:image/jpeg;base64,%' AND length(foto) <= 300000));
    END IF;
END
$$;
