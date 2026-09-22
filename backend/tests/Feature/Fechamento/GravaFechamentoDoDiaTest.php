<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\FormaPagamento;
use App\Cadastro\Domain\Frentista;
use App\Compartilhado\Enums\StatusFechamento;
use App\Compartilhado\Eventos\LeiturasDoDiaGravadas;
use App\Compartilhado\Posto;
use App\Compartilhado\PostoAtual;
use App\Fechamento\Application\DiaDeclarado;
use App\Fechamento\Application\GravaFechamentoDoDia;
use App\Fechamento\Domain\Fechamento;
use App\Fechamento\Domain\FechamentoFrentista;
use App\Fechamento\Domain\Leitura;
use App\Fechamento\Domain\Recebimento;
use App\Fechamento\Domain\RecusaDaGravacao;
use App\Pessoas\Domain\Usuario;
use Carbon\CarbonImmutable;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;

/*
|--------------------------------------------------------------------------
| GravaFechamentoDoDia — a escrita do dia pela API (#103 P10)
|--------------------------------------------------------------------------
| Estado inicial por factory, nunca pela carga de janeiro: o compose tem 186 Leitura e ZERO
| Fechamento, e o caso difícil (regravar o dia) precisa de dado montado aqui.
|
| O dia é 2026-01-05: dentro da janela (`>= 2025-12-31`, medido TRUE no compose) e fora do
| "hoje", então o teste não depende do relógio.
*/

const DIA_P10 = '2026-01-05';

/** Turno 1 é o tampão do UNIQUE (data, turno_id) (I7) e é FK: precisa existir no banco de teste. */
function garanteTurnoTampaoP10(int $postoId): void
{
    if (DB::table('Turno')->where('id', 1)->doesntExist()) {
        DB::table('Turno')->insert([
            'id' => 1, 'nome' => 'Manhã', 'horario_inicio' => '06:00:00', 'horario_fim' => '14:00:00',
            'ativo' => true, 'posto_id' => $postoId,
        ]);
    }
}

/**
 * Um posto com 3 bicos (2 de gasolina, 1 de diesel), 3 frentistas e uma forma de pagamento.
 * Define o PostoAtual ANTES das factories: o PertenceAoPosto preenche `posto_id` em todas.
 *
 * @return array{
 *     posto: Posto, usuario: Usuario, gasolina: Combustivel, diesel: Combustivel,
 *     bicoGas1: Bico, bicoGas2: Bico, bicoDiesel: Bico,
 *     frentistaA: Frentista, frentistaB: Frentista, frentistaC: Frentista, forma: FormaPagamento
 * }
 */
function cenarioP10(): array
{
    $posto = Posto::factory()->create();
    app(PostoAtual::class)->definir($posto->id);
    garanteTurnoTampaoP10($posto->id);

    $gasolina = Combustivel::factory()->create();
    $diesel = Combustivel::factory()->create();
    $bomba = Bomba::factory()->create();

    return [
        'posto' => $posto,
        'usuario' => Usuario::factory()->create(),
        'gasolina' => $gasolina,
        'diesel' => $diesel,
        'bicoGas1' => Bico::factory()->create(['bomba_id' => $bomba->id, 'combustivel_id' => $gasolina->id]),
        'bicoGas2' => Bico::factory()->create(['bomba_id' => $bomba->id, 'combustivel_id' => $gasolina->id]),
        'bicoDiesel' => Bico::factory()->create(['bomba_id' => $bomba->id, 'combustivel_id' => $diesel->id]),
        'frentistaA' => Frentista::factory()->create(),
        'frentistaB' => Frentista::factory()->create(),
        'frentistaC' => Frentista::factory()->create(),
        'forma' => FormaPagamento::factory()->create(),
    ];
}

/**
 * @param  numeric-string  $litros
 * @param  numeric-string  $valor
 * @return array{bico_id: int, combustivel_id: int, leitura_inicial: numeric-string, leitura_final: numeric-string, litros_vendidos: numeric-string, preco_litro: numeric-string, valor_total: numeric-string}
 */
