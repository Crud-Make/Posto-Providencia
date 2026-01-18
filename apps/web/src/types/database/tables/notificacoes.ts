/**
 * Tabelas do Domínio: Notificações
 */
export interface NotificacaoTable {
  Row: {
    created_at: string | null
    data_envio: string | null
    enviada: boolean | null
    fechamento_frentista_id: number | null
    frentista_id: number
    id: number
    lida: boolean | null
    mensagem: string
    tipo: string | null
    titulo: string
  }
  Insert: {
    created_at?: string | null
    data_envio?: string | null
    enviada?: boolean | null
    fechamento_frentista_id?: number | null
    frentista_id: number
    id?: number
    lida?: boolean | null
    mensagem: string
    tipo?: string | null
    titulo: string
  }
  Update: {
    created_at?: string | null
    data_envio?: string | null
    enviada?: boolean | null
    fechamento_frentista_id?: number | null
    frentista_id?: number
    id?: number
    lida?: boolean | null
    mensagem?: string
    tipo?: string | null
    titulo?: string
  }
  Relationships: [
    {
      foreignKeyName: "Notificacao_fechamento_frentista_id_fkey"
      columns: ["fechamento_frentista_id"]
      isOneToOne: false
      referencedRelation: "FechamentoFrentista"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "Notificacao_frentista_id_fkey"
      columns: ["frentista_id"]
      isOneToOne: false
      referencedRelation: "Frentista"
      referencedColumns: ["id"]
    },
  ]
}

export interface PushTokenTable {
  Row: {
    ativo: boolean | null
    created_at: string | null
    device_info: string | null
    expo_push_token: string
    frentista_id: number | null
    id: number
    updated_at: string | null
    usuario_id: number
  }
  Insert: {
    ativo?: boolean | null
    created_at?: string | null
    device_info?: string | null
    expo_push_token: string
    frentista_id?: number | null
    id?: number
    updated_at?: string | null
    usuario_id: number
  }
  Update: {
    ativo?: boolean | null
    created_at?: string | null
    device_info?: string | null
    expo_push_token?: string
    frentista_id?: number | null
    id?: number
    updated_at?: string | null
    usuario_id?: number
  }
  Relationships: [
    {
      foreignKeyName: "PushToken_frentista_id_fkey"
      columns: ["frentista_id"]
      isOneToOne: false
      referencedRelation: "Frentista"
      referencedColumns: ["id"]
    },
    {
      foreignKeyName: "PushToken_usuario_id_fkey"
      columns: ["usuario_id"]
      isOneToOne: false
      referencedRelation: "Usuario"
      referencedColumns: ["id"]
    },
  ]
}
