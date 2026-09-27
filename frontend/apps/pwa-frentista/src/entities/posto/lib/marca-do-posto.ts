import { urlDaApi } from '@frentista/shared/config';
import type { Posto } from '../model/schema';

/**
 * A foto do cartão do posto na tela de escolha. Vence a que o gerente subiu pela canetinha do painel
 * (`foto` da API, 27/09/2026); sem ela, o posto tenta `public/postos/<id>.jpg`, e quem não tem foto
 * (o arquivo falta ou não carrega) mostra as iniciais.
 */
export function fotoDoPosto(posto: Pick<Posto, 'id' | 'foto'>): string {
  const base = urlDaApi();
  if (posto.foto != null && posto.foto !== '' && base !== null) return `${base}${posto.foto}`;
  return `/postos/${posto.id}.jpg`;
}

/**
 * Iniciais do posto para o cartão sem foto — a mesma regra do painel: tira o "Posto " da frente;
 * sobrando até 3 letras (uma sigla, "BR"), vão todas; senão, a primeira ("Jorro" → "J").
 */
export function iniciaisDoPosto(nome: string): string {
  const semPosto = nome.trim().replace(/^posto\s+/i, '');
  const base = semPosto === '' ? nome.trim() : semPosto;
  return base.length <= 3 ? base.toUpperCase() : base.slice(0, 1).toUpperCase();
}
