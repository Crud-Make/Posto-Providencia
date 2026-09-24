<?php

declare(strict_types=1);

use App\Cadastro\Domain\Combustivel;
use App\Compartilhado\Eventos\LeiturasDoDiaGravadas;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Estoque\Application\DescontaLitrosVendidos;
use App\Estoque\Domain\Estoque;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;
use Illuminate\Support\Facades\Event;

function descontar(LeiturasDoDiaGravadas $evento): void
{
    app(DescontaLitrosVendidos::class)->handle($evento);
}

it('desconta os litros por combustível', function (): void {
    $posto = Posto::factory()->create();
    $gasolina = Combustivel::factory()->create(['posto_id' => $posto->id]);
    $diesel = Combustivel::factory()->create(['posto_id' => $posto->id]);
    $eGas = Estoque::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $gasolina->id, 'quantidade_atual' => '10000.000']);
    $eDie = Estoque::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $diesel->id, 'quantidade_atual' => '8000.000']);

    descontar(new LeiturasDoDiaGravadas($posto->id, '2026-09-20', [
        $gasolina->id => '1500.500',
        $diesel->id => '300.250',
    ]));

    expect($eGas->refresh()->quantidade_atual)->toBe('8499.500')
        ->and($eDie->refresh()->quantidade_atual)->toBe('7699.750');
});

it('combustível sem linha de estoque não quebra o resto', function (): void {
    $posto = Posto::factory()->create();
    $comEstoque = Combustivel::factory()->create(['posto_id' => $posto->id]);
    $semEstoque = Combustivel::factory()->create(['posto_id' => $posto->id]);
    $estoque = Estoque::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $comEstoque->id, 'quantidade_atual' => '5000.000']);

    descontar(new LeiturasDoDiaGravadas($posto->id, '2026-09-20', [
        $semEstoque->id => '100.000',
        $comEstoque->id => '250.000',
    ]));

    expect($estoque->refresh()->quantidade_atual)->toBe('4750.000');
});

it('DEFEITO ACEITO: regravar o dia desconta DE NOVO, pelo total inteiro', function (): void {
    // Decisão do dono em 20/09/2026 (§7 (b)): mantém o comportamento do painel, que desconta no
    // INSERT e nunca devolve no DELETE. Este teste existe para o defeito parar de ser folclore:
    // ele AFIRMA o comportamento atual. No dia em que for consertado, é ele que fica vermelho e
    // aponta para a decisão. O outro lado — o Command REEMITE o evento ao regravar — está em
    // GravaFechamentoDoDiaTest ('DEFEITO ACEITO: regravar o dia emite o evento DE NOVO'); aqui
    // é o efeito, lá é o dispatch, porque o ouvinte é after-commit e o Pest nunca comita.
    $posto = Posto::factory()->create();
    $combustivel = Combustivel::factory()->create(['posto_id' => $posto->id]);
    $estoque = Estoque::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $combustivel->id, 'quantidade_atual' => '1000.000']);

    $evento = new LeiturasDoDiaGravadas($posto->id, '2026-09-20', [$combustivel->id => '100.000']);

    descontar($evento);
    expect($estoque->refresh()->quantidade_atual)->toBe('900.000');

    descontar($evento);  // o MESMO dia, gravado de novo
    expect($estoque->refresh()->quantidade_atual)->toBe('800.000');  // e não 900.000
});

it('só desconta do posto atual — o estoque do vizinho não se mexe', function (): void {
    $meu = Posto::factory()->create();
    $alheio = Posto::factory()->create();
    $meuComb = Combustivel::factory()->create(['posto_id' => $meu->id]);
    $combAlheio = Combustivel::factory()->create(['posto_id' => $alheio->id]);
    $meuEstoque = Estoque::factory()->create(['posto_id' => $meu->id, 'combustivel_id' => $meuComb->id, 'quantidade_atual' => '1000.000']);
    $doVizinho = Estoque::factory()->create(['posto_id' => $alheio->id, 'combustivel_id' => $combAlheio->id, 'quantidade_atual' => '1000.000']);

    // O escopo vem do PostoAtual, como numa requisição de verdade — não do id no evento.
    app(PostoAtual::class)->definir($meu->id);
    descontar(new LeiturasDoDiaGravadas($meu->id, '2026-09-20', [$meuComb->id => '400.000']));

    expect($meuEstoque->refresh()->quantidade_atual)->toBe('600.000')
        ->and($doVizinho->refresh()->quantidade_atual)->toBe('1000.000');
});

it('TEN-5 fechada: dois postos PODEM ter estoque do mesmo combustível', function (): void {
    // Até 22/09/2026 este teste AFIRMAVA o bloqueio contrário: `Estoque` tinha UNIQUE
    // (combustivel_id) SEM posto_id (`Estoque_combustivel_id_key`), e o banco recusava o
    // segundo posto. banco/init/02-multi-tenant-uniques-por-posto.sql trocou a chave para
    // (combustivel_id, posto_id) — é a regra TEN-5 de `docs/arquitetura/regras.md`, que sai de
    // ❌ VIOLADA. Combustíveis diferentes por posto no teste acima seguem sendo o cenário
    // normal; este aqui prova que o MESMO combustível, em dois postos, também funciona agora.
    $a = Posto::factory()->create();
    $b = Posto::factory()->create();
    $combustivel = Combustivel::factory()->create(['posto_id' => $a->id]);

    $doA = Estoque::factory()->create(['posto_id' => $a->id, 'combustivel_id' => $combustivel->id, 'quantidade_atual' => '1000.000']);
    $doB = Estoque::factory()->create(['posto_id' => $b->id, 'combustivel_id' => $combustivel->id, 'quantidade_atual' => '2000.000']);

    expect($doA->fresh())->not->toBeNull()
        ->and($doB->fresh())->not->toBeNull();
});

it('o ouvinte só roda DEPOIS do commit', function (): void {
    // Desconto é consequência de um dia JÁ gravado, nunca condição para gravá-lo. Se rodasse
    // dentro da transação, uma falha de estoque derrubaria o dia inteiro — e no painel ela é
    // apenas um console.warn.
    expect(app(DescontaLitrosVendidos::class))->toBeInstanceOf(ShouldHandleEventsAfterCommit::class);
});

it('o evento está ligado ao ouvinte', function (): void {
    expect(Event::hasListeners(LeiturasDoDiaGravadas::class))->toBeTrue();
});
