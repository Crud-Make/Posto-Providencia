/**
 * Tabelas do Domínio: Pagamentos
 * 
 * @remarks
 * Contém definições para FormaPagamento e Maquininha.
 */

export interface FormaPagamentoTable {
  Row: {
    ativo: boolean
    id: number
    nome: string
    taxa: number | null
    tipo: string
    posto_id: number
  }
  Insert: {
    ativo?: boolean
    id?: number
    nome: string
    taxa?: number | null
    tipo: string
    posto_id: number
  }
  Update: {
    ativo?: boolean
    id?: number
    nome?: string
    taxa?: number | null
    tipo?: string
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "FormaPagamento_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}

export interface MaquininhaTable {
  Row: {
    ativo: boolean
    id: number
    nome: string
    operadora: string | null
    taxa: number | null
    posto_id: number
  }
  Insert: {
    ativo?: boolean
    id?: number
    nome: string
    operadora?: string | null
    taxa?: number | null
    posto_id: number
  }
  Update: {
    ativo?: boolean
    id?: number
    nome?: string
    operadora?: string | null
    taxa?: number | null
    posto_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "Maquininha_posto_id_fkey"
      columns: ["posto_id"]
      isOneToOne: false
      referencedRelation: "Posto"
      referencedColumns: ["id"]
    }
  ]
}
