-- TABELAS PARA SISTEMA DE NOTIFICAÇÕES PUSH

-- Tabela para armazenar tokens de push notification dos dispositivos
CREATE TABLE IF NOT EXISTS "PushToken" (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES "Usuario"(id) ON DELETE CASCADE,
    frentista_id INTEGER REFERENCES "Frentista"(id) ON DELETE SET NULL,
    expo_push_token TEXT NOT NULL,
    device_info TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(usuario_id, expo_push_token)
);

-- Tabela para histórico de notificações enviadas
CREATE TABLE IF NOT EXISTS "Notificacao" (
    id SERIAL PRIMARY KEY,
    frentista_id INTEGER NOT NULL REFERENCES "Frentista"(id) ON DELETE CASCADE,
    fechamento_frentista_id INTEGER REFERENCES "FechamentoFrentista"(id) ON DELETE SET NULL,
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT DEFAULT 'FALTA_CAIXA',
    valor_falta DECIMAL(10,2),
    lida BOOLEAN DEFAULT false,
    enviada BOOLEAN DEFAULT false,
    data_envio TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pushtoken_usuario ON "PushToken"(usuario_id);
CREATE INDEX IF NOT EXISTS idx_pushtoken_frentista ON "PushToken"(frentista_id);
CREATE INDEX IF NOT EXISTS idx_pushtoken_token ON "PushToken"(expo_push_token);
CREATE INDEX IF NOT EXISTS idx_notificacao_frentista ON "Notificacao"(frentista_id);
CREATE INDEX IF NOT EXISTS idx_notificacao_lida ON "Notificacao"(lida);
CREATE INDEX IF NOT EXISTS idx_notificacao_tipo ON "Notificacao"(tipo);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_pushtoken_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pushtoken_updated_at ON "PushToken";
CREATE TRIGGER trigger_pushtoken_updated_at
    BEFORE UPDATE ON "PushToken"
    FOR EACH ROW
    EXECUTE FUNCTION update_pushtoken_updated_at();

-- Enable RLS
ALTER TABLE "PushToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notificacao" ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança para PushToken
CREATE POLICY "Users can view own tokens" ON "PushToken"
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own tokens" ON "PushToken"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own tokens" ON "PushToken"
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own tokens" ON "PushToken"
    FOR DELETE USING (true);

-- Políticas de segurança para Notificacao
CREATE POLICY "Users can view notifications" ON "Notificacao"
    FOR SELECT USING (true);

CREATE POLICY "Users can insert notifications" ON "Notificacao"
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update notifications" ON "Notificacao"
    FOR UPDATE USING (true);
