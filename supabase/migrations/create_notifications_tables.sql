BEGIN;

CREATE TABLE IF NOT EXISTS public."PushToken" (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES public."Usuario"(id) ON DELETE CASCADE,
    frentista_id INTEGER REFERENCES public."Frentista"(id) ON DELETE SET NULL,
    expo_push_token TEXT NOT NULL,
    device_info TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(usuario_id, expo_push_token)
);

CREATE TABLE IF NOT EXISTS public."Notificacao" (
    id SERIAL PRIMARY KEY,
    frentista_id INTEGER NOT NULL REFERENCES public."Frentista"(id) ON DELETE CASCADE,
    fechamento_frentista_id INTEGER REFERENCES public."FechamentoFrentista"(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT DEFAULT 'FALTA_CAIXA',
    valor_falta NUMERIC,
    lida BOOLEAN DEFAULT false,
    enviada BOOLEAN DEFAULT false,
    data_envio TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    posto_id INTEGER REFERENCES public."Posto"(id) ON DELETE CASCADE
);

ALTER TABLE public."PushToken" ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE public."PushToken" ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public."PushToken" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."PushToken" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public."Notificacao" ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'FALTA_CAIXA';
ALTER TABLE public."Notificacao" ADD COLUMN IF NOT EXISTS valor_falta NUMERIC;
ALTER TABLE public."Notificacao" ADD COLUMN IF NOT EXISTS lida BOOLEAN DEFAULT false;
ALTER TABLE public."Notificacao" ADD COLUMN IF NOT EXISTS enviada BOOLEAN DEFAULT false;
ALTER TABLE public."Notificacao" ADD COLUMN IF NOT EXISTS data_envio TIMESTAMPTZ;
ALTER TABLE public."Notificacao" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."Notificacao" ADD COLUMN IF NOT EXISTS posto_id INTEGER REFERENCES public."Posto"(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_pushtoken_usuario ON public."PushToken"(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pushtoken_frentista ON public."PushToken"(frentista_id);
CREATE INDEX IF NOT EXISTS idx_pushtoken_token ON public."PushToken"(expo_push_token);
CREATE INDEX IF NOT EXISTS idx_notificacao_frentista ON public."Notificacao"(frentista_id);
CREATE INDEX IF NOT EXISTS idx_notificacao_lida ON public."Notificacao"(lida);
CREATE INDEX IF NOT EXISTS idx_notificacao_tipo ON public."Notificacao"(tipo);

CREATE OR REPLACE FUNCTION public.update_pushtoken_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pushtoken_updated_at ON public."PushToken";
CREATE TRIGGER trigger_pushtoken_updated_at
    BEFORE UPDATE ON public."PushToken"
    FOR EACH ROW
    EXECUTE FUNCTION public.update_pushtoken_updated_at();

ALTER TABLE public."PushToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notificacao" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'PushToken' AND policyname = 'Users can view own tokens'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can view own tokens" ON public."PushToken" FOR SELECT TO authenticated USING (true)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'PushToken' AND policyname = 'Users can insert own tokens'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can insert own tokens" ON public."PushToken" FOR INSERT TO authenticated WITH CHECK (true)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'PushToken' AND policyname = 'Users can update own tokens'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update own tokens" ON public."PushToken" FOR UPDATE TO authenticated USING (true)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'PushToken' AND policyname = 'Users can delete own tokens'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can delete own tokens" ON public."PushToken" FOR DELETE TO authenticated USING (true)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'Notificacao' AND policyname = 'Users can view notifications'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can view notifications" ON public."Notificacao" FOR SELECT TO authenticated USING (true)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'Notificacao' AND policyname = 'Users can insert notifications'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can insert notifications" ON public."Notificacao" FOR INSERT TO authenticated WITH CHECK (true)';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'Notificacao' AND policyname = 'Users can update notifications'
    ) THEN
        EXECUTE 'CREATE POLICY "Users can update notifications" ON public."Notificacao" FOR UPDATE TO authenticated USING (true)';
    END IF;
END $$;

COMMIT;

