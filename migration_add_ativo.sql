-- Migração: Adicionar coluna 'ativo' à tabela agendamentos
-- Execute este script se você já possui uma tabela 'agendamentos' sem a coluna 'ativo'

-- Adicionar coluna 'ativo' (soft delete)
ALTER TABLE agendamentos
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Atualizar todos os registros existentes para serem ativos
UPDATE agendamentos SET ativo = TRUE WHERE ativo IS NULL;

-- Verificar se a coluna foi adicionada
DESCRIBE agendamentos;

