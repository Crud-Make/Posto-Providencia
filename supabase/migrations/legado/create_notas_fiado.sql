-- ============================================
-- FEATURE: NOTAS (FIADO)
-- Sistema de controle de crédito/fiado de clientes
-- ============================================

-- Limpeza preventiva para evitar conflitos (CUIDADO: APAGA DADOS EXISTENTES DESSAS TABELAS SE JÁ EXISTIREM)
DROP TRIGGER IF EXISTS trigger_atualizar_saldo_cliente ON public."NotaFrentista";
DROP FUNCTION IF EXISTS atualizar_saldo_cliente();
DROP TABLE IF EXISTS public."NotaFrentista" CASCADE;
DROP TABLE IF EXISTS public."Cliente" CASCADE;

-- 1. TABELA CLIENTE (Clientes que podem ter fiado)
CREATE TABLE public."Cliente" (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(20), -- CPF ou CNPJ
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT,
    limite_credito DECIMAL(12, 2) DEFAULT 0, -- Limite de crédito permitido
    saldo_devedor DECIMAL(12, 2) DEFAULT 0, -- Saldo atual devedor
    posto_id INTEGER NOT NULL REFERENCES public."Posto"(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA NOTA FRENTISTA (Registro de fiado)
CREATE TABLE public."NotaFrentista" (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES public."Cliente"(id) ON DELETE CASCADE,
    frentista_id INTEGER NOT NULL REFERENCES public."Frentista"(id) ON DELETE CASCADE,
    fechamento_frentista_id INTEGER REFERENCES public."FechamentoFrentista"(id) ON DELETE SET NULL,
    valor DECIMAL(12, 2) NOT NULL,
    descricao TEXT,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    data_pagamento DATE, -- Data que foi pago (null = não pago)
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    forma_pagamento VARCHAR(50), -- Como foi pago (quando pago)
    observacoes TEXT,
    posto_id INTEGER NOT NULL REFERENCES public."Posto"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_cliente_posto ON public."Cliente"(posto_id);
CREATE INDEX idx_cliente_ativo ON public."Cliente"(ativo);
CREATE INDEX idx_notafrentista_cliente ON public."NotaFrentista"(cliente_id);
CREATE INDEX idx_notafrentista_frentista ON public."NotaFrentista"(frentista_id);
CREATE INDEX idx_notafrentista_status ON public."NotaFrentista"(status);
CREATE INDEX idx_notafrentista_posto ON public."NotaFrentista"(posto_id);
CREATE INDEX idx_notafrentista_data ON public."NotaFrentista"(data);

-- 4. RLS (Row Level Security) - Opcional mas recomendado
ALTER TABLE public."Cliente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotaFrentista" ENABLE ROW LEVEL SECURITY;

-- Política para permitir acesso a todos os dados autenticados (ajustar conforme necessário)
CREATE POLICY "Allow authenticated access cliente" ON public."Cliente"
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated access nota" ON public."NotaFrentista"
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para Cliente
DROP TRIGGER IF EXISTS update_cliente_updated_at ON public."Cliente";
CREATE TRIGGER update_cliente_updated_at
    BEFORE UPDATE ON public."Cliente"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger para NotaFrentista
DROP TRIGGER IF EXISTS update_notafrentista_updated_at ON public."NotaFrentista";
CREATE TRIGGER update_notafrentista_updated_at
    BEFORE UPDATE ON public."NotaFrentista"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. FUNÇÃO PARA ATUALIZAR SALDO DEVEDOR DO CLIENTE
CREATE OR REPLACE FUNCTION atualizar_saldo_cliente()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando uma nota é criada/atualizada/deletada, recalcula o saldo
    IF TG_OP = 'DELETE' THEN
        UPDATE public."Cliente"
        SET saldo_devedor = (
            SELECT COALESCE(SUM(valor), 0)
            FROM public."NotaFrentista"
            WHERE cliente_id = OLD.cliente_id
            AND status = 'pendente'
        )
        WHERE id = OLD.cliente_id;
        RETURN OLD;
    ELSE
        UPDATE public."Cliente"
        SET saldo_devedor = (
            SELECT COALESCE(SUM(valor), 0)
            FROM public."NotaFrentista"
            WHERE cliente_id = NEW.cliente_id
            AND status = 'pendente'
        )
        WHERE id = NEW.cliente_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para recalcular saldo
DROP TRIGGER IF EXISTS trigger_atualizar_saldo_cliente ON public."NotaFrentista";
CREATE TRIGGER trigger_atualizar_saldo_cliente
    AFTER INSERT OR UPDATE OR DELETE ON public."NotaFrentista"
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_saldo_cliente();

-- 7. COMENTÁRIOS PARA DOCUMENTAÇÃO
COMMENT ON TABLE public."Cliente" IS 'Clientes que podem comprar fiado no posto';
COMMENT ON TABLE public."NotaFrentista" IS 'Registro de notas/fiado lançadas pelos frentistas';
COMMENT ON COLUMN public."Cliente".limite_credito IS 'Limite máximo de crédito permitido para o cliente';
COMMENT ON COLUMN public."Cliente".saldo_devedor IS 'Saldo atual devedor do cliente (calculado automaticamente)';
COMMENT ON COLUMN public."NotaFrentista".status IS 'Status da nota: pendente, pago ou cancelado';
