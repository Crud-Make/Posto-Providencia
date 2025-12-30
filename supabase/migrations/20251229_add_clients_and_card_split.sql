-- Adicionar colunas em FechamentoFrentista
ALTER TABLE public."FechamentoFrentista" 
ADD COLUMN IF NOT EXISTS valor_cartao_debito DECIMAL(12,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_cartao_credito DECIMAL(12,2) DEFAULT 0;

-- Criar tabela Cliente
CREATE TABLE IF NOT EXISTS public."Cliente" (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    documento TEXT,
    posto_id INTEGER REFERENCES public."Posto"(id) DEFAULT 1,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar tabela NotaFrentista (vínculo entre frentista, fechamento e cliente)
CREATE TABLE IF NOT EXISTS public."NotaFrentista" (
    id BIGSERIAL PRIMARY KEY,
    fechamento_frentista_id BIGINT REFERENCES public."FechamentoFrentista"(id) ON DELETE CASCADE,
    cliente_id BIGINT REFERENCES public."Cliente"(id),
    valor DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para Cliente
ALTER TABLE public."Cliente" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para autenticados em Cliente" ON public."Cliente" FOR ALL TO authenticated USING (true);

-- RLS para NotaFrentista
ALTER TABLE public."NotaFrentista" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo para autenticados em NotaFrentista" ON public."NotaFrentista" FOR ALL TO authenticated USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_nota_frentista_fechamento ON public."NotaFrentista"(fechamento_frentista_id);
CREATE INDEX IF NOT EXISTS idx_nota_frentista_cliente ON public."NotaFrentista"(cliente_id);
