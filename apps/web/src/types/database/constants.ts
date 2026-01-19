/**
 * Constantes exportadas do Database
 */
export const DatabaseConstants = {
  public: {
    Enums: {
      installment_status: ["pendente", "pago", "atrasado"],
      periodicity_type: ["mensal", "quinzenal", "semanal", "diario"],
      Role: ["ADMIN", "GERENTE", "OPERADOR", "FRENTISTA"],
      StatusFechamento: ["RASCUNHO", "FECHADO"],
      TipoTransacaoBaratencia: ["DEPOSITO", "CONVERSAO", "RESGATE", "ESTORNO"],
      StatusTokenAbastecimento: ["PENDENTE", "USADO", "EXPIRADO", "CANCELADO"],
    },
  },
} as const;
