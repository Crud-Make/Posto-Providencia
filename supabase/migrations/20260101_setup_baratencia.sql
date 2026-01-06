-- Migration: Setup Baratência (Customer Loyalty App)
-- Date: 2026-01-01
-- Description: Tabelas para suportar o sistema de Wallet e Créditos de Litragem

-- 1. Tabela de Clientes do App (Baratência)
CREATE TABLE IF NOT EXISTS "ClienteBaratencia" (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id), -- Integração com Supabase Auth
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    data_nascimento DATE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Carteira Virtual do Cliente
CREATE TABLE IF NOT EXISTS "CarteiraBaratencia" (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES "ClienteBaratencia"(id) UNIQUE,
    saldo_brl DECIMAL(15, 2) DEFAULT 0,
    -- Saldo segregado por combustível (em litros)
    saldo_litros_gc DECIMAL(15, 3) DEFAULT 0, -- Gasolina Comum
    saldo_litros_ga DECIMAL(15, 3) DEFAULT 0, -- Gasolina Aditivada
    saldo_litros_et DECIMAL(15, 3) DEFAULT 0, -- Etanol
    saldo_litros_s10 DECIMAL(15, 3) DEFAULT 0, -- Diesel S10
    saldo_litros_diesel DECIMAL(15, 3) DEFAULT 0, -- Diesel
    ultima_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Histórico de Transações (Depósitos, Conversões, Resgates)
CREATE TYPE "TipoTransacaoBaratencia" AS ENUM ('DEPOSITO', 'CONVERSAO', 'RESGATE', 'ESTORNO');

CREATE TABLE IF NOT EXISTS "TransacaoBaratencia" (
    id SERIAL PRIMARY KEY,
    carteira_id INTEGER REFERENCES "CarteiraBaratencia"(id),
    tipo "TipoTransacaoBaratencia" NOT NULL,
    valor_brl DECIMAL(15, 2) DEFAULT 0,
    quantidade_litros DECIMAL(15, 3) DEFAULT 0,
    combustivel_codigo VARCHAR(10), -- GC, GA, etc.
    preco_na_hora DECIMAL(10, 3), -- Preço travado no momento da conversão
    status VARCHAR(20) DEFAULT 'COMPLETO', -- PENDENTE, COMPLETO, CANCELADO
    metadata JSONB, -- Informações extras (ID PIX, etc)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tokens de Abastecimento (Redemption)
CREATE TABLE IF NOT EXISTS "TokenAbastecimento" (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES "ClienteBaratencia"(id),
    posto_id INTEGER REFERENCES "Posto"(id),
    combustivel_id INTEGER REFERENCES "Combustivel"(id),
    quantidade_litros DECIMAL(15, 3) NOT NULL,
    token_pin VARCHAR(6) NOT NULL, -- PIN de 6 dígitos
    data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDENTE', -- PENDENTE, USADO, EXPIRADO, CANCELADO
    frentista_id_resgatou INTEGER REFERENCES "Frentista"(id),
    data_resgate TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Promoções
CREATE TABLE IF NOT EXISTS "PromocaoBaratencia" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL, -- BONUS_DEPOSITO, BONUS_CONVERSAO, PRECO_TRAVADO
    valor_minimo DECIMAL(15, 2) DEFAULT 0,
    bonus_porcentagem DECIMAL(5, 2) DEFAULT 0,
    combustivel_codigo VARCHAR(10),
    data_inicio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_fim TIMESTAMP WITH TIME ZONE,
    ativo BOOLEAN DEFAULT TRUE,
    posto_id INTEGER REFERENCES "Posto"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Adicionar campo específico no FechamentoFrentista para Baratência
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='FechamentoFrentista' AND column_name='baratencia') THEN
        ALTER TABLE "FechamentoFrentista" ADD COLUMN baratencia DECIMAL(12,2) DEFAULT 0;
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON TABLE "ClienteBaratencia" IS 'Clientes finais que usam o app Baratência para comprar crédito antecipado.';
COMMENT ON TABLE "CarteiraBaratencia" IS 'Saldos financeiros e em litros dos clientes Baratência.';
COMMENT ON TABLE "TokenAbastecimento" IS 'Tokens (QR/PIN) gerados pelo cliente para abastecer no posto.';
