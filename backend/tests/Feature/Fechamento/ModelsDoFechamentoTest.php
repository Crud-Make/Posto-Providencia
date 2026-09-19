<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\FormaPagamento;
use App\Cadastro\Domain\Frentista;
use App\Cadastro\Domain\Turno;
use App\Compartilhado\Enums\StatusFechamento;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\FechamentoFrentista;
use App\Fechamento\Domain\Leitura;
use App\Fechamento\Domain\Recebimento;
use App\Pessoas\Domain\Usuario;
use Illuminate\Database\LazyLoadingViolationException;

/**
 * Contra o Postgres real (esquema de produção), em transação que reverte no fim de cada teste.
 * Fatia P3 do Design Doc fechamento-diario-api.md: models só de leitura, sem Application nem rota.
 *
 * Cada chamada cria o próprio Turno porque o unique de Fechamento é (data, turno_id) SEM posto
 * (01-esquema-base.sql:757) — dois postos no mesmo dia colidiriam. É a dívida de esquema do §5.
 * Os números são dado de exemplo, não resultado de conta: este módulo não calcula nada.
 *
 * @return array{posto: Posto, fechamento: Fechamento, sessao: FechamentoFrentista, recebimento: Recebimento, leitura: Leitura}
 */
function diaFechadoEm(string $diaUtc, ?Posto $posto = null): array
{
    $posto ??= Posto::factory()->create();
    $usuario = Usuario::factory()->create();
    $turno = Turno::factory()->create(['posto_id' => $posto->id]);
    $frentista = Frentista::factory()->create(['posto_id' => $posto->id, 'turno_id' => $turno->id]);
    $combustivel = Combustivel::factory()->create(['posto_id' => $posto->id]);
    $bomba = Bomba::factory()->create(['posto_id' => $posto->id]);
    $bico = Bico::factory()->create(['posto_id' => $posto->id, 'bomba_id' => $bomba->id, 'combustivel_id' => $combustivel->id]);
    $forma = FormaPagamento::factory()->create(['posto_id' => $posto->id]);

    $fechamento = Fechamento::query()->create([
        'data' => "{$diaUtc}T00:00:00Z",
        'total_recebido' => '0.00',
        'status' => StatusFechamento::Rascunho,
        'usuario_id' => $usuario->id,
        'turno_id' => $turno->id,
        'posto_id' => $posto->id,
    ]);

    $sessao = FechamentoFrentista::query()->create([
        'fechamento_id' => $fechamento->id,
        'frentista_id' => $frentista->id,
        'valor_dinheiro' => '150.50',
        'valor_moedas' => '2.25',
        'valor_pix' => '300.00',
        'valor_cartao' => '0.00',
        'valor_cartao_debito' => '80.10',
        'valor_cartao_credito' => '120.90',
        'valor_nota' => '45.00',
        'baratao' => '0.00',
        'encerrante' => '700.00',
        'valor_conferido' => '698.75',
        'diferenca_calculada' => '1.25',
        'posto_id' => $posto->id,
    ]);

    $recebimento = Recebimento::query()->create([
        'fechamento_id' => $fechamento->id,
        'forma_pagamento_id' => $forma->id,
        'valor' => '698.75',
        'observacoes' => 'Fechamento Geral',
    ]);

    $leitura = Leitura::query()->create([
        'data' => "{$diaUtc}T00:00:00Z",
        'bico_id' => $bico->id,
        'combustivel_id' => $combustivel->id,
        'leitura_inicial' => '1000.000',
        'leitura_final' => '1234.567',
        'litros_vendidos' => '234.567',
        'preco_litro' => '6.38',
        'valor_total' => '1496.54',
        'usuario_id' => $usuario->id,
        'turno_id' => $turno->id,
        'posto_id' => $posto->id,
    ]);

    return compact('posto', 'fechamento', 'sessao', 'recebimento', 'leitura');
}

