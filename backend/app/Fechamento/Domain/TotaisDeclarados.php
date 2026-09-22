<?php

declare(strict_types=1);

namespace App\Fechamento\Domain;

/**
 * Os três números que fecham o dia, COMO O CLIENTE OS DECLAROU — e só a coerência entre eles.
 *
 * **Não calcula total nenhum.** `total_vendas` e `total_recebido` vêm do painel, que os obtém de
 * `totaisDoDia` em `@posto/utils` (a função canônica; este VO tem outro nome de propósito para
 * ninguém confundir os dois). Aqui se confere apenas o que o Design Doc §5.2 manda o servidor
 * revalidar: `diferenca = total_vendas − total_recebido`, EXATO em centavos, positivo = FALTA.
 * Uma 7ª implementação da soma dos baldes não nasce aqui.
 *
 * Regras:
 * - `total_vendas` e `diferenca` andam juntos: ambos `null` (dia não apurado, invariante I8) ou
 *   ambos presentes. Um só é incoerente;
 * - os três, quando presentes, são string decimal com EXATAMENTE duas casas (`'123.45'`). Um
 *   `'8697.390000000001'` não é dinheiro: é float que vazou, e `bccomp` em escala 2 o deixaria
 *   passar — por isso a forma é conferida antes da conta;
 * - a conta é `bccomp(bcsub(total_vendas, total_recebido, 2), diferenca, 2) === 0`.
 */
final readonly class TotaisDeclarados
{
    private const string DECIMAL_2 = '/^-?\d+\.\d{2}$/';

    private function __construct(
        public ?string $totalVendas,
        public string $totalRecebido,
        public ?string $diferenca,
    ) {}

    public static function de(?string $totalVendas, string $totalRecebido, ?string $diferenca): self|RecusaDaGravacao
    {
        if (($totalVendas === null) !== ($diferenca === null)) {
            return self::recusa('total_vendas e diferenca andam juntos: os dois null (dia não apurado) ou os dois presentes.');
        }

        $malFormados = self::malFormados([
            'total_vendas' => $totalVendas,
            'total_recebido' => $totalRecebido,
            'diferenca' => $diferenca,
        ]);

        if ($malFormados !== []) {
            return self::recusa('Dinheiro vai em string decimal com duas casas.', $malFormados);
        }

        if ($totalVendas === null || $diferenca === null) {
            return new self(null, $totalRecebido, null);
        }

        // Já passou pela forma acima; este `is_numeric` só estreita para `numeric-string`, que é o
        // que o bcmath exige (PHPStan 9) — estreitar, e não castar, como em DescontaLitrosVendidos.
        if (! is_numeric($totalVendas) || ! is_numeric($totalRecebido) || ! is_numeric($diferenca)) {
            return self::recusa('Dinheiro vai em string decimal com duas casas.');
        }

        if (bccomp(bcsub($totalVendas, $totalRecebido, 2), $diferenca, 2) !== 0) {
            return self::recusa('diferenca tem de ser total_vendas − total_recebido, exato em centavos.');
        }

        return new self($totalVendas, $totalRecebido, $diferenca);
    }

    /** `true` quando o dia foi apurado (par presente). */
    public function apurado(): bool
    {
        return $this->totalVendas !== null;
    }

    /**
     * @param  array<string, ?string>  $valores
     * @return array<string, list<string>>
     */
    private static function malFormados(array $valores): array
    {
        $erros = [];

        foreach ($valores as $campo => $valor) {
            if ($valor !== null && preg_match(self::DECIMAL_2, $valor) !== 1) {
                $erros[$campo] = ['Esperado string decimal com duas casas, ex.: "123.45".'];
            }
        }

        return $erros;
    }

    /** @param  array<string, list<string>>|null  $campos */
    private static function recusa(string $mensagem, ?array $campos = null): RecusaDaGravacao
    {
        return new RecusaDaGravacao('totais_inconsistentes', $mensagem, $campos);
    }
}
