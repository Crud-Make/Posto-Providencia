<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Compartilhado\PostoAtual;
use App\Fechamento\Domain\FechamentoFrentista;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * O "Histórico Recente" do detalhe de um frentista na tela Frentistas do painel (#103) — o porte de
 * `useHistoricoFrentista`: os últimos {@see self::LIMITE} envios dele, do mais novo para o mais
 * antigo (`.order('id', desc).limit(30)`), com o dia e o turno do pai.
 *
 * Diferença de propósito para o Supabase: lá a consulta não filtrava posto; aqui o frentista tem de
 * ser do posto da rota (senão `null` → 404) e as sessões são as deste posto (escopo do trait). O
 * frentista é lido por query builder — "Frentista" é de Cadastro (CA-7).
 */
final readonly class HistoricoParaOGerente
{
    public const int LIMITE = 30;

    public function __construct(
        private HistoricoDoFrentista $historico,
        private PostoAtual $postoAtual,
    ) {}

    /** @return Collection<int, FechamentoFrentista>|null */
    public function __invoke(int $frentistaId): ?Collection
    {
        $doPosto = DB::table('Frentista')
            ->where('id', $frentistaId)
            ->where('posto_id', $this->postoAtual->id())
            ->exists();

        return $doPosto ? ($this->historico)($frentistaId, self::LIMITE) : null;
    }
}