function leituraP10(Bico $bico, Combustivel $combustivel, string $litros = '100.000', string $valor = '600.00'): array
{
    return [
        'bico_id' => $bico->id,
        'combustivel_id' => $combustivel->id,
        'leitura_inicial' => '1000.000',
        'leitura_final' => bcadd('1000.000', $litros, 3),
        'litros_vendidos' => $litros,
        'preco_litro' => '6.00',
        'valor_total' => $valor,
    ];
}

/**
 * Sessão só com dinheiro: `valor_conferido` = `valor_dinheiro`, sem encerrante (I4: diferença 0).
 *
 * @param  numeric-string  $dinheiro
 * @return array{frentista_id: int, valor_cartao: numeric-string, valor_cartao_debito: numeric-string, valor_cartao_credito: numeric-string, valor_dinheiro: numeric-string, valor_moedas: numeric-string, valor_pix: numeric-string, valor_nota: numeric-string, baratao: numeric-string, encerrante: numeric-string, valor_conferido: numeric-string, diferenca_calculada: numeric-string, observacoes: string}
 */
function sessaoP10(Frentista $frentista, string $dinheiro = '500.00'): array
{
    return [
        'frentista_id' => $frentista->id,
        'valor_cartao' => '0.00',
        'valor_cartao_debito' => '0.00',
        'valor_cartao_credito' => '0.00',
        'valor_dinheiro' => $dinheiro,
        'valor_moedas' => '0.00',
        'valor_pix' => '0.00',
        'valor_nota' => '0.00',
        'baratao' => '0.00',
        'encerrante' => '0.00',
        'valor_conferido' => $dinheiro,
        'diferenca_calculada' => '0.00',
        'observacoes' => '',
    ];
}

/**
 * @param  numeric-string  $valor
 * @return array{forma_pagamento_id: int, valor: numeric-string}
 */
function recebimentoP10(int $formaId, string $valor = '1000.00'): array
{
    return ['forma_pagamento_id' => $formaId, 'valor' => $valor];
}

/**
 * @param  list<array{bico_id: int, combustivel_id: int, leitura_inicial: numeric-string, leitura_final: numeric-string, litros_vendidos: numeric-string, preco_litro: numeric-string, valor_total: numeric-string}>  $leituras
 * @param  list<array{frentista_id: int, valor_cartao: numeric-string, valor_cartao_debito: numeric-string, valor_cartao_credito: numeric-string, valor_dinheiro: numeric-string, valor_moedas: numeric-string, valor_pix: numeric-string, valor_nota: numeric-string, baratao: numeric-string, encerrante: numeric-string, valor_conferido: numeric-string, diferenca_calculada: numeric-string, observacoes: string}>  $sessoes
 * @param  list<int>  $conhecidos
 * @param  list<array{forma_pagamento_id: int, valor: numeric-string}>  $recebimentos
 */
function diaP10(
    array $leituras = [],
    array $sessoes = [],
    array $conhecidos = [],
    array $recebimentos = [],
    ?string $totalVendas = null,
    string $totalRecebido = '0.00',
    ?string $diferenca = null,
    string $dia = DIA_P10,
    ?string $observacoes = null,
): DiaDeclarado {
    return new DiaDeclarado(
        new CarbonImmutable($dia.' 00:00:00', 'UTC'),
        $leituras, $sessoes, $conhecidos, $recebimentos,
        $totalVendas, $totalRecebido, $diferenca, $observacoes,
    );
}

function gravaP10(DiaDeclarado $dia, int $usuarioId): Fechamento|RecusaDaGravacao
{
    return app(GravaFechamentoDoDia::class)($dia, $usuarioId);
}

/** O instante gravado, lido em UTC direto do banco — fora do cast, que é o que se está provando. */
function instanteUtcP10(string $tabela, int $id): string
{
    $valor = DB::table($tabela)->where('id', $id)
        ->selectRaw("to_char(data at time zone 'UTC', 'YYYY-MM-DD HH24:MI:SS') as instante")
        ->value('instante');

    return is_string($valor) ? $valor : '';
}

