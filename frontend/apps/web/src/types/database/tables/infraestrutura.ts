/**
 * Tabelas do Domínio: Infraestrutura
 * 
 * @remarks
 * Contém definições para Posto, Turno, Configuração e Usuários.
 */

import { DatabaseEnums } from '../enums'

export interface PostoTable {
  Row: {
    id: number
    nome: string
    cnpj: string | null
    endereco: string | null
    cidade: string | null
    estado: string | null
    telefone: string | null
    email: string | null
    ativo: boolean
    created_at: string
    updated_at: string
  }
  Insert: {
    id?: number
    nome: string
    cnpj?: string | null
    endereco?: string | null
    cidade?: string | null
    estado?: string | null
    telefone?: string | null
    email?: string | null
    ativo?: boolean
    created_at?: string
    updated_at?: string
  }
  Update: {
    id?: number
    nome?: string
    cnpj?: string | null
    endereco?: string | null
    cidade?: string | null
    estado?: string | null
    telefone?: string | null
    email?: string | null
    ativo?: boolean
    created_at?: string
    updated_at?: string
  }
  Relationships: []
}

export interface TurnoTable {
  Row: {
    ativo: boolean
    horario_fim: string
    horario_inicio: string
    id: number
    nome: string
  }
  Insert: {
    ativo?: boolean
    horario_fim: string
    horario_inicio: string
    id?: number
    nome: string
  }
  Update: {
    ativo?: boolean
    horario_fim?: string
    horario_inicio?: string
    id?: number
    nome?: string
  }
  Relationships: []
}

export interface ConfiguracaoTable {
  Row: {
    categoria: string
    chave: string
    descricao: string | null
    id: number
    tipo: string
    updated_at: string
    valor: string
  }
  Insert: {
    categoria?: string
    chave: string
    descricao?: string | null
    id?: number
    tipo?: string
    updated_at?: string
    valor: string
  }
  Update: {
    categoria?: string
    chave?: string
    descricao?: string | null
    id?: number
    tipo?: string
    updated_at?: string
    valor?: string
  }
  Relationships: []
}

export interface UsuarioTable {
  Row: {
    ativo: boolean
    createdAt: string
    email: string
    id: number
    nome: string
    role: DatabaseEnums["Role"]
    senha: string
    updatedAt: string
  }
  Insert: {
    ativo?: boolean
    createdAt?: string
    email: string
    id?: number
    nome: string
    role?: DatabaseEnums["Role"]
    senha: string
    updatedAt?: string
  }
  Update: {
    ativo?: boolean
    createdAt?: string
    email?: string
    id?: number
    nome?: string
    role?: DatabaseEnums["Role"]
    senha?: string
    updatedAt?: string
  }
  Relationships: []
}

export interface UsuarioPostoTable {
  Row: {
    id: number
    usuario_id: number
    posto_id: number
    role: string
    ativo: boolean
    created_at: string
  }
  Insert: {
    id?: number
    usuario_id: number
    posto_id: number
    role?: string
    ativo?: boolean
    created_at?: string
  }
  Update: {
    id?: number
    usuario_id?: number
    posto_id?: number
    role?: string
    ativo?: boolean
    created_at?: string
  }
  Relationships: [
    {
      foreignKeyName: "UsuarioPosto_usuario_id_fkey"
      columns: ["usuario_id"]
      referencedRelation: "Usuario"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "UsuarioPosto_posto_id_fkey"
      columns: ["posto_id"]
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}
