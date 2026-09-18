<?php

declare(strict_types=1);

use App\Cadastro\Domain\Bico;
use App\Cadastro\Domain\Bomba;
use App\Cadastro\Domain\Combustivel;
use App\Cadastro\Domain\FormaPagamento;
use App\Cadastro\Domain\Fornecedor;
use App\Cadastro\Domain\Frentista;
use App\Cadastro\Domain\Maquininha;
use App\Cadastro\Domain\Posto;
use App\Cadastro\Domain\Tanque;
use App\Cadastro\Domain\Turno;
use App\Compartilhado\Enums\PapelNoPosto;
use App\Compartilhado\PostoAtual;
use App\Pessoas\Domain\Usuario;
use App\Pessoas\Domain\UsuarioPosto;

/**
 * Percorre toda relação declarada nos models contra o esquema REAL de produção. Se um nome de
 * coluna de FK estiver errado, quebra aqui e não em produção.
 */
it('resolve todas as relações do cadastro contra o esquema real', function (): void {
    $posto = Posto::factory()->create();
    $combustivel = Combustivel::factory()->create(['posto_id' => $posto->id]);
    $tanque = Tanque::factory()->create(['posto_id' => $posto->id, 'combustivel_id' => $combustivel->id]);
    $bomba = Bomba::factory()->create(['posto_id' => $posto->id]);
    $bico = Bico::factory()->create([
        'posto_id' => $posto->id, 'bomba_id' => $bomba->id, 'combustivel_id' => $combustivel->id, 'tanque_id' => $tanque->id,
    ]);
    $turno = Turno::factory()->create(['posto_id' => $posto->id]);
    $frentista = Frentista::factory()->create(['posto_id' => $posto->id, 'turno_id' => $turno->id]);
    $forma = FormaPagamento::factory()->create(['posto_id' => $posto->id]);
    $maquininha = Maquininha::factory()->create(['posto_id' => $posto->id]);
    $fornecedor = Fornecedor::factory()->create(['posto_id' => $posto->id]);
    $usuario = Usuario::factory()->create();
    $vinculo = UsuarioPosto::factory()->create(['usuario_id' => $usuario->id, 'posto_id' => $posto->id, 'role' => PapelNoPosto::Gerente]);

    // Posto → filhos
    expect($posto->combustiveis->pluck('id')->all())->toBe([$combustivel->id])
        ->and($posto->tanques->pluck('id')->all())->toBe([$tanque->id])
        ->and($posto->bombas->pluck('id')->all())->toBe([$bomba->id])
        ->and($posto->bicos->pluck('id')->all())->toBe([$bico->id])
        ->and($posto->turnos->pluck('id')->all())->toBe([$turno->id])
        ->and($posto->frentistas->pluck('id')->all())->toBe([$frentista->id])
        ->and($posto->formasPagamento->pluck('id')->all())->toBe([$forma->id])
        ->and($posto->maquininhas->pluck('id')->all())->toBe([$maquininha->id])
        ->and($posto->fornecedores->pluck('id')->all())->toBe([$fornecedor->id])
        ->and($posto->usuarios->pluck('id')->all())->toBe([$usuario->id])
        ->and($posto->usuarios()->wherePivot('role', 'gerente')->whereKey($usuario->id)->exists())->toBeTrue();

    // filhos → posto
    foreach ([$combustivel, $tanque, $bomba, $bico, $turno, $frentista, $forma, $maquininha, $fornecedor] as $filho) {
        expect($filho->posto->is($posto))->toBeTrue($filho::class.' não chegou ao posto');
    }

    // cadeia combustível → tanque → bico → bomba
    expect($combustivel->tanques->pluck('id')->all())->toBe([$tanque->id])
        ->and($combustivel->bicos->pluck('id')->all())->toBe([$bico->id])
        ->and($tanque->combustivel->is($combustivel))->toBeTrue()
        ->and($tanque->bicos->pluck('id')->all())->toBe([$bico->id])
        ->and($bomba->bicos->pluck('id')->all())->toBe([$bico->id])
        ->and($bico->bomba->is($bomba))->toBeTrue()
        ->and($bico->combustivel->is($combustivel))->toBeTrue()
        ->and($bico->tanque?->is($tanque))->toBeTrue();

    // turno ↔ frentista
    expect($turno->frentistas->pluck('id')->all())->toBe([$frentista->id])
        ->and($frentista->turno?->is($turno))->toBeTrue();

    // usuário ↔ posto
    expect($usuario->postos->pluck('id')->all())->toBe([$posto->id])
        ->and($usuario->vinculos->pluck('id')->all())->toBe([$vinculo->id])
        ->and($vinculo->usuario->is($usuario))->toBeTrue()
        ->and($vinculo->posto->is($posto))->toBeTrue()
        ->and($vinculo->role)->toBe(PapelNoPosto::Gerente);
});

it('casts: dinheiro vira string decimal, booleanos viram bool, enum vira enum', function (): void {
    $posto = Posto::factory()->create();
    $combustivel = Combustivel::factory()->create(['posto_id' => $posto->id, 'preco_venda' => 6.38, 'preco_custo' => 5.1234, 'ativo' => true]);
    $usuario = Usuario::factory()->create();

    $lido = Combustivel::query()->findOrFail($combustivel->id);

    expect($lido->preco_venda)->toBe('6.38')
        ->and($lido->preco_custo)->toBe('5.1234')
        ->and($lido->ativo)->toBeTrue()
        ->and(Usuario::query()->findOrFail($usuario->id)->role)->toBe($usuario->role);
});

it('PostoAtual: definir, consultar, limpar', function (): void {
    $atual = app(PostoAtual::class);

    expect($atual->definido())->toBeFalse()->and($atual->id())->toBeNull();

    $atual->definir(7);
    expect($atual->definido())->toBeTrue()->and($atual->id())->toBe(7);

    $atual->limpar();
    expect($atual->definido())->toBeFalse();
});