it('resolve as relações do módulo contra o esquema real', function (): void {
    $dia = diaFechadoEm('2026-01-15');

    $lido = Fechamento::query()->with(['frentistas', 'recebimentos'])->findOrFail($dia['fechamento']->id);

    expect($lido->frentistas->pluck('id')->all())->toBe([$dia['sessao']->id])
        ->and($lido->recebimentos->pluck('id')->all())->toBe([$dia['recebimento']->id])
        ->and($lido->posto?->is($dia['posto']))->toBeTrue()
        ->and($dia['sessao']->fechamento?->is($lido))->toBeTrue()
        ->and($dia['sessao']->posto?->is($dia['posto']))->toBeTrue()
        ->and($dia['recebimento']->fechamento?->is($lido))->toBeTrue()
        ->and($dia['leitura']->posto?->is($dia['posto']))->toBeTrue();
});

// Leitura não tem FK para Fechamento (01-esquema-base.sql:698-702): o dia liga os dois por
// (posto_id, dia UTC), então a consulta é por data, não por relação.
it('acha as leituras do dia pelo posto e pelo dia UTC, sem relação com o pai', function (): void {
    $dia = diaFechadoEm('2026-01-15');
    diaFechadoEm('2026-01-16', $dia['posto']);
    app(PostoAtual::class)->definir($dia['posto']->id);

    $ids = Leitura::query()
        ->whereRaw("(data AT TIME ZONE 'UTC')::date = ?", ['2026-01-15'])
        ->pluck('id')
        ->all();

    expect($ids)->toBe([$dia['leitura']->id]);
});

// É a trava do AppServiceProvider (preventLazyLoading) sendo exercitada de propósito: a coleção
// sem with() lança, a mesma coleção com with() carrega. Quem esquecer o eager loading numa Query
// do módulo cai aqui, não em produção.
it('coleção de fechamentos sem with() lança N+1; com with() carrega filhos', function (): void {
    $a = diaFechadoEm('2026-01-15');
    $b = diaFechadoEm('2026-01-16', $a['posto']);
    $ids = [$a['fechamento']->id, $b['fechamento']->id];

    $semWith = Fechamento::query()->whereKey($ids)->get();
    expect(fn () => $semWith->first()?->recebimentos)->toThrow(LazyLoadingViolationException::class);

    $comWith = Fechamento::query()->whereKey($ids)->with(['frentistas', 'recebimentos'])->orderBy('id')->get();
    expect($comWith->first()?->recebimentos->pluck('id')->all())->toBe([$a['recebimento']->id])
        ->and($comWith->last()?->frentistas->pluck('id')->all())->toBe([$b['sessao']->id]);
});

it('casts: dinheiro em string de escala 2, litros em escala 3, status vira enum, NULL fica NULL', function (): void {
    $dia = diaFechadoEm('2026-01-15');

    $fechamento = Fechamento::query()->findOrFail($dia['fechamento']->id);
    $sessao = FechamentoFrentista::query()->findOrFail($dia['sessao']->id);
    $recebimento = Recebimento::query()->findOrFail($dia['recebimento']->id);
    $leitura = Leitura::query()->findOrFail($dia['leitura']->id);

    // I8: total_vendas e diferenca nascem NULL ("não apurado"); 0 seria "bateu".
    expect($fechamento->total_vendas)->toBeNull()
        ->and($fechamento->diferenca)->toBeNull()
        ->and($fechamento->total_recebido)->toBe('0.00')
        ->and($fechamento->status)->toBe(StatusFechamento::Rascunho)
        ->and($sessao->valor_dinheiro)->toBe('150.50')
        ->and($sessao->valor_moedas)->toBe('2.25')
        ->and($sessao->valor_conferido)->toBe('698.75')
        ->and($sessao->diferenca_calculada)->toBe('1.25')
        ->and($sessao->data_hora_envio)->not->toBeNull()
        ->and($recebimento->valor)->toBe('698.75')
        ->and($leitura->leitura_final)->toBe('1234.567')
        ->and($leitura->litros_vendidos)->toBe('234.567')
        ->and($leitura->preco_litro)->toBe('6.38')
        ->and($leitura->valor_total)->toBe('1496.54');
});

// I9: `data` é timestamptz às 00:00Z e o dia é o dia em UTC. A sessão do Postgres do compose
// está em America/Sao_Paulo, então o valor volta como 21:00 do dia anterior; em UTC é o dia certo.
it('o dia do fechamento e da leitura é o dia UTC', function (): void {
    $dia = diaFechadoEm('2026-01-01');

    expect(Fechamento::query()->findOrFail($dia['fechamento']->id)->data->utc()->toDateString())->toBe('2026-01-01')
        ->and(Leitura::query()->findOrFail($dia['leitura']->id)->data->utc()->toDateString())->toBe('2026-01-01');
});

