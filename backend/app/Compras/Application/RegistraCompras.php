<?php

declare(strict_types=1);

namespace App\Compras\Application;

use App\Compartilhado\PostoAtual;
use App\Compras\Domain\Compra;
use App\Compras\Domain\RecusaDaCompra;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

/**
 * O "Salvar" do Registro de Compras pela API (#103) — o porte de `usePersistenciaRegistro.salvarDados`,
 * agora numa transação só (tudo ou nada):
 *
 * 1. repetição pela chave ({@see RepeticaoDaCompra});
 * 2. as travas de posto, janela e coluna ({@see ConfereRegistro});
 * 3. por combustível, na ordem do painel: a compra e as somas no estoque ({@see LancaCompra}) e a
 *    régua do dia ({@see GravaReguaDoPainel}).
 *
 * Dois salvar iguais chegando juntos: o segundo bate no unique `(chave_compra, combustivel_id)` e é
 * respondido como repetição, não como 500 — e não soma os litros duas vezes.
 */
final readonly class RegistraCompras
{
    public function __construct(
        private PostoAtual $postoAtual,
        private RepeticaoDaCompra $repeticao,
        private ConfereRegistro $confere,
        private LancaCompra $lancaCompra,
        private GravaReguaDoPainel $gravaRegua,
    ) {}

    public function __invoke(RegistroDeclarado $registro): RegistroGravado|RecusaDaCompra
    {
        $posto = $this->postoAtual->id() ?? throw new RuntimeException('RegistraCompras exige PostoAtual definido.');

        $jaGravado = $this->repeticao->pelaChave($registro, $posto);
        if ($jaGravado !== null) {
            return $jaGravado;
        }

        $recusa = ($this->confere)($registro);
        if ($recusa !== null) {
            return $recusa;
        }

        try {
            return DB::transaction(fn (): RegistroGravado => $this->grava($registro));
        } catch (UniqueConstraintViolationException $corrida) {
            return $this->repeticao->pelaChave($registro, $posto) ?? throw $corrida;
        }
    }

    private function grava(RegistroDeclarado $registro): RegistroGravado
    {
        foreach ($registro->itens as $item) {
            ($this->lancaCompra)($registro, $item);
            ($this->gravaRegua)($registro, $item);
        }

        $compras = Compra::query()->where('chave_compra', $registro->chave)->orderBy('id')->get();

        return new RegistroGravado($compras, GravaReguaDoPainel::doDia($registro), false);
    }
}
