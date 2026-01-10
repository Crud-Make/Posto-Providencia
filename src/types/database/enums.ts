/**
 * Enums do Database
 * 
 * @remarks
 * Definições de Enums utilizados no banco de dados.
 */

export interface DatabaseEnums {
  installment_status: "pendente" | "pago" | "atrasado"
  periodicity_type: "mensal" | "quinzenal" | "semanal" | "diario"
  Role: "ADMIN" | "GERENTE" | "OPERADOR" | "FRENTISTA"
  StatusFechamento: "RASCUNHO" | "FECHADO"
  TipoTransacaoBaratencia: "DEPOSITO" | "CONVERSAO" | "RESGATE" | "ESTORNO"
  StatusTokenAbastecimento: "PENDENTE" | "USADO" | "EXPIRADO" | "CANCELADO"
}