it('com posto atual, Fechamento, FechamentoFrentista e Leitura filtram por posto_id', function (): void {
    $a = diaFechadoEm('2026-01-15');
    $b = diaFechadoEm('2026-01-15');
    app(PostoAtual::class)->definir($a['posto']->id);

    expect(Fechamento::query()->whereKey([$a['fechamento']->id, $b['fechamento']->id])->pluck('id')->all())->toBe([$a['fechamento']->id])
        ->and(FechamentoFrentista::query()->whereKey([$a['sessao']->id, $b['sessao']->id])->pluck('id')->all())->toBe([$a['sessao']->id])
        ->and(Leitura::query()->whereKey([$a['leitura']->id, $b['leitura']->id])->pluck('id')->all())->toBe([$a['leitura']->id]);
});

// Recebimento não tem posto_id (01-esquema-base.sql:437-444): sozinho não filtra; pelo pai, filtra.
it('Recebimento escopa pelo Fechamento pai, porque não tem posto_id', function (): void {
    $a = diaFechadoEm('2026-01-15');
    $b = diaFechadoEm('2026-01-15');
    $ids = [$a['recebimento']->id, $b['recebimento']->id];
    app(PostoAtual::class)->definir($a['posto']->id);

    expect(Recebimento::query()->whereKey($ids)->orderBy('id')->pluck('id')->all())->toBe($ids)
        ->and(Recebimento::query()->whereKey($ids)->doPostoAtual()->pluck('id')->all())->toBe([$a['recebimento']->id]);
});

// O catálogo (turno, frentista, bico) vem de diaFechadoEm; as três linhas novas vão para OUTRO dia
// (uniques: Fechamento (data, turno_id) :757; Leitura (bico_id, data) :777) e nascem SEM posto_id.
// Mutação 18/09/2026: tirar `use PertenceAoPosto` de um dos três deixa este teste vermelho.
it('ao criar sem posto_id, os três models com PertenceAoPosto preenchem com o posto atual', function (): void {
    $dia = diaFechadoEm('2026-01-15');
    app(PostoAtual::class)->definir($dia['posto']->id);

    $fechamento = Fechamento::query()->create([
        'data' => '2026-01-16T00:00:00Z',
        'total_recebido' => '0.00',
        'status' => StatusFechamento::Rascunho,
        'usuario_id' => $dia['fechamento']->usuario_id,
        'turno_id' => $dia['fechamento']->turno_id,
    ]);

    $sessao = FechamentoFrentista::query()->create([
        'fechamento_id' => $fechamento->id,
        'frentista_id' => $dia['sessao']->frentista_id,
        'valor_dinheiro' => '10.00',
        'valor_moedas' => '0.00',
        'valor_pix' => '0.00',
        'valor_cartao' => '0.00',
        'valor_cartao_debito' => '0.00',
        'valor_cartao_credito' => '0.00',
        'valor_nota' => '0.00',
        'baratao' => '0.00',
        'encerrante' => '10.00',
        'valor_conferido' => '10.00',
        'diferenca_calculada' => '0.00',
    ]);

    $leitura = Leitura::query()->create([
        'data' => '2026-01-16T00:00:00Z',
        'bico_id' => $dia['leitura']->bico_id,
        'combustivel_id' => $dia['leitura']->combustivel_id,
        'leitura_inicial' => '1234.567',
        'leitura_final' => '1300.000',
        'litros_vendidos' => '65.433',
        'preco_litro' => '6.38',
        'valor_total' => '417.46',
        'usuario_id' => $dia['leitura']->usuario_id,
        'turno_id' => $dia['leitura']->turno_id,
    ]);

    expect(Fechamento::query()->withoutGlobalScope('posto')->findOrFail($fechamento->id)->posto_id)->toBe($dia['posto']->id)
        ->and(FechamentoFrentista::query()->withoutGlobalScope('posto')->findOrFail($sessao->id)->posto_id)->toBe($dia['posto']->id)
        ->and(Leitura::query()->withoutGlobalScope('posto')->findOrFail($leitura->id)->posto_id)->toBe($dia['posto']->id);
});
