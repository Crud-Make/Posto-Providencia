<?php

declare(strict_types=1);

use App\Pessoas\Application\VerificaTokenDoSupabase;

const SEGREDO = 'segredo-de-teste-nao-e-o-de-producao';

function b64url(string $cru): string
{
    return rtrim(strtr(base64_encode($cru), '+/', '-_'), '=');
}

/**
 * Monta um JWT como o Supabase monta. `$assinarCom = null` deixa a assinatura vazia (o caso do
 * `alg: none`); qualquer outro segredo produz assinatura que não confere.
 *
 * @param  array<string, mixed>  $payload
 */
function token(array $payload = [], string $alg = 'HS256', ?string $assinarCom = SEGREDO): string
{
    $payload = array_merge(['sub' => 'a1b2c3d4-0000-4000-8000-000000000001', 'aud' => 'authenticated', 'exp' => time() + 3600], $payload);

    $cabecalho = b64url((string) json_encode(['alg' => $alg, 'typ' => 'JWT']));
    $corpo = b64url((string) json_encode($payload));
    $assinatura = $assinarCom === null ? '' : b64url(hash_hmac('sha256', $cabecalho.'.'.$corpo, $assinarCom, binary: true));

    return $cabecalho.'.'.$corpo.'.'.$assinatura;
}

function verifica(string $segredo = SEGREDO): VerificaTokenDoSupabase
{
    return new VerificaTokenDoSupabase(segredo: $segredo, audiencia: 'authenticated', folgaSegundos: 10);
}

it('aceita token bem assinado e devolve o sub', function (): void {
    expect(verifica()(token()))->toBe('a1b2c3d4-0000-4000-8000-000000000001');
});

it('recusa token assinado com outro segredo', function (): void {
    expect(verifica()(token(assinarCom: 'segredo-errado')))->toBeNull();
});

it('recusa alg none, mesmo com payload intacto', function (): void {
    // Canário da confusão de algoritmo: sem a checagem de `alg` ANTES da assinatura, este passa.
    expect(verifica()(token(alg: 'none', assinarCom: null)))->toBeNull();
});

it('recusa troca de algoritmo para RS256', function (): void {
    expect(verifica()(token(alg: 'RS256')))->toBeNull();
});

it('recusa token expirado, mas tolera a folga de relógio', function (): void {
    expect(verifica()(token(['exp' => time() - 3600])))->toBeNull()
        ->and(verifica()(token(['exp' => time() - 5])))->not->toBeNull();
});

it('recusa token que ainda não vale (nbf no futuro)', function (): void {
    expect(verifica()(token(['nbf' => time() + 3600])))->toBeNull();
});

it('recusa audiência que não é authenticated', function (): void {
    // Token de `anon` e de `service_role` não é usuário logado.
    expect(verifica()(token(['aud' => 'anon'])))->toBeNull()
        ->and(verifica()(token(['aud' => 'service_role'])))->toBeNull();
});

it('recusa token sem sub, com sub vazio e sem exp', function (): void {
    expect(verifica()(token(['sub' => null])))->toBeNull()
        ->and(verifica()(token(['sub' => ''])))->toBeNull()
        ->and(verifica()(token(['exp' => null])))->toBeNull();
});

it('recusa qualquer coisa que não tenha três partes', function (): void {
    expect(verifica()(''))->toBeNull()
        ->and(verifica()('nao.e'))->toBeNull()
        ->and(verifica()('a.b.c.d'))->toBeNull()
        ->and(verifica()('!!!.@@@.###'))->toBeNull();
});

it('falha fechada: segredo vazio recusa até token que seria válido', function (): void {
    // Sem SUPABASE_JWT_SECRET no .env, nada passa. Nunca o contrário.
    expect(verifica(segredo: '')(token()))->toBeNull();
});
