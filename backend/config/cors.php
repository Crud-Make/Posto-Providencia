<?php

/**
 * CORS — quem pode chamar esta API a partir do navegador.
 *
 * @remarks
 * O painel é servido pela Vercel, em outro domínio, e chama esta API. Sem CORS o navegador barra
 * a resposta, e o sintoma é "a API está viva no curl mas não responde na tela".
 *
 * O padrão do framework é `allowed_origins: ['*']` — qualquer site chama a API. Isso é o certo
 * para o desenvolvimento (o Vite roda em outra porta) e errado para a produção. A lista de
 * produção sai de `CORS_ORIGINS` (uma ou mais origens separadas por vírgula), e o
 * `docker/entrypoint.sh` RECUSA subir com a variável vazia ou `*`.
 *
 * `supports_credentials` fica `false` de propósito: a autenticação é `Authorization: Bearer`
 * (o token do Supabase Auth, `docs/design/autenticacao.md` §3b), não cookie de sessão. Com `*`
 * nas origens, aliás, o navegador recusaria credenciais de qualquer forma.
 *
 * `max_age` de uma hora: o preflight de cada requisição autenticada é uma ida e volta a menos
 * no caminho do frentista.
 */
$origensDoAmbiente = static function (): array {
    $bruto = (string) env('CORS_ORIGINS', '*');
    $origens = array_map(static fn (string $origem): string => trim($origem), explode(',', $bruto));

    return array_values(array_filter($origens, static fn (string $origem): bool => $origem !== ''));
};

$origens = $origensDoAmbiente();

return [
    // Só a API. O `/api/saude` está aqui e é público — o healthcheck do container depende dele.
    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Lista vazia cai no padrão do framework: existe para o dev, que não define a variável.
    // Em produção o entrypoint recusa esse caso antes de o app subir.
    'allowed_origins' => $origens === [] ? ['*'] : $origens,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Authorization', 'Content-Type', 'Origin', 'X-Requested-With'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,
];