it('dia novo: grava o pai (turno 1, FECHADO, usuário autenticado, 00:00Z) e os três filhos', function (): void {
    $c = cenarioP10();

    $resultado = gravaP10(diaP10(
        leituras: [leituraP10($c['bicoGas1'], $c['gasolina']), leituraP10($c['bicoDiesel'], $c['diesel'], '50.000', '300.00')],
        sessoes: [sessaoP10($c['frentistaA'], '600.00'), sessaoP10($c['frentistaB'], '400.00')],
        recebimentos: [recebimentoP10($c['forma']->id)],
        totalVendas: '900.00', totalRecebido: '1000.00', diferenca: '-100.00', observacoes: 'dia de teste',
    ), $c['usuario']->id);

    expect($resultado)->toBeInstanceOf(Fechamento::class);
    assert($resultado instanceof Fechamento);
    expect($resultado->turno_id)->toBe(1)
        ->and($resultado->status)->toBe(StatusFechamento::Fechado)
        ->and($resultado->usuario_id)->toBe($c['usuario']->id)
        ->and($resultado->posto_id)->toBe($c['posto']->id)
        ->and($resultado->total_vendas)->toBe('900.00')
        ->and($resultado->total_recebido)->toBe('1000.00')
        ->and($resultado->diferenca)->toBe('-100.00')
        ->and($resultado->observacoes)->toBe('dia de teste')
        ->and(instanteUtcP10('Fechamento', $resultado->id))->toBe('2026-01-05 00:00:00');

    expect(Fechamento::query()->count())->toBe(1)
        ->and(Leitura::query()->count())->toBe(2)
        ->and(FechamentoFrentista::query()->where('fechamento_id', $resultado->id)->count())->toBe(2)
        ->and(Recebimento::query()->where('fechamento_id', $resultado->id)->count())->toBe(1);

    $leitura = Leitura::query()->where('bico_id', $c['bicoGas1']->id)->sole();
    expect(instanteUtcP10('Leitura', $leitura->id))->toBe('2026-01-05 00:00:00')
        ->and($leitura->usuario_id)->toBe($c['usuario']->id)
        ->and($leitura->turno_id)->toBeNull()
        ->and($leitura->posto_id)->toBe($c['posto']->id)
        ->and($leitura->litros_vendidos)->toBe('100.000')
        ->and($leitura->valor_total)->toBe('600.00');

    $sessao = FechamentoFrentista::query()->where('frentista_id', $c['frentistaA']->id)->sole();
    expect($sessao->valor_dinheiro)->toBe('600.00')
        ->and($sessao->valor_conferido)->toBe('600.00')
        ->and($sessao->posto_id)->toBe($c['posto']->id)
        ->and($sessao->data_hora_envio)->not->toBeNull();

    $recebimento = Recebimento::query()->where('fechamento_id', $resultado->id)->sole();
    expect($recebimento->valor)->toBe('1000.00')
        ->and($recebimento->forma_pagamento_id)->toBe($c['forma']->id)
        ->and($recebimento->observacoes)->toBe('Fechamento Geral');
});

it('REGRAVAR: sessão existente mantém id e data_hora_envio; envio tardio sobrevive; conhecida e não enviada é apagada', function (): void {
    $c = cenarioP10();

    $pai = gravaP10(diaP10(
        sessoes: [sessaoP10($c['frentistaA'], '100.00'), sessaoP10($c['frentistaB'], '200.00')],
        totalRecebido: '300.00',
    ), $c['usuario']->id);
    assert($pai instanceof Fechamento);

    $sessaoA = FechamentoFrentista::query()->where('fechamento_id', $pai->id)->where('frentista_id', $c['frentistaA']->id)->sole();
    DB::table('FechamentoFrentista')->where('id', $sessaoA->id)->update(['data_hora_envio' => '2026-01-05 10:15:00+00']);

    // C envia pelo PWA DEPOIS de a tela carregar: a tela conhece só A e B.
    $tardia = FechamentoFrentista::factory()->create([
        'fechamento_id' => $pai->id, 'frentista_id' => $c['frentistaC']->id, 'valor_dinheiro' => '77.00',
    ]);

    // O gerente corrige A, remove B e salva.
    $regravado = gravaP10(diaP10(
        sessoes: [sessaoP10($c['frentistaA'], '150.00')],
        conhecidos: [$c['frentistaA']->id, $c['frentistaB']->id],
        totalRecebido: '150.00',
    ), $c['usuario']->id);
    assert($regravado instanceof Fechamento);

    expect($regravado->id)->toBe($pai->id)
        ->and(Fechamento::query()->count())->toBe(1);

    $sessoes = FechamentoFrentista::query()->where('fechamento_id', $pai->id)->get()->keyBy('frentista_id');
    expect($sessoes)->toHaveCount(2)
        ->and($sessoes->has($c['frentistaB']->id))->toBeFalse()   // removida de propósito
        ->and($sessoes->has($c['frentistaC']->id))->toBeTrue();   // o envio tardio SOBREVIVE

    $aDepois = $sessoes->get($c['frentistaA']->id);
    expect($aDepois)->not->toBeNull();
    assert($aDepois instanceof FechamentoFrentista);
    expect($aDepois->id)->toBe($sessaoA->id)                        // UPSERT, não reINSERT
        ->and($aDepois->valor_dinheiro)->toBe('150.00')
        ->and($aDepois->data_hora_envio?->toIso8601ZuluString())->toBe('2026-01-05T10:15:00Z');

    $cDepois = $sessoes->get($c['frentistaC']->id);
    assert($cDepois instanceof FechamentoFrentista);
    expect($cDepois->id)->toBe($tardia->id)
        ->and($cDepois->valor_dinheiro)->toBe('77.00');
});

