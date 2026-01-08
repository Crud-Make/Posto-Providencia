-- Migration: Add encerrante and baratao fields to FechamentoFrentista
-- Date: 2025-12-23
-- Description: Adiciona campos para controle de encerrante (valor total vendido pelo frentista)
--              e baratao no fechamento de caixa

-- Adiciona coluna encerrante: valor total vendido (encerrante da bomba)
ALTER TABLE "FechamentoFrentista" 
ADD COLUMN IF NOT EXISTS encerrante DECIMAL(12,2) DEFAULT 0;

-- Adiciona coluna baratao
ALTER TABLE "FechamentoFrentista" 
ADD COLUMN IF NOT EXISTS baratao DECIMAL(12,2) DEFAULT 0;

-- Adiciona coluna diferenca_calculada: diferença entre encerrante e soma dos pagamentos
ALTER TABLE "FechamentoFrentista" 
ADD COLUMN IF NOT EXISTS diferenca_calculada DECIMAL(12,2) DEFAULT 0;

-- Comentários nas colunas
COMMENT ON COLUMN "FechamentoFrentista".encerrante IS 'Valor total vendido pelo frentista (leitura do encerrante da bomba)';
COMMENT ON COLUMN "FechamentoFrentista".baratao IS 'Campo adicional para controle de baratão';
COMMENT ON COLUMN "FechamentoFrentista".diferenca_calculada IS 'Diferença calculada: encerrante - (cartao + nota + pix + dinheiro + baratao)';
