-- Tabela de Configurações do Sistema
-- Armazena parâmetros operacionais configuráveis

CREATE TABLE IF NOT EXISTS "Configuracao" (
    id BIGSERIAL PRIMARY KEY,
    chave TEXT NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT NOT NULL DEFAULT 'texto', -- 'texto', 'numero', 'booleano'
    categoria TEXT NOT NULL DEFAULT 'geral',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir configurações padrão
INSERT INTO "Configuracao" (chave, valor, descricao, tipo, categoria) VALUES
    ('despesa_operacional_litro', '0.45', 'Despesa operacional por litro vendido (R$)', 'numero', 'financeiro'),
    ('tolerancia_divergencia', '50.00', 'Tolerância máxima de divergência no fechamento (R$)', 'numero', 'fechamento'),
    ('dias_estoque_critico', '3', 'Dias restantes para considerar estoque crítico', 'numero', 'estoque'),
    ('dias_estoque_baixo', '7', 'Dias restantes para considerar estoque baixo', 'numero', 'estoque')
ON CONFLICT (chave) DO NOTHING;

-- Habilitar RLS
ALTER TABLE "Configuracao" ENABLE ROW LEVEL SECURITY;

-- Política de acesso
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for Configuracao') THEN
        CREATE POLICY "Allow all for Configuracao" ON "Configuracao" FOR ALL USING (true);
    END IF;
END
$$;
