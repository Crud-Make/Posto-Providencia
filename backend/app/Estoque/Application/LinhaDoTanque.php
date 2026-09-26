<?php

declare(strict_types=1);

namespace App\Estoque\Application;

use LogicException;
use stdClass;

/**
 * Lê uma coluna de uma linha do query builder já com o tipo que o contrato da tela de Tanques
 * promete (painel-pela-api.md §11). `numeric` chega do PDO pgsql como string — é o que garante
 * escala exata e nenhum float no caminho. Coluna fora do tipo é erro de programação (o SQL mudou),
 * não dado a converter.
 *
 * É a mesma ideia de `App\Agregacao\Application\LinhaDoBanco`, repetida aqui porque módulo não
 * importa módulo (CA-7, `'Estoque' => []` no Pest Arch).
 */
final class LinhaDoTanque
{
    public static function inteiro(stdClass $linha, string $campo): int
    {
        $valor = $linha->{$campo} ?? null;

        return is_int($valor) ? $valor : throw new LogicException("Coluna {$campo}: esperava inteiro do Postgres.");
    }

    public static function texto(stdClass $linha, string $campo): string
    {
        $valor = $linha->{$campo} ?? null;

        return is_string($valor) ? $valor : throw new LogicException("Coluna {$campo}: esperava texto do Postgres.");
    }

    public static function decimal(stdClass $linha, string $campo): string
    {
        $valor = $linha->{$campo} ?? null;
        if (! is_string($valor) || ! is_numeric($valor)) {
            throw new LogicException("Coluna {$campo}: esperava numeric (string decimal) do Postgres.");
        }

        return $valor;
    }

    /** `numeric` que pode faltar de verdade (régua não medida, custo não cadastrado): `null` fica `null`. */
    public static function decimalOuNulo(stdClass $linha, string $campo): ?string
    {
        return ($linha->{$campo} ?? null) === null ? null : self::decimal($linha, $campo);
    }
}
