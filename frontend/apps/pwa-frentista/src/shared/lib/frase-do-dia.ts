/**
 * Frases da tela de escolha do posto — as mesmas, na mesma ordem, do painel (marca nova, 27/09/2026).
 */
const FRASES = [
  'Cada litro bem medido é lucro que fica em casa.',
  'Caixa conferido hoje, cabeça tranquila amanhã.',
  'Quem cuida dos detalhes cuida do posto inteiro.',
  'Atendimento bom faz o cliente voltar, e voltar de novo.',
  'Pequenos acertos todo dia fazem um mês forte.',
  'Números em dia, decisões seguras.',
] as const;

/** Uma frase por dia do mês: a mesma o dia inteiro, outra amanhã. */
export function fraseDoDia(agora: Date): string {
  return FRASES[agora.getDate() % FRASES.length] ?? FRASES[0];
}

/** "Bom dia" até 11h59, "Boa tarde" até 17h59, "Boa noite" depois. */
export function saudacao(agora: Date): string {
  const hora = agora.getHours();
  if (hora < 12) return 'Bom dia';
  return hora < 18 ? 'Boa tarde' : 'Boa noite';
}
