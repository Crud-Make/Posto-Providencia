/**
 * A foto do cartão do posto na tela de escolha. Não há mapa id → arquivo: todo posto tenta
 * `public/postos/<id>.jpg`, e quem não tem foto (o arquivo falta ou não carrega) mostra as iniciais.
 * Posto novo ganha foto só por colocar o arquivo, sem mexer em código.
 */
export function fotoDoPosto(id: number): string {
  return `/postos/${id}.jpg`;
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
