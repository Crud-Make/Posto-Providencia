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
  /** `ABERTO` é o que o PWA grava ao criar o pai do dia; faltava aqui e o painel nunca testava por ele. */
  StatusFechamento: "RASCUNHO" | "FECHADO" | "ABERTO"
  TipoTransacaoBaratencia: "DEPOSITO" | "CONVERSAO" | "RESGATE" | "ESTORNO"
  StatusTokenAbastecimento: "PENDENTE" | "USADO" | "EXPIRADO" | "CANCELADO"
}
