import { okAsync, type ResultAsync } from 'neverthrow';
import { lerDaApi, type ErroDeApi } from '@frentista/shared/api';
import { pwaPelaApiLigado } from '@frentista/shared/config';
import { postosDaApiSchema, type Posto } from '../model/schema';

/**
 * O posto da instalação ANTIGA, a do Supabase: ela é de um posto só (o Jorro) e não tem lista de
 * postos para ler. Vale só com a API desligada (`VITE_API_PWA` ausente); com ela ligada, quem diz
 * quais postos existem é `GET /api/postos`. Com um posto só, a porta entra direto nele, sem
 * perguntar — o PWA de produção no Supabase segue exatamente como era.
 */
const POSTO_DA_INSTALACAO_SUPABASE: Posto = { id: 1, nome: 'Posto Jorro' };

/** `GET /api/postos` — pública, sem token: `id` e `nome` dos postos ativos, por id. */
export function buscarPostosAtivosPelaApi(): ResultAsync<Posto[], ErroDeApi> {
  return lerDaApi('/api/postos', null, null, postosDaApiSchema).map((resposta) => resposta.data);
}

/**
 * Os postos que se sabem SEM ir à rede: com a API desligada, o da instalação Supabase; com ela
 * ligada, `null` (a lista vem de {@link buscarPostosAtivos}). Síncrono de propósito: sem a API, o
 * app abre no primeiro render, como antes da escolha de posto existir.
 */
export function postosSemRede(): Posto[] | null {
  return pwaPelaApiLigado() ? null : [POSTO_DA_INSTALACAO_SUPABASE];
}

/** Os postos que o aparelho pode escolher: pela API quando ligada, senão o da instalação Supabase. */
export function buscarPostosAtivos(): ResultAsync<Posto[], ErroDeApi> {
  const locais = postosSemRede();
  return locais === null ? buscarPostosAtivosPelaApi() : okAsync<Posto[], ErroDeApi>(locais);
}
