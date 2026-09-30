<?php

declare(strict_types=1);

namespace App\Cadastro\Domain;

/**
 * CNPJ conferido pelos dígitos verificadores — numérico ou ALFANUMÉRICO (IN RFB 2.229/2024, emitido
 * desde julho de 2026: as 12 primeiras posições podem ter letras; os 2 DV seguem números).
 *
 * O valor de cada posição é o código ASCII − 48 (0–9 valem 0–9, A vale 17 … Z vale 42), com os
 * pesos de sempre; para CNPJ só de dígitos a conta é idêntica à antiga. Pontuação e espaço caem
 * fora, letra vira maiúscula, e o guardado é sempre `XX.XXX.XXX/XXXX-DD` — um formato só, para o
 * unique `(cnpj, posto_id)` não aceitar o mesmo CNPJ escrito de dois jeitos.
 */
final readonly class Cnpj
{
    private function __construct(public string $formatado) {}

    /** `null` quando não é CNPJ: tamanho, caractere, DV errado ou todos iguais ("00.000.000/0000-00"). */
    public static function de(string $digitado): ?self
    {
        $limpo = self::limpo($digitado);
        if (preg_match('/^[0-9A-Z]{12}[0-9]{2}$/', $limpo) !== 1 || count(array_unique(str_split($limpo))) === 1) {
            return null;
        }

        $base = substr($limpo, 0, 12);
        $dv1 = self::digito($base);
        $dv2 = self::digito($base.$dv1);
        if ($limpo !== $base.$dv1.$dv2) {
            return null;
        }

        return new self(sprintf('%s.%s.%s/%s-%s', substr($limpo, 0, 2), substr($limpo, 2, 3), substr($limpo, 5, 3), substr($limpo, 8, 4), substr($limpo, 12, 2)));
    }

    /** Só letras maiúsculas e dígitos — a forma de comparar CNPJs guardados com máscaras diferentes. */
    public static function limpo(string $digitado): string
    {
        return (string) preg_replace('/[^0-9A-Z]/', '', strtoupper($digitado));
    }

    private static function digito(string $posicoes): int
    {
        $soma = 0;
        $peso = strlen($posicoes) - 7;
        foreach (str_split($posicoes) as $caractere) {
            $soma += (ord($caractere) - 48) * $peso;
            $peso = $peso === 2 ? 9 : $peso - 1;
        }
        $resto = $soma % 11;

        return $resto < 2 ? 0 : 11 - $resto;
    }
}
