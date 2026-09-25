<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\FechamentoFrentista;
use App\Fechamento\Domain\RecusaDaGravacao;
use Carbon\CarbonImmutable;
use DateTimeInterface;

/**
 * Decide o que um envio é diante de uma linha que já existe — a idempotência do §3 do Design Doc.
 *
 * - mesma chave, mesmo frentista, mesmo posto, mesmo dia e mesmo conteúdo → é o MESMO envio chegando
 *   de novo (a rede caiu depois de gravar e o aparelho repetiu): devolve a linha, `repetido`;
 * - mesma chave e qualquer outra coisa diferente → `chave_reutilizada` (409): a chave é de uma
 *   tentativa só, e reaproveitá-la com outro valor é defeito do cliente;
 * - chave diferente, mesmo frentista no mesmo dia → `ja_enviado` (409): um envio por frentista por
 *   dia, como o PWA já trava na tela.
 */
final readonly class RepeticaoDoEnvio
{
    /** A linha que já carrega esta chave, olhada em TODOS os postos (a chave é única no banco). */
    public function pelaChave(EnvioDeclarado $envio, int $frentistaId, int $postoId): EnvioRegistrado|RecusaDaGravacao|null
    {
        $linha = FechamentoFrentista::query()
            ->withoutGlobalScope('posto')
            ->where('chave_envio', $envio->chave)
            ->first();

        if ($linha === null) {
            return null;
        }

        $mesmoDono = $linha->frentista_id === $frentistaId && $linha->posto_id === $postoId && $this->mesmoDia($linha, $envio);

        return $mesmoDono && $this->mesmoConteudo($linha, $envio)
            ? new EnvioRegistrado($linha, true, null)
            : self::chaveReutilizada();
    }

    /** O frentista já tem envio neste pai; `$existente` é essa linha. */
    public function diante(FechamentoFrentista $existente, EnvioDeclarado $envio): EnvioRegistrado|RecusaDaGravacao
    {
        if ($existente->chave_envio !== $envio->chave) {
            return new RecusaDaGravacao(
                'ja_enviado',
                'Este frentista já enviou o fechamento de '.$envio->dia->utc()->format('d/m/Y').'. Para corrigir, fale com o gerente no painel.',
            );
        }

        return $this->mesmoConteudo($existente, $envio) ? new EnvioRegistrado($existente, true, null) : self::chaveReutilizada();
    }

    private function mesmoDia(FechamentoFrentista $linha, EnvioDeclarado $envio): bool
    {
        $data = Fechamento::query()->withoutGlobalScope('posto')->whereKey($linha->fechamento_id)->value('data');

        return $data instanceof DateTimeInterface
            && CarbonImmutable::instance($data)->utc()->format('Y-m-d') === $envio->dia->utc()->format('Y-m-d');
    }

    private function mesmoConteudo(FechamentoFrentista $linha, EnvioDeclarado $envio): bool
    {
        foreach ($envio->valores as $coluna => $valor) {
            $gravado = $linha->getAttribute($coluna);

            if (! is_string($gravado) || ! is_numeric($gravado) || bccomp($gravado, $valor, 2) !== 0) {
                return false;
            }
        }

        return $linha->observacoes === $envio->observacoes;
    }

    private static function chaveReutilizada(): RecusaDaGravacao
    {
        return new RecusaDaGravacao('chave_reutilizada', 'Esta chave de envio já foi usada para outro envio.');
    }
}