it('REGRAVAR: leitura de bico não declarado permanece — a leitura-base sobrevive ao Salvar', function (): void {
    $c = cenarioP10();

    gravaP10(diaP10(leituras: [
        leituraP10($c['bicoGas1'], $c['gasolina']),
        leituraP10($c['bicoGas2'], $c['gasolina']),
        leituraP10($c['bicoDiesel'], $c['diesel']),
    ]), $c['usuario']->id);
    $idGas1 = Leitura::query()->where('bico_id', $c['bicoGas1']->id)->sole()->id;

    // Só o bico 1 tem fechamento preenchido na tela; os outros dois NÃO são declarados.
    gravaP10(diaP10(leituras: [leituraP10($c['bicoGas1'], $c['gasolina'], '120.000', '720.00')]), $c['usuario']->id);

    expect(Leitura::query()->count())->toBe(3);

    $gas1 = Leitura::query()->where('bico_id', $c['bicoGas1']->id)->sole();
    expect($gas1->id)->toBe($idGas1)
        ->and($gas1->litros_vendidos)->toBe('120.000')
        ->and($gas1->valor_total)->toBe('720.00');

    expect(Leitura::query()->where('bico_id', $c['bicoGas2']->id)->sole()->litros_vendidos)->toBe('100.000')
        ->and(Leitura::query()->where('bico_id', $c['bicoDiesel']->id)->sole()->litros_vendidos)->toBe('100.000');
});

it('dia não apurado: total_vendas e diferenca ficam null, nunca 0.00 (I8)', function (): void {
    $c = cenarioP10();

    $resultado = gravaP10(diaP10(sessoes: [sessaoP10($c['frentistaA'], '300.00')], totalRecebido: '300.00'), $c['usuario']->id);
    assert($resultado instanceof Fechamento);

    expect($resultado->total_vendas)->toBeNull()
        ->and($resultado->diferenca)->toBeNull()
        ->and($resultado->total_recebido)->toBe('300.00')
        ->and($resultado->status)->toBe(StatusFechamento::Fechado);
});

it('rollback: FK inválida no recebimento desfaz o dia inteiro — nada fica pela metade', function (): void {
    $c = cenarioP10();

    $antes = [Fechamento::query()->count(), Leitura::query()->count(), FechamentoFrentista::query()->count()];

    $dia = diaP10(
        leituras: [leituraP10($c['bicoGas1'], $c['gasolina'])],
        sessoes: [sessaoP10($c['frentistaA'])],
        recebimentos: [recebimentoP10(999999999, '10.00')],   // FormaPagamento inexistente
        totalRecebido: '500.00',
    );

    expect(fn () => gravaP10($dia, $c['usuario']->id))->toThrow(QueryException::class);

    expect([Fechamento::query()->count(), Leitura::query()->count(), FechamentoFrentista::query()->count()])->toBe($antes);
});

