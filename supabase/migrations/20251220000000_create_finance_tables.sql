
CREATE TYPE periodicity_type AS ENUM ('mensal', 'quinzenal', 'semanal', 'diario');
CREATE TYPE installment_status AS ENUM ('pendente', 'pago', 'atrasado');

CREATE TABLE IF NOT EXISTS "Emprestimo" (
    id BIGSERIAL PRIMARY KEY,
    credor TEXT NOT NULL,
    valor_total DECIMAL(12,2) NOT NULL,
    quantidade_parcelas INTEGER NOT NULL,
    valor_parcela DECIMAL(12,2) NOT NULL,
    data_emprestimo DATE NOT NULL DEFAULT CURRENT_DATE,
    data_primeiro_vencimento DATE NOT NULL,
    periodicidade periodicity_type NOT NULL DEFAULT 'mensal',
    taxa_juros DECIMAL(5,2),
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "Parcela" (
    id BIGSERIAL PRIMARY KEY,
    emprestimo_id BIGINT NOT NULL REFERENCES "Emprestimo"(id) ON DELETE CASCADE,
    numero_parcela INTEGER NOT NULL,
    data_vencimento DATE NOT NULL,
    valor DECIMAL(12,2) NOT NULL,
    data_pagamento DATE,
    status installment_status NOT NULL DEFAULT 'pendente',
    juros_multa DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE "Emprestimo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Parcela" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for Emprestimo') THEN
        CREATE POLICY "Allow all for Emprestimo" ON "Emprestimo" FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for Parcela') THEN
        CREATE POLICY "Allow all for Parcela" ON "Parcela" FOR ALL USING (true);
    END IF;
END
$$;

