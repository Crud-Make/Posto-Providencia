<?php

declare(strict_types=1);

namespace App\Cadastro\Application;

use App\Cadastro\Domain\Configuracao;
use App\Compartilhado\PostoAtual;
use Illuminate\Support\Facades\DB;

/**
 * Os parâmetros de Configurações do posto em foco ({@see PostoAtual}) (#103): tolerância de
 * divergência e dias de estoque crítico/baixo, em `Configuracao` (valor em texto).
 *
 * Porte de `useParametros`: as mesmas três chaves. O que muda: salvar é UPSERT por (chave, posto)
 * — o UPDATE puro do Supabase falhava num posto sem as linhas (o BR). Chave sem linha lê `null`, e
 * a tela mantém o padrão dela.
 */
final readonly class ParametrosDoPosto
{
    public const CHAVES = ['tolerancia_divergencia', 'dias_estoque_critico', 'dias_estoque_baixo'];

    /** @return array<string, string|null> */
    public function ler(): array
    {
        $gravados = Configuracao::query()->whereIn('chave', self::CHAVES)->pluck('valor', 'chave');

        return array_combine(self::CHAVES, array_map(
            static fn (string $chave): ?string => is_string($gravados->get($chave)) ? $gravados->get($chave) : null,
            self::CHAVES,
        ));
    }

    /**
     * @param  array<string, string>  $valores  as três chaves, já validadas
     * @return array<string, string|null>
     */
    public function gravar(array $valores): array
    {
        DB::transaction(function () use ($valores): void {
            foreach ($valores as $chave => $valor) {
                Configuracao::query()->updateOrCreate(['chave' => $chave], ['valor' => $valor]);
            }
        });

        return $this->ler();
    }
}
