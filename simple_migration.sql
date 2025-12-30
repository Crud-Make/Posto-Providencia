DROP TRIGGER IF EXISTS trigger_atualizar_saldo_cliente ON public."NotaFrentista";
DROP FUNCTION IF EXISTS atualizar_saldo_cliente();
DROP TABLE IF EXISTS public."NotaFrentista" CASCADE;
DROP TABLE IF EXISTS public."Cliente" CASCADE;

CREATE TABLE public."Cliente" (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    documento VARCHAR(20),
    telefone VARCHAR(20),
    email VARCHAR(255),
    endereco TEXT,
    limite_credito DECIMAL(12, 2) DEFAULT 0,
    saldo_devedor DECIMAL(12, 2) DEFAULT 0,
    posto_id INTEGER NOT NULL REFERENCES public."Posto"(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public."NotaFrentista" (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES public."Cliente"(id) ON DELETE CASCADE,
    frentista_id INTEGER NOT NULL REFERENCES public."Frentista"(id) ON DELETE CASCADE,
    fechamento_frentista_id INTEGER REFERENCES public."FechamentoFrentista"(id) ON DELETE SET NULL,
    valor DECIMAL(12, 2) NOT NULL,
    descricao TEXT,
    data DATE NOT NULL DEFAULT CURRENT_DATE,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    forma_pagamento VARCHAR(50),
    observacoes TEXT,
    posto_id INTEGER NOT NULL REFERENCES public."Posto"(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cliente_posto ON public."Cliente"(posto_id);
CREATE INDEX idx_notafrentista_cliente ON public."NotaFrentista"(cliente_id);
CREATE INDEX idx_notafrentista_status ON public."NotaFrentista"(status);
CREATE INDEX idx_notafrentista_data ON public."NotaFrentista"(data);

ALTER TABLE public."Cliente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotaFrentista" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated access cliente" ON public."Cliente" FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated access nota" ON public."NotaFrentista" FOR ALL USING (auth.role() = 'authenticated');

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cliente_updated_at BEFORE UPDATE ON public."Cliente" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notafrentista_updated_at BEFORE UPDATE ON public."NotaFrentista" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION atualizar_saldo_cliente() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE public."Cliente" SET saldo_devedor = (SELECT COALESCE(SUM(valor), 0) FROM public."NotaFrentista" WHERE cliente_id = OLD.cliente_id AND status = 'pendente') WHERE id = OLD.cliente_id;
        RETURN OLD;
    ELSE
        UPDATE public."Cliente" SET saldo_devedor = (SELECT COALESCE(SUM(valor), 0) FROM public."NotaFrentista" WHERE cliente_id = NEW.cliente_id AND status = 'pendente') WHERE id = NEW.cliente_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_saldo_cliente AFTER INSERT OR UPDATE OR DELETE ON public."NotaFrentista" FOR EACH ROW EXECUTE FUNCTION atualizar_saldo_cliente();