it('fora da janela: recusa como valor e nada é gravado', function (): void {
    $c = cenarioP10();

    $resultado = gravaP10(diaP10(leituras: [leituraP10($c['bicoGas1'], $c['gasolina'])], dia: '2025-12-30'), $c['usuario']->id);

    expect($resultado)->toBeInstanceOf(RecusaDaGravacao::class);
    assert($resultado instanceof RecusaDaGravacao);
    expect($resultado->codigo)->toBe('fora_da_janela')
        ->and(Fechamento::query()->count())->toBe(0)
        ->and(Leitura::query()->count())->toBe(0);
});

it('totais inconsistentes: recusa como valor e nada é gravado', function (): void {
    $c = cenarioP10();

    $resultado = gravaP10(diaP10(
        sessoes: [sessaoP10($c['frentistaA'])],
        totalVendas: '1000.00', totalRecebido: '500.00', diferenca: '500.01',
    ), $c['usuario']->id);

    expect($resultado)->toBeInstanceOf(RecusaDaGravacao::class);
    assert($resultado instanceof RecusaDaGravacao);
    expect($resultado->codigo)->toBe('totais_inconsistentes')
        ->and(Fechamento::query()->count())->toBe(0)
        ->and(FechamentoFrentista::query()->count())->toBe(0);
});

it('auditoria: regravar deixa UPDATE e DELETE em AuditoriaDados (triggers audita_*)', function (): void {
    $c = cenarioP10();
    $ultimo = DB::table('AuditoriaDados')->max('id');
    $marco = is_int($ultimo) ? $ultimo : 0;

    gravaP10(diaP10(
        leituras: [leituraP10($c['bicoGas1'], $c['gasolina'])],
        sessoes: [sessaoP10($c['frentistaA']), sessaoP10($c['frentistaB'])],
        totalRecebido: '1000.00',
    ), $c['usuario']->id);

    gravaP10(diaP10(
        leituras: [leituraP10($c['bicoGas1'], $c['gasolina'], '110.000', '660.00')],
        sessoes: [sessaoP10($c['frentistaA'], '600.00')],
        conhecidos: [$c['frentistaA']->id, $c['frentistaB']->id],
        totalRecebido: '600.00',
    ), $c['usuario']->id);

    $pares = DB::table('AuditoriaDados')->where('id', '>', $marco)
        ->selectRaw("tabela || ':' || operacao as par")
        ->pluck('par')->all();

    expect($pares)->toContain('Fechamento:UPDATE')
        ->toContain('Leitura:UPDATE')
        ->toContain('FechamentoFrentista:UPDATE')
        ->toContain('FechamentoFrentista:DELETE');
});

it('apagar sessão declarada leva a Notificacao junto e desvincula NotaFrentista — as FKs são RESTRICT', function (): void {
    // Reproduz fechamentoFrentista.service.ts:195-240 só para as linhas apagadas. Sem isto o
    // DELETE quebra na FK de Notificacao (01-esquema-base.sql:708) e o dia inteiro faz rollback.
    $c = cenarioP10();

    $pai = gravaP10(diaP10(sessoes: [sessaoP10($c['frentistaA']), sessaoP10($c['frentistaB'])], totalRecebido: '1000.00'), $c['usuario']->id);
    assert($pai instanceof Fechamento);
    $sessaoB = FechamentoFrentista::query()->where('frentista_id', $c['frentistaB']->id)->sole();

    DB::table('Notificacao')->insert([
        'frentista_id' => $c['frentistaB']->id, 'fechamento_frentista_id' => $sessaoB->id,
        'titulo' => 'Falta', 'mensagem' => 'teste', 'posto_id' => $c['posto']->id,
    ]);
    $notaId = DB::table('NotaFrentista')->insertGetId([
        'frentista_id' => $c['frentistaB']->id, 'fechamento_frentista_id' => $sessaoB->id,
        'valor' => '50.00', 'posto_id' => $c['posto']->id,
    ]);

    gravaP10(diaP10(sessoes: [sessaoP10($c['frentistaA'])], conhecidos: [$c['frentistaA']->id, $c['frentistaB']->id], totalRecebido: '500.00'), $c['usuario']->id);

    expect(FechamentoFrentista::query()->whereKey($sessaoB->id)->exists())->toBeFalse()
        ->and(DB::table('Notificacao')->where('fechamento_frentista_id', $sessaoB->id)->exists())->toBeFalse()
        ->and(DB::table('NotaFrentista')->where('id', $notaId)->exists())->toBeTrue()
        ->and(DB::table('NotaFrentista')->where('id', $notaId)->value('fechamento_frentista_id'))->toBeNull();
});

