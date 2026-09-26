<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

use LogicException;
use stdClass;

/**
 * Lê uma coluna de uma linha do query builder já com o tipo que o contrato promete.
 *
 * O módulo lê tabela com `DB::table` (Design Doc agregacao.md §2), e o `stdClass` que volta é
 * `mixed` em cada campo. Aqui o tipo é conferido em vez de presumido: coluna fora do esperado é
 * erro de programação (o SQL mudou), não dado a converter.
 *
 * `numeric` chega do PDO pgsql como string — é isso que garante escala exata e zero float.
 */
final class LinhaDoBanco
{
    public static function inteiro(stdClass $linha, string $campo): int
    {
        $valor = $linha->{$campo} ?? null;
        if (! is_int($valor)) {
            throw new LogicException("Coluna {$campo}: esperava inteiro do Postgres.");
        }

        return $valor;
    }

    public static function texto(stdClass $linha, string $campo): string
    {
        $valor = $linha->{$campo} ?? null;
        if (! is_string($valor)) {
            throw new LogicException("Coluna {$campo}: esperava texto do Postgres.");
        }

        return $valor;
    }

    public static function textoOuNulo(stdClass $linha, string $campo): ?string
    {
        return ($linha->{$campo} ?? null) === null ? null : self::texto($linha, $campo);
    }

    public static function decimal(stdClass $linha, string $campo): string
    {
        $valor = $linha->{$campo} ?? null;
        if (! is_string($valor) || ! is_numeric($valor)) {
            throw new LogicException("Coluna {$campo}: esperava numeric (string decimal) do Postgres.");
        }

        return $valor;
    }

    /** `numeric` que pode faltar de verdade (régua não medida): `null` continua `null`, nunca `"0"`. */
    public static function decimalOuNulo(stdClass $linha, string $campo): ?string
    {
        return ($linha->{$campo} ?? null) === null ? null : self::decimal($linha, $campo);
    }
}
