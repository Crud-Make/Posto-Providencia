-- Create tables for managing non-fuel stock (lubricants, additives, etc.)

-- Table for Products
CREATE TABLE IF NOT EXISTS "Produto" (
    "id" SERIAL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "codigo_barras" TEXT,
    "categoria" TEXT NOT NULL, -- 'Lubrificante', 'Aditivo', 'Filtro', 'Acessorio', 'Outros'
    "descricao" TEXT,
    "preco_custo" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "preco_venda" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "estoque_atual" INTEGER NOT NULL DEFAULT 0,
    "estoque_minimo" INTEGER NOT NULL DEFAULT 0,
    "unidade_medida" TEXT NOT NULL DEFAULT 'unidade', -- 'unidade', 'litro', 'caixa'
    "ativo" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Stock Movements
CREATE TABLE IF NOT EXISTS "MovimentacaoEstoque" (
    "id" SERIAL PRIMARY KEY,
    "produto_id" INTEGER REFERENCES "Produto"("id"),
    "tipo" TEXT NOT NULL, -- 'entrada', 'saida', 'ajuste'
    "quantidade" INTEGER NOT NULL,
    "data" TIMESTAMPTZ DEFAULT NOW(),
    "responsavel" TEXT,
    "observacao" TEXT,
    "created_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS "idx_produto_categoria" ON "Produto"("categoria");
CREATE INDEX IF NOT EXISTS "idx_movimentacao_produto" ON "MovimentacaoEstoque"("produto_id");
CREATE INDEX IF NOT EXISTS "idx_movimentacao_data" ON "MovimentacaoEstoque"("data");
