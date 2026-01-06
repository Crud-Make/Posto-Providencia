-- Create Enum for Expense Categories
DO $$ BEGIN
    CREATE TYPE "CategoriaDespesa" AS ENUM ('energia', 'agua', 'internet', 'manutencao', 'salario', 'imposto', 'aluguel', 'outros');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Despesa table
CREATE TABLE IF NOT EXISTS "Despesa" (
    "id" SERIAL PRIMARY KEY,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "data" DATE NOT NULL DEFAULT CURRENT_DATE,
    "categoria" "CategoriaDespesa" NOT NULL DEFAULT 'outros',
    "observacoes" TEXT,
    "usuario_id" INTEGER REFERENCES "Usuario"("id"),
    "created_at" TIMESTAMPTZ DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying expenses by date range
CREATE INDEX IF NOT EXISTS "idx_despesa_data" ON "Despesa"("data");
