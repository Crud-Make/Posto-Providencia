<?php

declare(strict_types=1);

namespace App\Pessoas\Application;

/**
 * Confere um JWT do Supabase Auth e devolve o `sub` — o id em `auth.users`, que é para onde
 * `Usuario.auth_user_id` aponta (`banco/init/01-esquema-base.sql:510`, FK em `:731`).
 *
 * Pura de propósito: não conhece HTTP nem Eloquent, então cada caso de borda de assinatura é
 * testável sem subir rota. Quem liga o `sub` ao `Usuario` é o middleware.
 *
 * Sem biblioteca de JWT: o Supabase deste projeto assina em **HS256** (conferido no header do
 * token em 20/09/2026), que é `hash_hmac` nativo do PHP. Entra biblioteca no dia em que houver um
 * segundo algoritmo — trocar o emissor para o Sanctum não exige isso.
 */
final readonly class VerificaTokenDoSupabase
{
    public function __construct(
        private string $segredo,
        private string $audiencia,
        private int $folgaSegundos,
    ) {}

    /**
     * @return string|null o `sub` do token, ou null se o token for recusado por qualquer motivo.
     *                     Motivo não sai daqui de propósito: para quem chama, recusa é recusa —
     *                     detalhar em resposta HTTP entrega informação a quem está sondando.
     */
    public function __invoke(string $token): ?string
    {
        if ($this->segredo === '') {
            return null;
        }

        $partes = explode('.', $token);

        if (count($partes) !== 3) {
            return null;
        }

        [$cabecalhoB64, $payloadB64, $assinaturaB64] = $partes;

        if (! $this->algoritmoEhHs256($cabecalhoB64)) {
            return null;
        }

        if (! $this->assinaturaConfere($cabecalhoB64, $payloadB64, $assinaturaB64)) {
            return null;
        }

        $payload = $this->json($payloadB64);

        if ($payload === null || ! $this->validadeConfere($payload)) {
            return null;
        }

        $sub = $payload['sub'] ?? null;

        return is_string($sub) && $sub !== '' ? $sub : null;
    }

    /**
     * Recusa `alg` diferente de HS256 ANTES de conferir a assinatura. Sem isto, um token com
     * `"alg":"none"` (assinatura vazia) ou com troca de algoritmo passaria — é a confusão de
     * algoritmo, a falha clássica de quem valida JWT à mão.
     */
    private function algoritmoEhHs256(string $cabecalhoB64): bool
    {
        $cabecalho = $this->json($cabecalhoB64);

        return ($cabecalho['alg'] ?? null) === 'HS256';
    }

    private function assinaturaConfere(string $cabecalhoB64, string $payloadB64, string $assinaturaB64): bool
    {
        $esperada = hash_hmac('sha256', $cabecalhoB64.'.'.$payloadB64, $this->segredo, binary: true);
        $recebida = $this->base64UrlDecode($assinaturaB64);

        if ($recebida === null) {
            return false;
        }

        // hash_equals e não `===`: comparação de tempo constante, para a assinatura não poder ser
        // adivinhada byte a byte medindo o tempo de resposta.
        return hash_equals($esperada, $recebida);
    }

    /** @param array<array-key, mixed> $payload */
    private function validadeConfere(array $payload): bool
    {
        $agora = time();

        $exp = $payload['exp'] ?? null;

        if (! is_int($exp) || $agora > $exp + $this->folgaSegundos) {
            return false;
        }

        $nbf = $payload['nbf'] ?? null;

        if (is_int($nbf) && $agora < $nbf - $this->folgaSegundos) {
            return false;
        }

        // Token de `anon` ou de `service_role` tem outra audiência: não é usuário logado e não
        // pode virar identidade no painel.
        return ($payload['aud'] ?? null) === $this->audiencia;
    }

    /** @return array<array-key, mixed>|null */
    private function json(string $b64): ?array
    {
        $cru = $this->base64UrlDecode($b64);

        if ($cru === null) {
            return null;
        }

        $decodificado = json_decode($cru, associative: true);

        return is_array($decodificado) ? $decodificado : null;
    }

    private function base64UrlDecode(string $valor): ?string
    {
        $decodificado = base64_decode(strtr($valor, '-_', '+/'), strict: true);

        return $decodificado === false ? null : $decodificado;
    }
}
