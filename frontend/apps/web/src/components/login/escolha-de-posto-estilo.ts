import { enderecoDaFoto } from '../../services/api/foto-do-posto.api';
import type { CSSProperties } from 'react';

/**
 * Cores e frases da tela "Escolha o posto" (redesenho de 27/09/2026, canvas "Escolha de Posto —
 * Rede Providência"). As cores saem da logo nova: vermelho #A30E19, azul #042992, dourado #E5BE41.
 * O tema segue o mesmo interruptor do painel (`useTheme`); cada tema vira variáveis CSS na raiz.
 */
const TEMAS = {
  light: {
    '--fundo': '#FBF8F2', '--painel': '#FFFFFF', '--linha': '#EAE4D8', '--texto': '#14204A',
    '--texto-medio': '#4A5578', '--texto-suave': '#5B6584', '--cartao': '#FFFFFF', '--borda-cartao': '#E6DFD2',
    '--acento': '#A30E19', '--azul': '#042992', '--azul-fundo': '#E8EDFA', '--botao': '#FFFFFF', '--borda-botao': '#DDD6C8',
  },
  dark: {
    '--fundo': '#0A0F1C', '--painel': '#0F172A', '--linha': '#1C2640', '--texto': '#F1F4FA',
    '--texto-medio': '#B7C0D4', '--texto-suave': '#9AA6BF', '--cartao': '#111A2E', '--borda-cartao': '#243150',
    '--acento': '#F2707A', '--azul': '#A9C0F5', '--azul-fundo': '#17233F', '--botao': 'transparent', '--borda-botao': '#2A3654',
  },
} as const;

export function variaveisDoTema(tema: 'light' | 'dark'): CSSProperties {
  return TEMAS[tema] as unknown as CSSProperties;
}

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

export function saudacao(agora: Date, nome: string): string {
  const hora = agora.getHours();
  const periodo = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
  const primeiro = nome.trim().split(/\s+/)[0] ?? '';
  return primeiro === '' ? periodo : `${periodo}, ${primeiro}`;
}

/**
 * Foto da fachada do posto no cartão: a que o gerente subiu pela canetinha do painel (27/09/2026)
 * e, enquanto ninguém subir, a imagem que o login do Jorro (id 1) já usava; os outros mostram as
 * iniciais.
 */
export function fotoDoPosto(id: number, caminhoDaFoto: string | null): string | null {
  return enderecoDaFoto(caminhoDaFoto) ?? (id === 1 ? '/fundo-login.jpg' : null);
}

export function iniciaisDoPosto(nome: string): string {
  const semPosto = nome.replace(/^posto\s+/i, '').trim();
  return semPosto.length <= 3 ? semPosto.toUpperCase() : semPosto.slice(0, 1).toUpperCase();
}