/*
|--------------------------------------------------------------------------
| O evento de Estoque (§7 (b), por evento — passo 3)
|--------------------------------------------------------------------------
| ARMADILHA: DescontaLitrosVendidos é ShouldHandleEventsAfterCommit e o Pest roda em
| DatabaseTransactions, que nunca comita. Um teste que afirmasse "o Estoque foi descontado"
| passando pelo Command mediria NADA — o ouvinte não dispara. Por isso aqui se prova o
| DISPATCH (Event::fake), e o EFEITO continua provado em DescontaLitrosVendidosTest, que chama
| handle() direto.
*/

it('emite LeiturasDoDiaGravadas com posto, dia e litros somados por combustível (bcadd escala 3)', function (): void {
    Event::fake([LeiturasDoDiaGravadas::class]);
    $c = cenarioP10();

    gravaP10(diaP10(leituras: [
        leituraP10($c['bicoGas1'], $c['gasolina'], '100.500', '603.00'),
        leituraP10($c['bicoGas2'], $c['gasolina'], '50.250', '301.50'),   // mesmo combustível: soma
        leituraP10($c['bicoDiesel'], $c['diesel'], '30.000', '180.00'),
    ]), $c['usuario']->id);

    Event::assertDispatched(
        LeiturasDoDiaGravadas::class,
        fn (LeiturasDoDiaGravadas $evento): bool => $evento->postoId === $c['posto']->id
            && $evento->dia === DIA_P10
            && $evento->litrosPorCombustivel === [
                $c['gasolina']->id => '150.750',
                $c['diesel']->id => '30.000',
            ],
    );
});

it('DEFEITO ACEITO: regravar o dia emite o evento DE NOVO — o estoque desconta duas vezes', function (): void {
    // Decisão do dono em 20/09/2026 (§7 (b)) e reafirmada em 21/09 ao aprovar a P10: mantém o
    // comportamento do painel. O efeito (800 e não 900) está em DescontaLitrosVendidosTest.php:50.
    // Este teste AFIRMA que o Command reproduz o defeito; no dia em que for consertado, é ele
    // que fica vermelho e aponta para a decisão.
    Event::fake([LeiturasDoDiaGravadas::class]);
    $c = cenarioP10();
    $dia = diaP10(leituras: [leituraP10($c['bicoGas1'], $c['gasolina'])]);

    gravaP10($dia, $c['usuario']->id);
    gravaP10($dia, $c['usuario']->id);   // o MESMO dia, gravado de novo

    Event::assertDispatchedTimes(LeiturasDoDiaGravadas::class, 2);
});

it('gravação recusada (janela ou totais) não emite evento nenhum', function (): void {
    Event::fake([LeiturasDoDiaGravadas::class]);
    $c = cenarioP10();
    $leituras = [leituraP10($c['bicoGas1'], $c['gasolina'])];

    gravaP10(diaP10(leituras: $leituras, dia: '2025-12-30'), $c['usuario']->id);
    gravaP10(diaP10(leituras: $leituras, totalVendas: '10.00', totalRecebido: '0.00', diferenca: '9.99'), $c['usuario']->id);

    Event::assertNotDispatched(LeiturasDoDiaGravadas::class);
});

it('dia sem leitura declarada não emite evento: não há litros a descontar', function (): void {
    Event::fake([LeiturasDoDiaGravadas::class]);
    $c = cenarioP10();

    gravaP10(diaP10(sessoes: [sessaoP10($c['frentistaA'])], totalRecebido: '500.00'), $c['usuario']->id);

    Event::assertNotDispatched(LeiturasDoDiaGravadas::class);
});

/*
|--------------------------------------------------------------------------
| Multi-tenant — afirmar, não consertar (passo 4)
|--------------------------------------------------------------------------
| A escrita COLIDE com `Fechamento_data_turno_idx` (data, turno_id) (01-esquema-base.sql:757),
| porque o Command grava turno_id = 1 (I7). Consertar é DDL contra produção e espera o "vai" do
| dono (memória multi-tenant-impossivel-sem-migration). Aqui o defeito deixa de ser folclore.
*/

it('🔴 DÍVIDA DE ESQUEMA: dois postos não fecham o mesmo dia — UNIQUE (data, turno_id) sem posto_id', function (): void {
    // Este teste AFIRMA a limitação. No dia em que a migration incluir posto_id no unique, é ele
    // que fica vermelho e aponta para a decisão — mesmo padrão de DescontaLitrosVendidosTest:86.
    $a = cenarioP10();
    $paiA = gravaP10(diaP10(sessoes: [sessaoP10($a['frentistaA'], '100.00')], totalRecebido: '100.00'), $a['usuario']->id);
    assert($paiA instanceof Fechamento);

    $b = cenarioP10();   // redefine o PostoAtual para o posto B

    // O escopo funciona: B NÃO enxerga o Fechamento de A (senão faria UPDATE nele em vez de
    // tentar INSERT) — e é exatamente por isso que esbarra no unique sem posto_id.
    expect(fn () => gravaP10(diaP10(sessoes: [sessaoP10($b['frentistaA'], '999.00')], totalRecebido: '999.00'), $b['usuario']->id))
        ->toThrow(QueryException::class, 'Fechamento_data_turno_idx');

    // E B não tocou em nada de A: a transação de B desfez o que tentou, e A continua como estava.
    expect(Fechamento::query()->count())->toBe(0);   // visto de B
    app(PostoAtual::class)->definir($a['posto']->id);
    $deA = Fechamento::query()->sole();
    expect($deA->id)->toBe($paiA->id)
        ->and($deA->total_recebido)->toBe('100.00')
        ->and(FechamentoFrentista::query()->where('fechamento_id', $paiA->id)->count())->toBe(1);
});

it('os uniques que sustentam os dois UPSERTs existem e NÃO colidem entre postos', function (): void {
    // `fechamento_frentista_unico_por_dia` está APLICADO (a memória varredura-19-08, que dizia
    // "escrito e não aplicado", está vencida): é ele que sustenta o UPSERT das sessões. O de
    // Leitura é por (bico_id, data), e bico é por posto — dois postos gravam o mesmo dia sem colidir.
    /** @var list<mixed> $definicoes */
    $definicoes = DB::table('pg_indexes')
        ->whereIn('indexname', ['Fechamento_data_turno_idx', 'fechamento_frentista_unico_por_dia', 'leitura_unica_bico_data'])
        ->orderBy('indexname')
        ->pluck('indexdef')->all();
    $texto = implode("\n", array_map(static fn (mixed $d): string => is_string($d) ? $d : '', $definicoes));

    expect($definicoes)->toHaveCount(3)
        ->and($texto)->toContain('UNIQUE INDEX "Fechamento_data_turno_idx"')->toContain('(data, turno_id)')
        ->toContain('UNIQUE INDEX fechamento_frentista_unico_por_dia')->toContain('(fechamento_id, frentista_id)')
        ->toContain('UNIQUE INDEX leitura_unica_bico_data')->toContain('(bico_id, data)');

    // Leitura: A grava o dia pelo Command; B insere o mesmo instante no SEU bico, sem colisão.
    $a = cenarioP10();
    gravaP10(diaP10(leituras: [leituraP10($a['bicoGas1'], $a['gasolina'])]), $a['usuario']->id);

    $b = cenarioP10();
    $deB = Leitura::factory()->create(['bico_id' => $b['bicoGas1']->id, 'combustivel_id' => $b['gasolina']->id, 'usuario_id' => $b['usuario']->id]);
    DB::table('Leitura')->where('id', $deB->id)->update(['data' => DIA_P10.' 00:00:00+00']);

    expect(Leitura::query()->count())->toBe(1);   // visto de B: só a dele
    app(PostoAtual::class)->definir($a['posto']->id);
    expect(Leitura::query()->count())->toBe(1)    // visto de A: só a dela, intacta
        ->and(Leitura::query()->sole()->bico_id)->toBe($a['bicoGas1']->id);
});
