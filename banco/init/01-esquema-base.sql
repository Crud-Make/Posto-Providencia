-- Esquema `public` do Posto Providência, extraído do catálogo do projeto kilndogpsffkgkealkaq
-- em 2026-09-17 (PostgreSQL 17.6 on aarch64-unknown-linux-gnu). GERADO por scripts/extrai-esquema-do-catalogo.py;
-- não edite à mão — mudança de esquema é migration, e depois se regenera este arquivo.
-- Pré-requisito: banco/init/00-papeis-e-stubs.sql (papéis anon/authenticated/service_role e schema auth).

SET client_min_messages = warning;
SET search_path = public, pg_catalog;

-- ---------- enums ----------
CREATE TYPE public."Role" AS ENUM ('ADMIN', 'GERENTE', 'OPERADOR', 'FRENTISTA');
CREATE TYPE public."StatusFechamento" AS ENUM ('RASCUNHO', 'FECHADO', 'ABERTO');
CREATE TYPE public."TipoTransacaoBaratencia" AS ENUM ('DEPOSITO', 'CONVERSAO', 'RESGATE', 'ESTORNO');
CREATE TYPE public."installment_status" AS ENUM ('pendente', 'pago', 'atrasado');
CREATE TYPE public."periodicity_type" AS ENUM ('mensal', 'quinzenal', 'semanal', 'diario');

-- ---------- sequences (as que não são identity) ----------
CREATE SEQUENCE public."AuditoriaDados_id_seq";
CREATE SEQUENCE public."Bico_id_seq";
CREATE SEQUENCE public."Bomba_id_seq";
CREATE SEQUENCE public."CarteiraBaratencia_id_seq";
CREATE SEQUENCE public."CategoriaFinanceira_id_seq";
CREATE SEQUENCE public."ClienteBaratencia_id_seq";
CREATE SEQUENCE public."Cliente_id_seq";
CREATE SEQUENCE public."Combustivel_id_seq";
CREATE SEQUENCE public."Compra_id_seq";
CREATE SEQUENCE public."Configuracao_id_seq";
CREATE SEQUENCE public."Despesa_id_seq";
CREATE SEQUENCE public."Emprestimo_id_seq";
CREATE SEQUENCE public."Estoque_id_seq";
CREATE SEQUENCE public."FechamentoFrentista_id_seq";
CREATE SEQUENCE public."Fechamento_id_seq";
CREATE SEQUENCE public."FormaPagamento_id_seq";
CREATE SEQUENCE public."Fornecedor_id_seq";
CREATE SEQUENCE public."Frentista_id_seq";
CREATE SEQUENCE public."Leitura_id_seq";
CREATE SEQUENCE public."Maquininha_id_seq";
CREATE SEQUENCE public."MovimentacaoEstoque_id_seq";
CREATE SEQUENCE public."NotaFrentista_id_seq";
CREATE SEQUENCE public."Notificacao_id_seq";
CREATE SEQUENCE public."Parcela_id_seq";
CREATE SEQUENCE public."Posto_id_seq";
CREATE SEQUENCE public."Produto_id_seq";
CREATE SEQUENCE public."PromocaoBaratencia_id_seq";
CREATE SEQUENCE public."PushToken_id_seq";
CREATE SEQUENCE public."Recebimento_id_seq";
CREATE SEQUENCE public."Receita_id_seq";
CREATE SEQUENCE public."TokenAbastecimento_id_seq";
CREATE SEQUENCE public."TransacaoBaratencia_id_seq";
CREATE SEQUENCE public."Turno_id_seq";
CREATE SEQUENCE public."UsuarioPosto_id_seq";
CREATE SEQUENCE public."Usuario_id_seq";

-- ---------- tabelas ----------
CREATE TABLE public."AuditoriaDados" (
    "id" bigint DEFAULT nextval('"AuditoriaDados_id_seq"'::regclass) NOT NULL,
    "tabela" text NOT NULL,
    "operacao" text NOT NULL,
    "registro_id" text,
    "dados_antes" jsonb,
    "dados_depois" jsonb,
    "em" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."Bico" (
    "id" integer DEFAULT nextval('"Bico_id_seq"'::regclass) NOT NULL,
    "numero" integer NOT NULL,
    "bomba_id" integer NOT NULL,
    "combustivel_id" integer NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "posto_id" integer DEFAULT 1,
    "tanque_id" bigint
);
CREATE TABLE public."Bomba" (
    "id" integer DEFAULT nextval('"Bomba_id_seq"'::regclass) NOT NULL,
    "nome" text NOT NULL,
    "localizacao" text,
    "ativo" boolean DEFAULT true NOT NULL,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."CarteiraBaratencia" (
    "id" integer DEFAULT nextval('"CarteiraBaratencia_id_seq"'::regclass) NOT NULL,
    "cliente_id" integer,
    "saldo_brl" numeric(15,2) DEFAULT 0,
    "saldo_litros_gc" numeric(15,3) DEFAULT 0,
    "saldo_litros_ga" numeric(15,3) DEFAULT 0,
    "saldo_litros_et" numeric(15,3) DEFAULT 0,
    "saldo_litros_s10" numeric(15,3) DEFAULT 0,
    "saldo_litros_diesel" numeric(15,3) DEFAULT 0,
    "ultima_atualizacao" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."CategoriaFinanceira" (
    "id" integer DEFAULT nextval('"CategoriaFinanceira_id_seq"'::regclass) NOT NULL,
    "nome" text NOT NULL,
    "tipo" text NOT NULL,
    "icone" text,
    "cor" text,
    "posto_id" integer,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."Cliente" (
    "id" integer DEFAULT nextval('"Cliente_id_seq"'::regclass) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "documento" character varying(20),
    "telefone" character varying(20),
    "email" character varying(255),
    "endereco" text,
    "limite_credito" numeric(12,2) DEFAULT 0,
    "saldo_devedor" numeric(12,2) DEFAULT 0,
    "posto_id" integer NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "bloqueado" boolean DEFAULT false
);
CREATE TABLE public."ClienteBaratencia" (
    "id" integer DEFAULT nextval('"ClienteBaratencia_id_seq"'::regclass) NOT NULL,
    "user_id" uuid,
    "nome" character varying(255) NOT NULL,
    "cpf" character varying(14) NOT NULL,
    "telefone" character varying(20),
    "data_nascimento" date,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."Combustivel" (
    "id" integer DEFAULT nextval('"Combustivel_id_seq"'::regclass) NOT NULL,
    "nome" text NOT NULL,
    "codigo" text NOT NULL,
    "cor" text,
    "ativo" boolean DEFAULT true NOT NULL,
    "preco_venda" numeric(10,2) DEFAULT 0 NOT NULL,
    "posto_id" integer DEFAULT 1,
    "preco_custo" numeric DEFAULT 0
);
CREATE TABLE public."Compra" (
    "id" integer DEFAULT nextval('"Compra_id_seq"'::regclass) NOT NULL,
    "data" timestamp with time zone NOT NULL,
    "combustivel_id" integer NOT NULL,
    "fornecedor_id" integer NOT NULL,
    "quantidade_litros" numeric(15,2) NOT NULL,
    "valor_total" numeric(15,2) NOT NULL,
    "custo_por_litro" numeric(10,4) NOT NULL,
    "numero_nf" text,
    "arquivo_nf" text,
    "observacoes" text,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."Configuracao" (
    "id" bigint DEFAULT nextval('"Configuracao_id_seq"'::regclass) NOT NULL,
    "chave" text NOT NULL,
    "valor" text NOT NULL,
    "descricao" text,
    "tipo" text DEFAULT 'texto'::text NOT NULL,
    "categoria" text DEFAULT 'geral'::text NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."Despesa" (
    "id" integer DEFAULT nextval('"Despesa_id_seq"'::regclass) NOT NULL,
    "descricao" text NOT NULL,
    "categoria" text,
    "valor" numeric(15,2) NOT NULL,
    "data" date NOT NULL,
    "status" text DEFAULT 'pendente'::text,
    "created_at" timestamp with time zone DEFAULT now(),
    "posto_id" integer,
    "data_pagamento" date,
    "observacoes" text,
    "categoria_id" integer,
    "recorrente" boolean DEFAULT false NOT NULL
);
CREATE TABLE public."Divida" (
    "id" bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    "descricao" text NOT NULL,
    "valor" numeric(15,2) NOT NULL,
    "data_vencimento" date NOT NULL,
    "status" text DEFAULT 'pendente'::text NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."Emprestimo" (
    "id" bigint DEFAULT nextval('"Emprestimo_id_seq"'::regclass) NOT NULL,
    "credor" text NOT NULL,
    "valor_total" numeric(12,2) NOT NULL,
    "quantidade_parcelas" integer NOT NULL,
    "valor_parcela" numeric(12,2) NOT NULL,
    "data_emprestimo" date DEFAULT CURRENT_DATE NOT NULL,
    "data_primeiro_vencimento" date NOT NULL,
    "periodicidade" periodicity_type DEFAULT 'mensal'::periodicity_type NOT NULL,
    "taxa_juros" numeric(5,2),
    "observacoes" text,
    "ativo" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."Escala" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "frentista_id" bigint NOT NULL,
    "data" date NOT NULL,
    "tipo" text NOT NULL,
    "turno_id" bigint,
    "observacao" text,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "posto_id" integer
);
CREATE TABLE public."Estoque" (
    "id" integer DEFAULT nextval('"Estoque_id_seq"'::regclass) NOT NULL,
    "combustivel_id" integer NOT NULL,
    "quantidade_atual" numeric(15,2) NOT NULL,
    "custo_medio" numeric(10,4) NOT NULL,
    "capacidade_tanque" numeric(15,2) NOT NULL,
    "ultima_atualizacao" timestamp with time zone DEFAULT now() NOT NULL,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."Fechamento" (
    "id" integer DEFAULT nextval('"Fechamento_id_seq"'::regclass) NOT NULL,
    "data" timestamp with time zone NOT NULL,
    "total_vendas" numeric(15,2),
    "total_recebido" numeric(15,2) NOT NULL,
    "diferenca" numeric(15,2),
    "status" "StatusFechamento" DEFAULT 'RASCUNHO'::"StatusFechamento" NOT NULL,
    "observacoes" text,
    "usuario_id" integer NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "turno_id" integer,
    "posto_id" integer DEFAULT 1,
    "lucro_bruto" numeric(10,2) DEFAULT 0,
    "custo_combustiveis" numeric(10,2) DEFAULT 0,
    "taxas_pagamento" numeric(10,2) DEFAULT 0,
    "lucro_liquido" numeric(10,2) DEFAULT 0,
    "margem_bruta_percentual" numeric(5,2) DEFAULT 0,
    "margem_liquida_percentual" numeric(5,2) DEFAULT 0
);
CREATE TABLE public."FechamentoFrentista" (
    "id" integer DEFAULT nextval('"FechamentoFrentista_id_seq"'::regclass) NOT NULL,
    "fechamento_id" integer NOT NULL,
    "frentista_id" integer NOT NULL,
    "valor_cartao" numeric(15,2) DEFAULT 0 NOT NULL,
    "valor_nota" numeric(15,2) DEFAULT 0 NOT NULL,
    "valor_pix" numeric(15,2) DEFAULT 0 NOT NULL,
    "valor_dinheiro" numeric(15,2) DEFAULT 0 NOT NULL,
    "valor_conferido" numeric(15,2) DEFAULT 0 NOT NULL,
    "observacoes" text,
    "encerrante" numeric(12,2) DEFAULT 0,
    "baratao" numeric(12,2) DEFAULT 0,
    "diferenca_calculada" numeric(12,2) DEFAULT 0,
    "valor_cartao_debito" numeric(12,2) DEFAULT 0,
    "valor_cartao_credito" numeric(12,2) DEFAULT 0,
    "posto_id" integer DEFAULT 1,
    "baratencia" numeric(12,2) DEFAULT 0,
    "data_hora_envio" timestamp with time zone DEFAULT now(),
    "valor_moedas" numeric(10,2) DEFAULT 0 NOT NULL
);
CREATE TABLE public."FormaPagamento" (
    "id" integer DEFAULT nextval('"FormaPagamento_id_seq"'::regclass) NOT NULL,
    "nome" text NOT NULL,
    "tipo" text NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "taxa" numeric(5,2) DEFAULT 0,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."Fornecedor" (
    "id" integer DEFAULT nextval('"Fornecedor_id_seq"'::regclass) NOT NULL,
    "nome" text NOT NULL,
    "cnpj" text NOT NULL,
    "contato" text,
    "ativo" boolean DEFAULT true NOT NULL,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."Frentista" (
    "id" integer DEFAULT nextval('"Frentista_id_seq"'::regclass) NOT NULL,
    "nome" text NOT NULL,
    "cpf" text,
    "telefone" text,
    "data_admissao" timestamp with time zone NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "user_id" uuid,
    "turno_id" integer,
    "posto_id" integer DEFAULT 1,
    "foto" text
);
CREATE TABLE public."HistoricoTanque" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "tanque_id" bigint,
    "data" date NOT NULL,
    "volume_livro" numeric(10,2),
    "volume_fisico" numeric(10,2),
    "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."InscricaoPush" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "endpoint" text NOT NULL,
    "p256dh" text NOT NULL,
    "auth" text NOT NULL,
    "papel" text DEFAULT 'dono'::text NOT NULL,
    "descricao_aparelho" text,
    "ativa" boolean DEFAULT true NOT NULL,
    "criada_em" timestamp with time zone DEFAULT now() NOT NULL,
    "usada_em" timestamp with time zone
);
CREATE TABLE public."Leitura" (
    "id" integer DEFAULT nextval('"Leitura_id_seq"'::regclass) NOT NULL,
    "data" timestamp with time zone NOT NULL,
    "bico_id" integer NOT NULL,
    "combustivel_id" integer NOT NULL,
    "leitura_inicial" numeric(15,3) NOT NULL,
    "leitura_final" numeric(15,3) NOT NULL,
    "litros_vendidos" numeric(15,3) NOT NULL,
    "preco_litro" numeric(10,2) NOT NULL,
    "valor_total" numeric(15,2) NOT NULL,
    "usuario_id" integer NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "turno_id" integer,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."Maquininha" (
    "id" integer DEFAULT nextval('"Maquininha_id_seq"'::regclass) NOT NULL,
    "nome" text NOT NULL,
    "operadora" text,
    "taxa" numeric(5,2),
    "ativo" boolean DEFAULT true NOT NULL,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."MovimentacaoEstoque" (
    "id" integer DEFAULT nextval('"MovimentacaoEstoque_id_seq"'::regclass) NOT NULL,
    "produto_id" integer,
    "tipo" text NOT NULL,
    "quantidade" integer NOT NULL,
    "data" timestamp with time zone DEFAULT now(),
    "responsavel" text,
    "observacao" text,
    "created_at" timestamp with time zone DEFAULT now(),
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."NotaFrentista" (
    "id" integer DEFAULT nextval('"NotaFrentista_id_seq"'::regclass) NOT NULL,
    "cliente_id" integer,
    "frentista_id" integer NOT NULL,
    "fechamento_frentista_id" integer,
    "valor" numeric(12,2) NOT NULL,
    "descricao" text,
    "data" date DEFAULT CURRENT_DATE NOT NULL,
    "data_pagamento" date,
    "status" character varying(20) DEFAULT 'pendente'::character varying,
    "forma_pagamento" character varying(50),
    "observacoes" text,
    "posto_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."Notificacao" (
    "id" integer DEFAULT nextval('"Notificacao_id_seq"'::regclass) NOT NULL,
    "frentista_id" integer NOT NULL,
    "fechamento_frentista_id" integer,
    "titulo" text NOT NULL,
    "mensagem" text NOT NULL,
    "tipo" text DEFAULT 'FALTA_CAIXA'::text,
    "lida" boolean DEFAULT false,
    "enviada" boolean DEFAULT false,
    "data_envio" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now(),
    "posto_id" integer DEFAULT 1,
    "valor_falta" numeric
);
CREATE TABLE public."Parcela" (
    "id" bigint DEFAULT nextval('"Parcela_id_seq"'::regclass) NOT NULL,
    "emprestimo_id" bigint NOT NULL,
    "numero_parcela" integer NOT NULL,
    "data_vencimento" date NOT NULL,
    "valor" numeric(12,2) NOT NULL,
    "data_pagamento" date,
    "status" installment_status DEFAULT 'pendente'::installment_status NOT NULL,
    "juros_multa" numeric(12,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."Posto" (
    "id" integer DEFAULT nextval('"Posto_id_seq"'::regclass) NOT NULL,
    "nome" character varying(255) NOT NULL,
    "cnpj" character varying(18),
    "endereco" text,
    "cidade" character varying(100),
    "estado" character(2),
    "telefone" character varying(20),
    "email" character varying(255),
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."PresencaFrentista" (
    "frentista_id" integer NOT NULL,
    "posto_id" integer,
    "visto_em" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public."Produto" (
    "id" integer DEFAULT nextval('"Produto_id_seq"'::regclass) NOT NULL,
    "nome" text NOT NULL,
    "codigo_barras" text,
    "categoria" text NOT NULL,
    "descricao" text,
    "preco_custo" numeric(10,2) DEFAULT 0 NOT NULL,
    "preco_venda" numeric(10,2) DEFAULT 0 NOT NULL,
    "estoque_atual" integer DEFAULT 0 NOT NULL,
    "estoque_minimo" integer DEFAULT 0 NOT NULL,
    "unidade_medida" text DEFAULT 'unidade'::text NOT NULL,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."PromocaoBaratencia" (
    "id" integer DEFAULT nextval('"PromocaoBaratencia_id_seq"'::regclass) NOT NULL,
    "titulo" character varying(255) NOT NULL,
    "descricao" text,
    "tipo" character varying(50) NOT NULL,
    "valor_minimo" numeric(15,2) DEFAULT 0,
    "bonus_porcentagem" numeric(5,2) DEFAULT 0,
    "combustivel_codigo" character varying(10),
    "data_inicio" timestamp with time zone DEFAULT now(),
    "data_fim" timestamp with time zone,
    "ativo" boolean DEFAULT true,
    "posto_id" integer,
    "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."PushToken" (
    "id" integer DEFAULT nextval('"PushToken_id_seq"'::regclass) NOT NULL,
    "usuario_id" integer NOT NULL,
    "frentista_id" integer,
    "expo_push_token" text NOT NULL,
    "device_info" text,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."Recebimento" (
    "id" integer DEFAULT nextval('"Recebimento_id_seq"'::regclass) NOT NULL,
    "fechamento_id" integer NOT NULL,
    "forma_pagamento_id" integer NOT NULL,
    "maquininha_id" integer,
    "valor" numeric(15,2) NOT NULL,
    "observacoes" text
);
CREATE TABLE public."Receita" (
    "id" integer DEFAULT nextval('"Receita_id_seq"'::regclass) NOT NULL,
    "descricao" text NOT NULL,
    "valor" numeric(12,2) NOT NULL,
    "data" date DEFAULT CURRENT_DATE NOT NULL,
    "categoria_id" integer,
    "posto_id" integer,
    "status" text DEFAULT 'recebido'::text,
    "observacoes" text,
    "usuario_id" integer,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."Tanque" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "nome" character varying NOT NULL,
    "combustivel_id" bigint NOT NULL,
    "capacidade" numeric(10,2) DEFAULT 0 NOT NULL,
    "estoque_atual" numeric(10,2) DEFAULT 0 NOT NULL,
    "ativo" boolean DEFAULT true,
    "posto_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE public."TokenAbastecimento" (
    "id" integer DEFAULT nextval('"TokenAbastecimento_id_seq"'::regclass) NOT NULL,
    "cliente_id" integer,
    "posto_id" integer,
    "combustivel_id" integer,
    "quantidade_litros" numeric(15,3) NOT NULL,
    "token_pin" character varying(6) NOT NULL,
    "data_expiracao" timestamp with time zone NOT NULL,
    "status" character varying(20) DEFAULT 'PENDENTE'::character varying,
    "frentista_id_resgatou" integer,
    "data_resgate" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."TransacaoBaratencia" (
    "id" integer DEFAULT nextval('"TransacaoBaratencia_id_seq"'::regclass) NOT NULL,
    "carteira_id" integer,
    "tipo" "TipoTransacaoBaratencia" NOT NULL,
    "valor_brl" numeric(15,2) DEFAULT 0,
    "quantidade_litros" numeric(15,3) DEFAULT 0,
    "combustivel_codigo" character varying(10),
    "preco_na_hora" numeric(10,3),
    "status" character varying(20) DEFAULT 'COMPLETO'::character varying,
    "metadata" jsonb,
    "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."Turno" (
    "id" integer DEFAULT nextval('"Turno_id_seq"'::regclass) NOT NULL,
    "nome" text NOT NULL,
    "horario_inicio" time without time zone NOT NULL,
    "horario_fim" time without time zone NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "posto_id" integer DEFAULT 1
);
CREATE TABLE public."Usuario" (
    "id" integer DEFAULT nextval('"Usuario_id_seq"'::regclass) NOT NULL,
    "email" text NOT NULL,
    "nome" text NOT NULL,
    "senha" text,
    "role" "Role" DEFAULT 'OPERADOR'::"Role" NOT NULL,
    "ativo" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
    "auth_user_id" uuid
);
CREATE TABLE public."UsuarioPosto" (
    "id" integer DEFAULT nextval('"UsuarioPosto_id_seq"'::regclass) NOT NULL,
    "usuario_id" integer NOT NULL,
    "posto_id" integer NOT NULL,
    "role" character varying(50) DEFAULT 'operador'::character varying,
    "ativo" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT now()
);
CREATE TABLE public."VendaProduto" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "frentista_id" bigint NOT NULL,
    "produto_id" bigint NOT NULL,
    "quantidade" numeric(10,2) DEFAULT 1 NOT NULL,
    "valor_unitario" numeric(10,2) NOT NULL,
    "valor_total" numeric(10,2) NOT NULL,
    "data" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "fechamento_frentista_id" bigint,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE TABLE public."frentistas_old_backup" (
    "id" bigint GENERATED BY DEFAULT AS IDENTITY NOT NULL,
    "nome" text NOT NULL,
    "ativo" boolean DEFAULT true,
    "posto_id" integer,
    "turno_id" integer
);
CREATE TABLE public."ganhos" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "date" text NOT NULL,
    "shopee" numeric DEFAULT 0,
    "jt" numeric DEFAULT 0,
    "jt_liquido" numeric DEFAULT 0,
    "desconto_jt" numeric DEFAULT 0,
    "total" numeric DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT now(),
    "cartoes" numeric DEFAULT 0
);
CREATE TABLE public."parcelas" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "parcela" integer NOT NULL,
    "mes_ano" text NOT NULL,
    "valor" numeric NOT NULL,
    "data" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT now()
);

ALTER SEQUENCE public."AuditoriaDados_id_seq" OWNED BY public."AuditoriaDados"."id";
ALTER SEQUENCE public."Bico_id_seq" OWNED BY public."Bico"."id";
ALTER SEQUENCE public."Bomba_id_seq" OWNED BY public."Bomba"."id";
ALTER SEQUENCE public."CarteiraBaratencia_id_seq" OWNED BY public."CarteiraBaratencia"."id";
ALTER SEQUENCE public."CategoriaFinanceira_id_seq" OWNED BY public."CategoriaFinanceira"."id";
ALTER SEQUENCE public."ClienteBaratencia_id_seq" OWNED BY public."ClienteBaratencia"."id";
ALTER SEQUENCE public."Cliente_id_seq" OWNED BY public."Cliente"."id";
ALTER SEQUENCE public."Combustivel_id_seq" OWNED BY public."Combustivel"."id";
ALTER SEQUENCE public."Compra_id_seq" OWNED BY public."Compra"."id";
ALTER SEQUENCE public."Configuracao_id_seq" OWNED BY public."Configuracao"."id";
ALTER SEQUENCE public."Despesa_id_seq" OWNED BY public."Despesa"."id";
ALTER SEQUENCE public."Emprestimo_id_seq" OWNED BY public."Emprestimo"."id";
ALTER SEQUENCE public."Estoque_id_seq" OWNED BY public."Estoque"."id";
ALTER SEQUENCE public."FechamentoFrentista_id_seq" OWNED BY public."FechamentoFrentista"."id";
ALTER SEQUENCE public."Fechamento_id_seq" OWNED BY public."Fechamento"."id";
ALTER SEQUENCE public."FormaPagamento_id_seq" OWNED BY public."FormaPagamento"."id";
ALTER SEQUENCE public."Fornecedor_id_seq" OWNED BY public."Fornecedor"."id";
ALTER SEQUENCE public."Frentista_id_seq" OWNED BY public."Frentista"."id";
ALTER SEQUENCE public."Leitura_id_seq" OWNED BY public."Leitura"."id";
ALTER SEQUENCE public."Maquininha_id_seq" OWNED BY public."Maquininha"."id";
ALTER SEQUENCE public."MovimentacaoEstoque_id_seq" OWNED BY public."MovimentacaoEstoque"."id";
ALTER SEQUENCE public."NotaFrentista_id_seq" OWNED BY public."NotaFrentista"."id";
ALTER SEQUENCE public."Notificacao_id_seq" OWNED BY public."Notificacao"."id";
ALTER SEQUENCE public."Parcela_id_seq" OWNED BY public."Parcela"."id";
ALTER SEQUENCE public."Posto_id_seq" OWNED BY public."Posto"."id";
ALTER SEQUENCE public."Produto_id_seq" OWNED BY public."Produto"."id";
ALTER SEQUENCE public."PromocaoBaratencia_id_seq" OWNED BY public."PromocaoBaratencia"."id";
ALTER SEQUENCE public."PushToken_id_seq" OWNED BY public."PushToken"."id";
ALTER SEQUENCE public."Recebimento_id_seq" OWNED BY public."Recebimento"."id";
ALTER SEQUENCE public."Receita_id_seq" OWNED BY public."Receita"."id";
ALTER SEQUENCE public."TokenAbastecimento_id_seq" OWNED BY public."TokenAbastecimento"."id";
ALTER SEQUENCE public."TransacaoBaratencia_id_seq" OWNED BY public."TransacaoBaratencia"."id";
ALTER SEQUENCE public."Turno_id_seq" OWNED BY public."Turno"."id";
ALTER SEQUENCE public."UsuarioPosto_id_seq" OWNED BY public."UsuarioPosto"."id";
ALTER SEQUENCE public."Usuario_id_seq" OWNED BY public."Usuario"."id";
ALTER SEQUENCE public."frentistas_old_backup_id_seq" RENAME TO "frentistas_id_seq";

-- ---------- constraints: PK, UNIQUE, CHECK e por último FK ----------
ALTER TABLE "AuditoriaDados" ADD CONSTRAINT "AuditoriaDados_pkey" PRIMARY KEY (id);
ALTER TABLE "Bico" ADD CONSTRAINT "Bico_pkey" PRIMARY KEY (id);
ALTER TABLE "Bomba" ADD CONSTRAINT "Bomba_pkey" PRIMARY KEY (id);
ALTER TABLE "CarteiraBaratencia" ADD CONSTRAINT "CarteiraBaratencia_pkey" PRIMARY KEY (id);
ALTER TABLE "CategoriaFinanceira" ADD CONSTRAINT "CategoriaFinanceira_pkey" PRIMARY KEY (id);
ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_pkey" PRIMARY KEY (id);
ALTER TABLE "ClienteBaratencia" ADD CONSTRAINT "ClienteBaratencia_pkey" PRIMARY KEY (id);
ALTER TABLE "Combustivel" ADD CONSTRAINT "Combustivel_pkey" PRIMARY KEY (id);
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_pkey" PRIMARY KEY (id);
ALTER TABLE "Configuracao" ADD CONSTRAINT "Configuracao_pkey" PRIMARY KEY (id);
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_pkey" PRIMARY KEY (id);
ALTER TABLE "Divida" ADD CONSTRAINT "Divida_pkey" PRIMARY KEY (id);
ALTER TABLE "Emprestimo" ADD CONSTRAINT "Emprestimo_pkey" PRIMARY KEY (id);
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_pkey" PRIMARY KEY (id);
ALTER TABLE "Estoque" ADD CONSTRAINT "Estoque_pkey" PRIMARY KEY (id);
ALTER TABLE "Fechamento" ADD CONSTRAINT "Fechamento_pkey" PRIMARY KEY (id);
ALTER TABLE "FechamentoFrentista" ADD CONSTRAINT "FechamentoFrentista_pkey" PRIMARY KEY (id);
ALTER TABLE "FormaPagamento" ADD CONSTRAINT "FormaPagamento_pkey" PRIMARY KEY (id);
ALTER TABLE "Fornecedor" ADD CONSTRAINT "Fornecedor_pkey" PRIMARY KEY (id);
ALTER TABLE "Frentista" ADD CONSTRAINT "Frentista_pkey" PRIMARY KEY (id);
ALTER TABLE "HistoricoTanque" ADD CONSTRAINT "HistoricoTanque_pkey" PRIMARY KEY (id);
ALTER TABLE "InscricaoPush" ADD CONSTRAINT "InscricaoPush_pkey" PRIMARY KEY (id);
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_pkey" PRIMARY KEY (id);
ALTER TABLE "Maquininha" ADD CONSTRAINT "Maquininha_pkey" PRIMARY KEY (id);
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_pkey" PRIMARY KEY (id);
ALTER TABLE "NotaFrentista" ADD CONSTRAINT "NotaFrentista_pkey" PRIMARY KEY (id);
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_pkey" PRIMARY KEY (id);
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_pkey" PRIMARY KEY (id);
ALTER TABLE "Posto" ADD CONSTRAINT "Posto_pkey" PRIMARY KEY (id);
ALTER TABLE "PresencaFrentista" ADD CONSTRAINT "PresencaFrentista_pkey" PRIMARY KEY (frentista_id);
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_pkey" PRIMARY KEY (id);
ALTER TABLE "PromocaoBaratencia" ADD CONSTRAINT "PromocaoBaratencia_pkey" PRIMARY KEY (id);
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_pkey" PRIMARY KEY (id);
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_pkey" PRIMARY KEY (id);
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_pkey" PRIMARY KEY (id);
ALTER TABLE "Tanque" ADD CONSTRAINT "Tanque_pkey" PRIMARY KEY (id);
ALTER TABLE "TokenAbastecimento" ADD CONSTRAINT "TokenAbastecimento_pkey" PRIMARY KEY (id);
ALTER TABLE "TransacaoBaratencia" ADD CONSTRAINT "TransacaoBaratencia_pkey" PRIMARY KEY (id);
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_pkey" PRIMARY KEY (id);
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY (id);
ALTER TABLE "UsuarioPosto" ADD CONSTRAINT "UsuarioPosto_pkey" PRIMARY KEY (id);
ALTER TABLE "VendaProduto" ADD CONSTRAINT "VendaProduto_pkey" PRIMARY KEY (id);
ALTER TABLE frentistas_old_backup ADD CONSTRAINT "frentistas_pkey" PRIMARY KEY (id);
ALTER TABLE ganhos ADD CONSTRAINT "ganhos_pkey" PRIMARY KEY (id);
ALTER TABLE parcelas ADD CONSTRAINT "parcelas_pkey" PRIMARY KEY (id);
ALTER TABLE "Bico" ADD CONSTRAINT "Bico_bomba_id_numero_key" UNIQUE (bomba_id, numero);
ALTER TABLE "Bomba" ADD CONSTRAINT "Bomba_nome_posto_unique" UNIQUE (nome, posto_id);
ALTER TABLE "CarteiraBaratencia" ADD CONSTRAINT "CarteiraBaratencia_cliente_id_key" UNIQUE (cliente_id);
ALTER TABLE "ClienteBaratencia" ADD CONSTRAINT "ClienteBaratencia_cpf_key" UNIQUE (cpf);
ALTER TABLE "Combustivel" ADD CONSTRAINT "Combustivel_codigo_posto_unique" UNIQUE (codigo, posto_id);
ALTER TABLE "Configuracao" ADD CONSTRAINT "Configuracao_chave_key" UNIQUE (chave);
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_frentista_id_data_key" UNIQUE (frentista_id, data);
ALTER TABLE "Estoque" ADD CONSTRAINT "Estoque_combustivel_id_key" UNIQUE (combustivel_id);
ALTER TABLE "FormaPagamento" ADD CONSTRAINT "FormaPagamento_nome_posto_unique" UNIQUE (nome, posto_id);
ALTER TABLE "Fornecedor" ADD CONSTRAINT "Fornecedor_cnpj_key" UNIQUE (cnpj);
ALTER TABLE "Frentista" ADD CONSTRAINT "Frentista_cpf_key" UNIQUE (cpf);
ALTER TABLE "HistoricoTanque" ADD CONSTRAINT "HistoricoTanque_tanque_id_data_key" UNIQUE (tanque_id, data);
ALTER TABLE "InscricaoPush" ADD CONSTRAINT "InscricaoPush_endpoint_key" UNIQUE (endpoint);
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_email_key" UNIQUE (email);
ALTER TABLE "UsuarioPosto" ADD CONSTRAINT "UsuarioPosto_usuario_id_posto_id_key" UNIQUE (usuario_id, posto_id);
ALTER TABLE ganhos ADD CONSTRAINT "ganhos_date_key" UNIQUE (date);
ALTER TABLE parcelas ADD CONSTRAINT "parcelas_parcela_key" UNIQUE (parcela);
ALTER TABLE "CategoriaFinanceira" ADD CONSTRAINT "CategoriaFinanceira_tipo_check" CHECK ((tipo = ANY (ARRAY['receita'::text, 'despesa'::text, 'ambos'::text])));
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_status_check" CHECK ((status = ANY (ARRAY['pendente'::text, 'pago'::text])));
ALTER TABLE "Divida" ADD CONSTRAINT "Divida_status_check" CHECK ((status = ANY (ARRAY['pendente'::text, 'pago'::text])));
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_tipo_check" CHECK ((tipo = ANY (ARRAY['FOLGA'::text, 'TRABALHO'::text])));
ALTER TABLE "Escala" ADD CONSTRAINT "escala_tipo_check" CHECK ((tipo = ANY (ARRAY['FOLGA'::text, 'TRABALHO'::text])));
ALTER TABLE "Frentista" ADD CONSTRAINT "frentista_foto_tamanho" CHECK (((foto IS NULL) OR ((foto ~~ 'data:image/jpeg;base64,%'::text) AND (length(foto) <= 40000))));
ALTER TABLE "Bico" ADD CONSTRAINT "Bico_bomba_id_fkey" FOREIGN KEY (bomba_id) REFERENCES "Bomba"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Bico" ADD CONSTRAINT "Bico_combustivel_id_fkey" FOREIGN KEY (combustivel_id) REFERENCES "Combustivel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Bico" ADD CONSTRAINT "Bico_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Bico" ADD CONSTRAINT "Bico_tanque_id_fkey" FOREIGN KEY (tanque_id) REFERENCES "Tanque"(id);
ALTER TABLE "Bomba" ADD CONSTRAINT "Bomba_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "CarteiraBaratencia" ADD CONSTRAINT "CarteiraBaratencia_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES "ClienteBaratencia"(id);
ALTER TABLE "CategoriaFinanceira" ADD CONSTRAINT "CategoriaFinanceira_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "ClienteBaratencia" ADD CONSTRAINT "ClienteBaratencia_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id);
ALTER TABLE "Combustivel" ADD CONSTRAINT "Combustivel_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_combustivel_id_fkey" FOREIGN KEY (combustivel_id) REFERENCES "Combustivel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_fornecedor_id_fkey" FOREIGN KEY (fornecedor_id) REFERENCES "Fornecedor"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Compra" ADD CONSTRAINT "Compra_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Configuracao" ADD CONSTRAINT "Configuracao_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES "CategoriaFinanceira"(id);
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Divida" ADD CONSTRAINT "Divida_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Emprestimo" ADD CONSTRAINT "Emprestimo_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_frentista_id_fkey" FOREIGN KEY (frentista_id) REFERENCES "Frentista"(id);
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Escala" ADD CONSTRAINT "Escala_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES "Turno"(id);
ALTER TABLE "Estoque" ADD CONSTRAINT "Estoque_combustivel_id_fkey" FOREIGN KEY (combustivel_id) REFERENCES "Combustivel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Estoque" ADD CONSTRAINT "Estoque_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Fechamento" ADD CONSTRAINT "Fechamento_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Fechamento" ADD CONSTRAINT "Fechamento_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES "Turno"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Fechamento" ADD CONSTRAINT "Fechamento_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES "Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "FechamentoFrentista" ADD CONSTRAINT "FechamentoFrentista_fechamento_id_fkey" FOREIGN KEY (fechamento_id) REFERENCES "Fechamento"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "FechamentoFrentista" ADD CONSTRAINT "FechamentoFrentista_frentista_id_fkey" FOREIGN KEY (frentista_id) REFERENCES "Frentista"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "FechamentoFrentista" ADD CONSTRAINT "FechamentoFrentista_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "FormaPagamento" ADD CONSTRAINT "FormaPagamento_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Fornecedor" ADD CONSTRAINT "Fornecedor_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Frentista" ADD CONSTRAINT "Frentista_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Frentista" ADD CONSTRAINT "Frentista_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES "Turno"(id);
ALTER TABLE "Frentista" ADD CONSTRAINT "Frentista_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE "HistoricoTanque" ADD CONSTRAINT "HistoricoTanque_tanque_id_fkey" FOREIGN KEY (tanque_id) REFERENCES "Tanque"(id);
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_bico_id_fkey" FOREIGN KEY (bico_id) REFERENCES "Bico"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_combustivel_id_fkey" FOREIGN KEY (combustivel_id) REFERENCES "Combustivel"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_turno_id_fkey" FOREIGN KEY (turno_id) REFERENCES "Turno"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Leitura" ADD CONSTRAINT "Leitura_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES "Usuario"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Maquininha" ADD CONSTRAINT "Maquininha_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "MovimentacaoEstoque" ADD CONSTRAINT "MovimentacaoEstoque_produto_id_fkey" FOREIGN KEY (produto_id) REFERENCES "Produto"(id);
ALTER TABLE "NotaFrentista" ADD CONSTRAINT "NotaFrentista_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES "Cliente"(id) ON DELETE CASCADE;
ALTER TABLE "NotaFrentista" ADD CONSTRAINT "NotaFrentista_frentista_id_fkey" FOREIGN KEY (frentista_id) REFERENCES "Frentista"(id);
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_fechamento_frentista_id_fkey" FOREIGN KEY (fechamento_frentista_id) REFERENCES "FechamentoFrentista"(id);
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_frentista_id_fkey" FOREIGN KEY (frentista_id) REFERENCES "Frentista"(id);
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Parcela" ADD CONSTRAINT "Parcela_emprestimo_id_fkey" FOREIGN KEY (emprestimo_id) REFERENCES "Emprestimo"(id) ON DELETE CASCADE;
ALTER TABLE "PresencaFrentista" ADD CONSTRAINT "PresencaFrentista_frentista_id_fkey" FOREIGN KEY (frentista_id) REFERENCES "Frentista"(id) ON DELETE CASCADE;
ALTER TABLE "Produto" ADD CONSTRAINT "Produto_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "PromocaoBaratencia" ADD CONSTRAINT "PromocaoBaratencia_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_frentista_id_fkey" FOREIGN KEY (frentista_id) REFERENCES "Frentista"(id);
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES "Usuario"(id);
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_fechamento_id_fkey" FOREIGN KEY (fechamento_id) REFERENCES "Fechamento"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_forma_pagamento_id_fkey" FOREIGN KEY (forma_pagamento_id) REFERENCES "FormaPagamento"(id) ON UPDATE CASCADE ON DELETE RESTRICT;
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_maquininha_id_fkey" FOREIGN KEY (maquininha_id) REFERENCES "Maquininha"(id) ON UPDATE CASCADE ON DELETE SET NULL;
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES "CategoriaFinanceira"(id);
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Receita" ADD CONSTRAINT "Receita_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES "Usuario"(id);
ALTER TABLE "Tanque" ADD CONSTRAINT "Tanque_combustivel_id_fkey" FOREIGN KEY (combustivel_id) REFERENCES "Combustivel"(id);
ALTER TABLE "Tanque" ADD CONSTRAINT "Tanque_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "TokenAbastecimento" ADD CONSTRAINT "TokenAbastecimento_cliente_id_fkey" FOREIGN KEY (cliente_id) REFERENCES "ClienteBaratencia"(id);
ALTER TABLE "TokenAbastecimento" ADD CONSTRAINT "TokenAbastecimento_combustivel_id_fkey" FOREIGN KEY (combustivel_id) REFERENCES "Combustivel"(id);
ALTER TABLE "TokenAbastecimento" ADD CONSTRAINT "TokenAbastecimento_frentista_id_resgatou_fkey" FOREIGN KEY (frentista_id_resgatou) REFERENCES "Frentista"(id);
ALTER TABLE "TokenAbastecimento" ADD CONSTRAINT "TokenAbastecimento_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "TransacaoBaratencia" ADD CONSTRAINT "TransacaoBaratencia_carteira_id_fkey" FOREIGN KEY (carteira_id) REFERENCES "CarteiraBaratencia"(id);
ALTER TABLE "Turno" ADD CONSTRAINT "Turno_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id);
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id);
ALTER TABLE "UsuarioPosto" ADD CONSTRAINT "UsuarioPosto_posto_id_fkey" FOREIGN KEY (posto_id) REFERENCES "Posto"(id) ON DELETE CASCADE;
ALTER TABLE "UsuarioPosto" ADD CONSTRAINT "UsuarioPosto_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES "Usuario"(id) ON DELETE CASCADE;
ALTER TABLE "VendaProduto" ADD CONSTRAINT "VendaProduto_fechamento_frentista_id_fkey" FOREIGN KEY (fechamento_frentista_id) REFERENCES "FechamentoFrentista"(id);
ALTER TABLE "VendaProduto" ADD CONSTRAINT "VendaProduto_frentista_id_fkey" FOREIGN KEY (frentista_id) REFERENCES "Frentista"(id);
ALTER TABLE "VendaProduto" ADD CONSTRAINT "VendaProduto_produto_id_fkey" FOREIGN KEY (produto_id) REFERENCES "Produto"(id);

-- ---------- índices (os que não vêm de constraint) ----------
CREATE INDEX auditoria_dados_em_idx ON public."AuditoriaDados" USING btree (em DESC);
CREATE INDEX auditoria_dados_tabela_idx ON public."AuditoriaDados" USING btree (tabela, em DESC);
CREATE INDEX idx_bico_combustivel_id ON public."Bico" USING btree (combustivel_id);
CREATE INDEX idx_bico_posto ON public."Bico" USING btree (posto_id);
CREATE INDEX idx_bico_tanque_id ON public."Bico" USING btree (tanque_id);
CREATE INDEX idx_bomba_posto ON public."Bomba" USING btree (posto_id);
CREATE INDEX idx_cliente_posto ON public."Cliente" USING btree (posto_id);
CREATE INDEX idx_combustivel_posto ON public."Combustivel" USING btree (posto_id);
CREATE INDEX idx_compra_combustivel_id ON public."Compra" USING btree (combustivel_id);
CREATE INDEX idx_compra_fornecedor_id ON public."Compra" USING btree (fornecedor_id);
CREATE INDEX idx_compra_posto ON public."Compra" USING btree (posto_id);
CREATE INDEX idx_configuracao_posto ON public."Configuracao" USING btree (posto_id);
CREATE INDEX idx_despesa_posto_id ON public."Despesa" USING btree (posto_id);
CREATE INDEX idx_despesa_recorrente ON public."Despesa" USING btree (posto_id, recorrente, data DESC) WHERE (recorrente = true);
CREATE INDEX idx_divida_posto ON public."Divida" USING btree (posto_id);
CREATE INDEX idx_emprestimo_posto ON public."Emprestimo" USING btree (posto_id);
CREATE INDEX idx_escala_turno_id ON public."Escala" USING btree (turno_id);
CREATE INDEX idx_estoque_posto ON public."Estoque" USING btree (posto_id);
CREATE UNIQUE INDEX "Fechamento_data_turno_idx" ON public."Fechamento" USING btree (data, turno_id);
CREATE INDEX idx_fechamento_posto ON public."Fechamento" USING btree (posto_id);
CREATE INDEX idx_fechamento_turno_id ON public."Fechamento" USING btree (turno_id);
CREATE INDEX idx_fechamento_usuario_id ON public."Fechamento" USING btree (usuario_id);
CREATE UNIQUE INDEX fechamento_frentista_unico_por_dia ON public."FechamentoFrentista" USING btree (fechamento_id, frentista_id);
CREATE INDEX idx_fechamentofrentista_fechamento_id ON public."FechamentoFrentista" USING btree (fechamento_id);
CREATE INDEX idx_fechamentofrentista_frentista_id ON public."FechamentoFrentista" USING btree (frentista_id);
CREATE INDEX idx_fechamentofrentista_posto_id ON public."FechamentoFrentista" USING btree (posto_id);
CREATE INDEX idx_formapagamento_posto ON public."FormaPagamento" USING btree (posto_id);
CREATE INDEX idx_fornecedor_posto ON public."Fornecedor" USING btree (posto_id);
CREATE INDEX idx_frentista_posto ON public."Frentista" USING btree (posto_id);
CREATE INDEX idx_frentista_turno_id ON public."Frentista" USING btree (turno_id);
CREATE INDEX idx_frentista_user_id ON public."Frentista" USING btree (user_id);
CREATE INDEX idx_inscricaopush_ativa ON public."InscricaoPush" USING btree (papel, ativa);
CREATE INDEX "Leitura_combustivel_id_idx" ON public."Leitura" USING btree (combustivel_id);
CREATE INDEX "Leitura_data_idx" ON public."Leitura" USING btree (data);
CREATE INDEX idx_leitura_bico_id ON public."Leitura" USING btree (bico_id);
CREATE INDEX idx_leitura_posto ON public."Leitura" USING btree (posto_id);
CREATE INDEX idx_leitura_turno_id ON public."Leitura" USING btree (turno_id);
CREATE INDEX idx_leitura_usuario_id ON public."Leitura" USING btree (usuario_id);
CREATE UNIQUE INDEX leitura_unica_bico_data ON public."Leitura" USING btree (bico_id, data);
CREATE INDEX idx_maquininha_posto ON public."Maquininha" USING btree (posto_id);
CREATE INDEX idx_movimentacao_data ON public."MovimentacaoEstoque" USING btree (data);
CREATE INDEX idx_movimentacao_produto ON public."MovimentacaoEstoque" USING btree (produto_id);
CREATE INDEX idx_movimentacaoestoque_posto ON public."MovimentacaoEstoque" USING btree (posto_id);
CREATE INDEX idx_notafrentista_cliente ON public."NotaFrentista" USING btree (cliente_id);
CREATE INDEX idx_notafrentista_frentista_id ON public."NotaFrentista" USING btree (frentista_id);
CREATE INDEX idx_notafrentista_status ON public."NotaFrentista" USING btree (status);
CREATE INDEX idx_notificacao_fechamento_frentista_id ON public."Notificacao" USING btree (fechamento_frentista_id);
CREATE INDEX idx_notificacao_frentista ON public."Notificacao" USING btree (frentista_id);
CREATE INDEX idx_notificacao_lida ON public."Notificacao" USING btree (lida);
CREATE INDEX idx_notificacao_posto ON public."Notificacao" USING btree (posto_id);
CREATE INDEX idx_notificacao_tipo ON public."Notificacao" USING btree (tipo);
CREATE INDEX idx_parcela_emprestimo_id ON public."Parcela" USING btree (emprestimo_id);
CREATE INDEX idx_produto_categoria ON public."Produto" USING btree (categoria);
CREATE INDEX idx_produto_posto ON public."Produto" USING btree (posto_id);
CREATE INDEX idx_pushtoken_frentista ON public."PushToken" USING btree (frentista_id);
CREATE INDEX idx_pushtoken_token ON public."PushToken" USING btree (expo_push_token);
CREATE INDEX idx_pushtoken_usuario ON public."PushToken" USING btree (usuario_id);
CREATE INDEX idx_recebimento_fechamento_id ON public."Recebimento" USING btree (fechamento_id);
CREATE INDEX idx_recebimento_forma_pagamento_id ON public."Recebimento" USING btree (forma_pagamento_id);
CREATE INDEX idx_recebimento_maquininha_id ON public."Recebimento" USING btree (maquininha_id);
CREATE INDEX idx_tanque_combustivel_id ON public."Tanque" USING btree (combustivel_id);
CREATE INDEX idx_tanque_posto_id ON public."Tanque" USING btree (posto_id);
CREATE INDEX idx_turno_posto ON public."Turno" USING btree (posto_id);
CREATE INDEX idx_usuario_auth_user_id ON public."Usuario" USING btree (auth_user_id);
CREATE INDEX idx_usuarioposto_posto_id ON public."UsuarioPosto" USING btree (posto_id);
CREATE INDEX idx_vendaproduto_fechamento_frentista_id ON public."VendaProduto" USING btree (fechamento_frentista_id);
CREATE INDEX idx_vendaproduto_frentista_id ON public."VendaProduto" USING btree (frentista_id);
CREATE INDEX idx_vendaproduto_produto_id ON public."VendaProduto" USING btree (produto_id);

-- ---------- funções ----------
CREATE OR REPLACE FUNCTION public.abrir_caixa(p_turno_id integer, p_posto_id integer, p_frentista_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_fechamento_id INT;
  v_usuario_id INT;
BEGIN
  -- 1. Buscar o ID do usuário (integer) baseado no email autenticado no JWT do Supabase
  SELECT id INTO v_usuario_id
  FROM public."Usuario"
  WHERE email = (select auth.jwt() ->> 'email')
  AND ativo = true
  LIMIT 1;

  -- Se não encontrar o usuário pelo JWT, tenta pelo frentista_id (como fallback)
  IF v_usuario_id IS NULL THEN
    SELECT u.id INTO v_usuario_id
    FROM public."Usuario" u
    JOIN public."Frentista" f ON f.user_id = (SELECT au.id FROM auth.users au WHERE au.email = (select auth.jwt() ->> 'email'))
    WHERE f.id = p_frentista_id
    LIMIT 1;
  END IF;

  -- 2. Busca fechamento ABERTO de hoje para esse turno e posto
  SELECT id INTO v_fechamento_id
  FROM public."Fechamento"
  WHERE CAST(data AS DATE) = CURRENT_DATE
    AND posto_id = p_posto_id
    AND turno_id = p_turno_id
    AND status = 'ABERTO'
  LIMIT 1;

  -- 3. Se não existe, cria um novo com valores iniciais zerados
  IF v_fechamento_id IS NULL THEN
    INSERT INTO public."Fechamento" (
      data, 
      posto_id, 
      turno_id, 
      status, 
      usuario_id,
      total_vendas,
      total_recebido,
      diferenca
    )
    VALUES (
      CURRENT_TIMESTAMP, 
      p_posto_id, 
      p_turno_id, 
      'ABERTO', 
      v_usuario_id,
      0.00,
      0.00,
      0.00
    )
    RETURNING id INTO v_fechamento_id;
  END IF;

  -- 4. Vincula o frentista ao fechamento se ainda não estiver
  IF NOT EXISTS (
      SELECT 1 FROM public."FechamentoFrentista" 
      WHERE fechamento_id = v_fechamento_id AND frentista_id = p_frentista_id
  ) THEN
      INSERT INTO public."FechamentoFrentista" (
        fechamento_id, 
        frentista_id,
        valor_cartao,
        valor_nota,
        valor_pix,
        valor_dinheiro,
        valor_conferido,
        encerrante,
        baratao,
        diferenca_calculada
      )
      VALUES (
        v_fechamento_id, 
        p_frentista_id,
        0,0,0,0,0,0,0,0
      );
  END IF;

  RETURN jsonb_build_object('fechamento_id', v_fechamento_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_saldo_cliente()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Quando uma nota é criada/atualizada/deletada, recalcula o saldo
    -- IMPORTANTE: Ignora notas sem cliente_id (notas sem cadastro)
    IF TG_OP = 'DELETE' THEN
        -- Apenas atualiza se havia cliente_id
        IF OLD.cliente_id IS NOT NULL THEN
            UPDATE public."Cliente"
            SET saldo_devedor = (
                SELECT COALESCE(SUM(valor), 0)
                FROM public."NotaFrentista"
                WHERE cliente_id = OLD.cliente_id
                AND status = 'pendente'
            )
            WHERE id = OLD.cliente_id;
        END IF;
        RETURN OLD;
    ELSE
        -- Apenas atualiza se há cliente_id
        IF NEW.cliente_id IS NOT NULL THEN
            UPDATE public."Cliente"
            SET saldo_devedor = (
                SELECT COALESCE(SUM(valor), 0)
                FROM public."NotaFrentista"
                WHERE cliente_id = NEW.cliente_id
                AND status = 'pendente'
            )
            WHERE id = NEW.cliente_id;
        END IF;
        RETURN NEW;
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.atualizar_valor_divida()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    -- Atualizar valor_atual e valor_pago da dívida
    UPDATE dividas
    SET 
        valor_pago = (
            SELECT COALESCE(SUM(valor), 0)
            FROM pagamentos
            WHERE divida_id = NEW.divida_id
        ),
        valor_atual = valor_original - (
            SELECT COALESCE(SUM(valor), 0)
            FROM pagamentos
            WHERE divida_id = NEW.divida_id
        ),
        status = CASE
            WHEN valor_original - (
                SELECT COALESCE(SUM(valor), 0)
                FROM pagamentos
                WHERE divida_id = NEW.divida_id
            ) <= 0 THEN 'quitada'
            ELSE status
        END
    WHERE id = NEW.divida_id;
    
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_juros_divida(p_divida_id uuid, p_meses integer DEFAULT 1)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_valor_atual DECIMAL(10,2);
    v_taxa_juros DECIMAL(5,2);
    v_total_juros DECIMAL(10,2);
BEGIN
    SELECT valor_atual, taxa_juros
    INTO v_valor_atual, v_taxa_juros
    FROM dividas
    WHERE id = p_divida_id;
    
    IF v_taxa_juros IS NULL OR v_taxa_juros = 0 THEN
        RETURN 0;
    END IF;
    
    -- Juros compostos
    v_total_juros := v_valor_atual * POWER(1 + (v_taxa_juros / 100), p_meses) - v_valor_atual;
    
    RETURN ROUND(v_total_juros, 2);
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_lucro_fechamento(p_fechamento_id integer)
 RETURNS TABLE(faturamento numeric, custo_total numeric, lucro_bruto numeric, taxas numeric, faltas numeric, lucro_liquido numeric, margem_bruta_pct numeric, margem_liquida_pct numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_data DATE;
    v_total_vendas DECIMAL;
    v_diferenca DECIMAL;
BEGIN
    -- Buscar dados do fechamento
    SELECT f.data::DATE, f.total_vendas, f.diferenca
    INTO v_data, v_total_vendas, v_diferenca
    FROM "Fechamento" f
    WHERE f.id = p_fechamento_id;

    IF v_data IS NULL THEN
        RAISE EXCEPTION 'Fechamento % não encontrado', p_fechamento_id;
    END IF;

    RETURN QUERY
    WITH vendas_combustivel AS (
        -- Calcular vendas por combustível
        SELECT 
            c.id as combustivel_id,
            c.preco_venda,
            c.preco_custo,
            SUM(l.leitura_final - l.leitura_inicial) as litros_vendidos
        FROM "Leitura" l
        JOIN "Bico" b ON l.bico_id = b.id
        JOIN "Combustivel" c ON b.combustivel_id = c.id
        WHERE DATE(l.data) = v_data
        GROUP BY c.id, c.preco_venda, c.preco_custo
    ),
    totais AS (
        SELECT
            SUM(litros_vendidos * preco_venda) as faturamento_calc,
            SUM(litros_vendidos * preco_custo) as custo_calc,
            SUM(litros_vendidos * (preco_venda - preco_custo)) as lucro_bruto_calc
        FROM vendas_combustivel
    ),
    taxas_cartao AS (
        -- Calcular taxas baseado nos valores de cartão dos frentistas
        SELECT COALESCE(
            SUM(
                COALESCE(ff.valor_cartao_credito, 0) * 0.007 +  -- 0.7% crédito
                COALESCE(ff.valor_cartao_debito, 0) * 0.025 +   -- 2.5% débito
                COALESCE(ff.baratao, 0) * 0.019                 -- 1.9% baratão
            ), 0
        ) as taxas_total
        FROM "FechamentoFrentista" ff
        WHERE ff.fechamento_id = p_fechamento_id
    )
    SELECT 
        v_total_vendas as faturamento,
        t.custo_calc as custo_total,
        t.lucro_bruto_calc as lucro_bruto,
        tc.taxas_total as taxas,
        ABS(v_diferenca) as faltas,
        (t.lucro_bruto_calc - tc.taxas_total - ABS(v_diferenca)) as lucro_liquido,
        ROUND((t.lucro_bruto_calc / NULLIF(v_total_vendas, 0) * 100), 2) as margem_bruta_pct,
        ROUND(((t.lucro_bruto_calc - tc.taxas_total - ABS(v_diferenca)) / NULLIF(v_total_vendas, 0) * 100), 2) as margem_liquida_pct
    FROM totais t, taxas_cartao tc;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calcular_vendas_por_fechamento(p_posto_id integer, p_data_inicio date, p_data_fim date)
 RETURNS TABLE(combustivel_id integer, combustivel_nome text, volume_vendido numeric, faturamento_total numeric, lucro_bruto numeric, preco_medio numeric, dias_com_venda integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as combustivel_id,
    c.nome as combustivel_nome,
    COALESCE(SUM(l.litros_vendidos), 0) as volume_vendido,
    COALESCE(SUM(l.valor_total), 0) as faturamento_total,
    COALESCE(SUM(l.litros_vendidos * (l.preco_litro - c.preco_custo)), 0) as lucro_bruto,
    CASE 
      WHEN SUM(l.litros_vendidos) > 0 
      THEN SUM(l.valor_total) / SUM(l.litros_vendidos)
      ELSE 0 
    END as preco_medio,
    COUNT(DISTINCT l.data)::INT as dias_com_venda
  FROM "Combustivel" c
  LEFT JOIN "Leitura" l ON l.combustivel_id = c.id 
    AND l.posto_id = p_posto_id
    AND l.data >= p_data_inicio
    AND l.data <= p_data_fim
  WHERE c.posto_id = p_posto_id
    AND c.ativo = true
  GROUP BY c.id, c.nome, c.preco_custo
  ORDER BY volume_vendido DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.carimba_visto_em()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
    new.visto_em := now();
    return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.dentro_da_janela_de_edicao(quando timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT quando >= DATE '2025-12-31'
     AND quando <  (CURRENT_DATE + INTERVAL '2 days');
$function$;

CREATE OR REPLACE FUNCTION public.dentro_da_janela_de_escrita(quando timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT quando >= DATE '2025-12-31'
     AND quando <  (CURRENT_DATE + INTERVAL '2 days');
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_proprietario(p_posto_id integer, p_data_inicio date, p_data_fim date)
 RETURNS TABLE(total_vendas numeric, lucro_bruto numeric, lucro_liquido numeric, volume_total numeric, custo_taxas numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN QUERY
  WITH
  vendas_periodo AS (
    SELECT
      COALESCE(SUM(l.litros_vendidos), 0) AS vol_total,
      COALESCE(SUM(l.valor_total), 0) AS total_vendas,
      -- `custo_epoca.custo` é o custo de aquisição do MÊS da leitura; o
      -- `preco_custo` do cadastro só entra quando aquele mês não tem compra.
      COALESCE(SUM(
        l.litros_vendidos * (l.preco_litro - COALESCE(custo_epoca.custo, c.preco_custo))
      ), 0) AS luc_bruto
    FROM "Leitura" l
    JOIN "Combustivel" c ON l.combustivel_id = c.id
    LEFT JOIN LATERAL (
      SELECT SUM(cp.valor_total) / NULLIF(SUM(cp.quantidade_litros), 0) AS custo
      FROM "Compra" cp
      WHERE cp.combustivel_id = l.combustivel_id
        AND cp.posto_id = l.posto_id
        AND date_trunc('month', cp.data) = date_trunc('month', l.data)
    ) AS custo_epoca ON TRUE
    WHERE l.posto_id = p_posto_id
      AND l.data >= p_data_inicio
      AND l.data <= p_data_fim
  ),

  despesas_periodo AS (
    SELECT COALESCE(SUM(valor), 0) AS total_despesas
    FROM "Despesa" d
    WHERE d.posto_id = p_posto_id
      AND d.data >= p_data_inicio
      AND d.data <= p_data_fim
  )

  SELECT
    v.total_vendas::numeric,
    v.luc_bruto::numeric,
    -- Taxa de cartão é despesa do mês: lançada, já está em total_despesas.
    (v.luc_bruto - COALESCE(d.total_despesas, 0))::numeric AS lucro_liquido,
    v.vol_total::numeric,
    -- A estimativa chumbada (1,2%/3,5%) morreu; a coluna fica por assinatura.
    0::numeric AS custo_taxas
  FROM vendas_periodo v
  CROSS JOIN despesas_periodo d;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_encerrantes_mensal(p_posto_id integer, p_mes integer, p_ano integer)
 RETURNS TABLE(bico_nome text, combustivel_nome text, leitura_inicial numeric, leitura_final numeric, vendas_registradas numeric, diferenca numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        ('Bico ' || COALESCE(b.numero::text, l.bico_id::text))::text as bico_nome,
        COALESCE(c.nome, 'Combustível')::text as combustivel_nome,
        MIN(l.leitura_inicial) as leitura_inicial,
        MAX(l.leitura_final) as leitura_final,
        SUM(l.litros_vendidos) as vendas_registradas,
        (MAX(l.leitura_final) - MIN(l.leitura_inicial)) - SUM(l.litros_vendidos) as diferenca
    FROM "Leitura" l
    LEFT JOIN "Bico" b ON l.bico_id = b.id
    LEFT JOIN "Combustivel" c ON l.combustivel_id = c.id
    WHERE l.posto_id = p_posto_id
      AND EXTRACT(MONTH FROM l.data) = p_mes
      AND EXTRACT(YEAR FROM l.data) = p_ano
    GROUP BY l.bico_id, b.numero, c.nome
    ORDER BY b.numero;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_fechamento_mensal(p_posto_id integer, p_mes integer, p_ano integer)
 RETURNS TABLE(dia date, volume_total numeric, faturamento_bruto numeric, lucro_bruto numeric, custo_taxas numeric, lucro_liquido numeric, vol_gasolina numeric, vol_aditivada numeric, vol_etanol numeric, vol_diesel numeric, status "StatusFechamento")
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := make_date(p_ano, p_mes, 1);
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  RETURN QUERY
  WITH 
  vendas_dia AS (
    SELECT 
      l.data,
      COALESCE(SUM(l.litros_vendidos), 0) as vol_total,
      COALESCE(SUM(l.valor_total), 0) as fat_bruto,
      -- ✅ CORRIGIDO: Usar preco_custo da tabela
      COALESCE(SUM(l.litros_vendidos * (l.preco_litro - c.preco_custo)), 0) as luc_bruto,
      COALESCE(SUM(CASE WHEN c.nome ILIKE '%GASOLINA%' AND NOT c.nome ILIKE '%ADITIVADA%' THEN l.litros_vendidos ELSE 0 END), 0) as v_gas,
      COALESCE(SUM(CASE WHEN c.nome ILIKE '%ADITIVADA%' THEN l.litros_vendidos ELSE 0 END), 0) as v_adt,
      COALESCE(SUM(CASE WHEN c.nome ILIKE '%ETANOL%' THEN l.litros_vendidos ELSE 0 END), 0) as v_eta,
      COALESCE(SUM(CASE WHEN c.nome ILIKE '%DIESEL%' THEN l.litros_vendidos ELSE 0 END), 0) as v_die
    FROM "Leitura" l
    JOIN "Combustivel" c ON l.combustivel_id = c.id
    WHERE l.posto_id = p_posto_id
      AND l.data >= v_start_date 
      AND l.data <= v_end_date
    GROUP BY l.data
  ),
  
  taxas_dia AS (
    SELECT 
      f.data,
      COALESCE(SUM(
        CASE 
          WHEN fp.nome ILIKE '%DÉBITO%' THEN r.valor * 0.012
          WHEN fp.nome ILIKE '%CRÉDITO%' THEN r.valor * 0.035
          ELSE 0
        END
      ), 0) as custo_taxas
    FROM "Fechamento" f
    LEFT JOIN "Recebimento" r ON r.fechamento_id = f.id
    LEFT JOIN "FormaPagamento" fp ON r.forma_pagamento_id = fp.id
    WHERE f.posto_id = p_posto_id
      AND f.data >= v_start_date
      AND f.data <= v_end_date
    GROUP BY f.data
  ),

  status_dia AS (
    SELECT 
      f.data,
      COALESCE(f.status, 'ABERTO'::"StatusFechamento") as status
    FROM "Fechamento" f
    WHERE f.posto_id = p_posto_id
      AND f.data >= v_start_date
      AND f.data <= v_end_date
  )

  SELECT 
    v.data::DATE,
    v.vol_total,
    v.fat_bruto,
    v.luc_bruto,
    COALESCE(t.custo_taxas, 0),
    (v.luc_bruto - COALESCE(t.custo_taxas, 0)),
    v.v_gas,
    v.v_adt,
    v.v_eta,
    v.v_die,
    COALESCE(s.status, 'ABERTO'::"StatusFechamento")
  FROM vendas_dia v
  LEFT JOIN taxas_dia t ON v.data = t.data
  LEFT JOIN status_dia s ON v.data = s.data
  ORDER BY v.data;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_frentistas_with_email()
 RETURNS TABLE(id integer, nome text, cpf text, telefone text, data_admissao timestamp with time zone, ativo boolean, user_id uuid, turno_id integer, email character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    f.id,
    f.nome,
    f.cpf,
    f.telefone,
    f.data_admissao,
    f.ativo,
    f.user_id,
    f.turno_id,
    u.email::varchar
  FROM "Frentista" f
  LEFT JOIN auth.users u ON f.user_id = u.id
  ORDER BY f.nome;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  new_usuario_id INTEGER;
  nome_extraido TEXT;
BEGIN
  -- 1. Auto-confirmar email para permitir login imediato
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = NEW.id;

  -- Extrai o nome do email
  nome_extraido := split_part(NEW.email, '@', 1);
  nome_extraido := replace(nome_extraido, '.', ' ');
  nome_extraido := initcap(nome_extraido);

  -- 2. Criar ou Vincular registro na tabela Usuario
  INSERT INTO public."Usuario" (email, nome, role, ativo, auth_user_id)
  VALUES (
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', nome_extraido),
    'FRENTISTA',
    true,
    NEW.id
  )
  ON CONFLICT (email) DO UPDATE
  SET auth_user_id = NEW.id -- Link existing user to new auth record
  RETURNING id INTO new_usuario_id;

  -- 3. Criar registro na tabela Frentista
  -- Checks if frentista already exists for this user_id to prevent duplicates
  IF NOT EXISTS (SELECT 1 FROM public."Frentista" WHERE user_id = NEW.id) THEN
      INSERT INTO public."Frentista" (
        nome,
        cpf,
        telefone,
        user_id,
        ativo,
        data_admissao
      )
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'nome', nome_extraido),
        COALESCE(NEW.raw_user_meta_data->>'cpf', 
          lpad(floor(random() * 999)::text, 3, '0') || '.' || 
          lpad(floor(random() * 999)::text, 3, '0') || '.' || 
          lpad(floor(random() * 999)::text, 3, '0') || '-' || 
          lpad(floor(random() * 99)::text, 2, '0')
        ),
        COALESCE(NEW.raw_user_meta_data->>'telefone', '(00) 00000-0000'),
        NEW.id,
        true,
        NOW()
      );
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.projetar_quitacao(p_divida_id uuid, p_pagamento_mensal numeric)
 RETURNS TABLE(meses_necessarios integer, total_a_pagar numeric, total_juros numeric)
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
    v_valor_atual DECIMAL(10,2);
    v_taxa_juros DECIMAL(5,2);
    v_meses INTEGER := 0;
    v_saldo DECIMAL(10,2);
    v_total_pago DECIMAL(10,2) := 0;
BEGIN
    SELECT valor_atual, COALESCE(taxa_juros, 0)
    INTO v_valor_atual, v_taxa_juros
    FROM dividas
    WHERE id = p_divida_id;
    
    v_saldo := v_valor_atual;
    
    WHILE v_saldo > 0 AND v_meses < 1000 LOOP
        v_meses := v_meses + 1;
        v_saldo := v_saldo * (1 + v_taxa_juros / 100);
        v_saldo := v_saldo - p_pagamento_mensal;
        v_total_pago := v_total_pago + LEAST(p_pagamento_mensal, v_saldo + p_pagamento_mensal);
    END LOOP;
    
    RETURN QUERY SELECT 
        v_meses,
        v_total_pago,
        v_total_pago - v_valor_atual;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reconciliar_estoque_vendas(p_posto_id integer, p_data_inicio date, p_data_fim date)
 RETURNS TABLE(combustivel_id integer, combustivel_nome text, estoque_inicial numeric, compras_periodo numeric, vendas_periodo numeric, estoque_teorico numeric, estoque_real numeric, divergencia numeric, divergencia_percent numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  WITH 
  estoque_inicio AS (
    SELECT 
      e.combustivel_id as comb_id,
      e.quantidade_atual as qtd_inicial
    FROM "Estoque" e
    WHERE e.posto_id = p_posto_id
  ),
  
  compras AS (
    SELECT 
      cp.combustivel_id as comb_id,
      COALESCE(SUM(cp.quantidade_litros), 0) as qtd_comprada
    FROM "Compra" cp
    WHERE cp.posto_id = p_posto_id
      AND cp.data >= p_data_inicio
      AND cp.data <= p_data_fim
    GROUP BY cp.combustivel_id
  ),
  
  vendas AS (
    SELECT 
      l.combustivel_id as comb_id,
      COALESCE(SUM(l.litros_vendidos), 0) as qtd_vendida
    FROM "Leitura" l
    WHERE l.posto_id = p_posto_id
      AND l.data >= p_data_inicio
      AND l.data <= p_data_fim
    GROUP BY l.combustivel_id
  ),
  
  estoque_atual AS (
    SELECT 
      e.combustivel_id as comb_id,
      e.quantidade_atual as qtd_atual
    FROM "Estoque" e
    WHERE e.posto_id = p_posto_id
  )
  
  SELECT 
    c.id,
    c.nome,
    COALESCE(ei.qtd_inicial, 0),
    COALESCE(comp.qtd_comprada, 0),
    COALESCE(v.qtd_vendida, 0),
    COALESCE(ei.qtd_inicial, 0) + COALESCE(comp.qtd_comprada, 0) - COALESCE(v.qtd_vendida, 0),
    COALESCE(ea.qtd_atual, 0),
    COALESCE(ea.qtd_atual, 0) - (COALESCE(ei.qtd_inicial, 0) + COALESCE(comp.qtd_comprada, 0) - COALESCE(v.qtd_vendida, 0)),
    CASE 
      WHEN (COALESCE(ei.qtd_inicial, 0) + COALESCE(comp.qtd_comprada, 0)) > 0
      THEN ((COALESCE(ea.qtd_atual, 0) - (COALESCE(ei.qtd_inicial, 0) + COALESCE(comp.qtd_comprada, 0) - COALESCE(v.qtd_vendida, 0))) 
            / (COALESCE(ei.qtd_inicial, 0) + COALESCE(comp.qtd_comprada, 0))) * 100
      ELSE 0
    END
  FROM "Combustivel" c
  LEFT JOIN estoque_inicio ei ON ei.comb_id = c.id
  LEFT JOIN compras comp ON comp.comb_id = c.id
  LEFT JOIN vendas v ON v.comb_id = c.id
  LEFT JOIN estoque_atual ea ON ea.comb_id = c.id
  WHERE c.posto_id = p_posto_id
    AND c.ativo = true
  ORDER BY c.nome;
END;
$function$;

CREATE OR REPLACE FUNCTION public.registra_auditoria()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public."AuditoriaDados" (tabela, operacao, registro_id, dados_antes, dados_depois)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(OLD) ->> 'id', to_jsonb(OLD), NULL);

  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public."AuditoriaDados" (tabela, operacao, registro_id, dados_antes, dados_depois)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(NEW) ->> 'id', to_jsonb(OLD), to_jsonb(NEW));

  ELSE
    INSERT INTO public."AuditoriaDados" (tabela, operacao, registro_id, dados_antes, dados_depois)
    VALUES (TG_TABLE_NAME, TG_OP, to_jsonb(NEW) ->> 'id', NULL, to_jsonb(NEW));
  END IF;

  RETURN NULL;
END $function$;

CREATE OR REPLACE FUNCTION public.update_pushtoken_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.user_has_posto_access(p_posto_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Se posto_id for NULL, permitir (compatibilidade com dados legados)
  IF p_posto_id IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Admin Access (verifica role ADMIN)
  IF EXISTS (
    SELECT 1 FROM "Usuario" 
    WHERE id = auth.uid()::text::integer 
    AND role = 'ADMIN'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Posto Access (verifica se usuário tem acesso ao posto)
  RETURN EXISTS (
    SELECT 1 FROM "UsuarioPosto"
    WHERE usuario_id = auth.uid()::text::integer
    AND posto_id = p_posto_id
    AND ativo = true
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.verificar_caixa_aberto(p_frentista_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_fechamento_id INT;
  v_turno_nome TEXT;
  v_turno_id INT;
BEGIN
  SELECT f.id, t.nome, t.id INTO v_fechamento_id, v_turno_nome, v_turno_id
  FROM public."FechamentoFrentista" ff
  JOIN public."Fechamento" f ON f.id = ff.fechamento_id
  JOIN public."Turno" t ON t.id = f.turno_id
  WHERE ff.frentista_id = p_frentista_id
    AND CAST(f.data AS DATE) = CURRENT_DATE  -- Corrigido para comparar apenas a data
    AND f.status = 'ABERTO'
  LIMIT 1;

  IF v_fechamento_id IS NOT NULL THEN
    RETURN jsonb_build_object(
        'aberto', true, 
        'fechamento_id', v_fechamento_id, 
        'turno', v_turno_nome,
        'turno_id', v_turno_id
    );
  ELSE
    RETURN jsonb_build_object('aberto', false);
  END IF;
END;
$function$;

-- ---------- views ----------
CREATE VIEW public."frentistas" WITH (security_invoker=on) AS
 SELECT id,
    nome,
    ativo,
    posto_id,
    turno_id
   FROM "Frentista";
CREATE VIEW public."vw_lucro_periodo" WITH (security_invoker=on) AS
 SELECT date(data) AS data,
    posto_id,
    total_vendas AS receita_bruta,
    custo_combustiveis,
    lucro_bruto,
    taxas_pagamento,
    abs(diferenca) AS faltas,
    lucro_liquido,
    margem_bruta_percentual,
    margem_liquida_percentual
   FROM "Fechamento" f
  WHERE total_vendas > 0::numeric;

-- ---------- triggers ----------
CREATE TRIGGER update_cliente_updated_at BEFORE UPDATE ON public."Cliente" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER audita_fechamento AFTER DELETE OR UPDATE ON public."Fechamento" FOR EACH ROW EXECUTE FUNCTION registra_auditoria();
CREATE TRIGGER audita_fechamento_frentista AFTER DELETE OR UPDATE ON public."FechamentoFrentista" FOR EACH ROW EXECUTE FUNCTION registra_auditoria();
CREATE TRIGGER audita_leitura AFTER DELETE OR UPDATE ON public."Leitura" FOR EACH ROW EXECUTE FUNCTION registra_auditoria();
CREATE TRIGGER trigger_atualizar_saldo_cliente AFTER INSERT OR DELETE OR UPDATE ON public."NotaFrentista" FOR EACH ROW EXECUTE FUNCTION atualizar_saldo_cliente();
CREATE TRIGGER update_notafrentista_updated_at BEFORE UPDATE ON public."NotaFrentista" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER carimba_visto_em BEFORE INSERT OR UPDATE ON public."PresencaFrentista" FOR EACH ROW EXECUTE FUNCTION carimba_visto_em();
CREATE TRIGGER trigger_pushtoken_updated_at BEFORE UPDATE ON public."PushToken" FOR EACH ROW EXECUTE FUNCTION update_pushtoken_updated_at();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------- RLS ----------
ALTER TABLE public."AuditoriaDados" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Bico" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Bomba" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CarteiraBaratencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CategoriaFinanceira" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Cliente" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ClienteBaratencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Combustivel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Compra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Configuracao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Despesa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Divida" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Emprestimo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Escala" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Estoque" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Fechamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FechamentoFrentista" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."FormaPagamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Fornecedor" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Frentista" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."HistoricoTanque" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."InscricaoPush" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Leitura" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Maquininha" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MovimentacaoEstoque" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."NotaFrentista" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Notificacao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Parcela" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Posto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PresencaFrentista" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Produto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PromocaoBaratencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PushToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Recebimento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Receita" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tanque" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TokenAbastecimento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TransacaoBaratencia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Turno" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UsuarioPosto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."VendaProduto" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."frentistas_old_backup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ganhos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."parcelas" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir tudo para usuários autenticados" ON "Bico" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir leitura anonima Bico" ON "Bico" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Bomba" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir leitura anonima Bomba" ON "Bomba" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Allow all for CategoriaFinanceira" ON "CategoriaFinanceira" FOR ALL TO public
    USING (true);
CREATE POLICY "Enable ALL for anon on Cliente" ON "Cliente" FOR ALL TO anon
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated on Cliente" ON "Cliente" FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on Cliente" ON "Cliente" FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Combustivel" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir leitura anonima Combustivel" ON "Combustivel" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Compra" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Allow all for Configuracao" ON "Configuracao" FOR ALL TO public
    USING (true);
CREATE POLICY "Permitir leitura anônima Configuracao" ON "Configuracao" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Allow all access to authenticated users on Despesa" ON "Despesa" FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Despesa: Permitir inserção para anon" ON "Despesa" FOR INSERT TO anon
    WITH CHECK (true);
CREATE POLICY "Despesa: Permitir inserção para autenticados" ON "Despesa" FOR INSERT TO authenticated
    WITH CHECK (true);
CREATE POLICY "Despesa: Permitir deleção para autenticados" ON "Despesa" FOR DELETE TO authenticated
    USING (true);
CREATE POLICY "despesa_delete_janela_edicao" ON "Despesa" FOR DELETE TO anon
    USING (dentro_da_janela_de_edicao((data)::timestamp with time zone));
CREATE POLICY "Despesa: Permitir leitura para anon" ON "Despesa" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Despesa: Permitir leitura para autenticados" ON "Despesa" FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Despesa: Permitir atualização para anon" ON "Despesa" FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Despesa: Permitir atualização para autenticados" ON "Despesa" FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Divida" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Emprestimo" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Allow all" ON "Escala" FOR ALL TO public
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Permitir modificacao Escala para autenticados" ON "Escala" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Estoque" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir leitura anônima Estoque" ON "Estoque" FOR SELECT TO anon
    USING (true);
CREATE POLICY "fechamento_insert_janela_7d" ON "Fechamento" FOR INSERT TO anon, authenticated
    WITH CHECK (dentro_da_janela_de_escrita(data));
CREATE POLICY "Permitir tudo para usuários autenticados_delete" ON "Fechamento" FOR DELETE TO authenticated
    USING (true);
CREATE POLICY "Permitir leitura anonima Fechamento" ON "Fechamento" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados_select" ON "Fechamento" FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "fechamento_update_janela_edicao" ON "Fechamento" FOR UPDATE TO anon, authenticated
    USING (dentro_da_janela_de_edicao(data))
    WITH CHECK (dentro_da_janela_de_edicao(data));
CREATE POLICY "fechamento_frentista_insert_janela_7d" ON "FechamentoFrentista" FOR INSERT TO anon, authenticated
    WITH CHECK ((EXISTS ( SELECT 1
   FROM "Fechamento" f
  WHERE ((f.id = "FechamentoFrentista".fechamento_id) AND dentro_da_janela_de_escrita(f.data)))));
CREATE POLICY "FechamentoFrentista delete policy" ON "FechamentoFrentista" FOR DELETE TO authenticated
    USING (user_has_posto_access(posto_id));
CREATE POLICY "Permitir tudo para usuários autenticados_delete" ON "FechamentoFrentista" FOR DELETE TO authenticated
    USING (true);
CREATE POLICY "fechamento_frentista_delete_janela_edicao" ON "FechamentoFrentista" FOR DELETE TO anon
    USING ((EXISTS ( SELECT 1
   FROM "Fechamento" f
  WHERE ((f.id = "FechamentoFrentista".fechamento_id) AND dentro_da_janela_de_edicao(f.data)))));
CREATE POLICY "Enable All for Anon on FechamentoFrentista_select" ON "FechamentoFrentista" FOR SELECT TO anon
    USING (true);
CREATE POLICY "FechamentoFrentista select policy" ON "FechamentoFrentista" FOR SELECT TO authenticated
    USING (user_has_posto_access(posto_id));
CREATE POLICY "Permitir tudo para usuários autenticados_select" ON "FechamentoFrentista" FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "fechamento_frentista_update_janela_edicao" ON "FechamentoFrentista" FOR UPDATE TO anon, authenticated
    USING ((EXISTS ( SELECT 1
   FROM "Fechamento" f
  WHERE ((f.id = "FechamentoFrentista".fechamento_id) AND dentro_da_janela_de_edicao(f.data)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM "Fechamento" f
  WHERE ((f.id = "FechamentoFrentista".fechamento_id) AND dentro_da_janela_de_edicao(f.data)))));
CREATE POLICY "Permitir tudo para usuários autenticados" ON "FormaPagamento" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir leitura anonima FormaPagamento" ON "FormaPagamento" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Fornecedor" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir INSERT aberto para frentistas" ON "Frentista" FOR INSERT TO anon, authenticated
    WITH CHECK (true);
CREATE POLICY "Usuários podem criar seu próprio perfil de frentista" ON "Frentista" FOR INSERT TO public
    WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));
CREATE POLICY "Usuarios autenticados podem deletar frentistas" ON "Frentista" FOR DELETE TO authenticated
    USING (true);
CREATE POLICY "Acesso publico de leitura aos frentistas" ON "Frentista" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Usuarios autenticados podem ver frentistas" ON "Frentista" FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Enable Update for Anon on Frentista" ON "Frentista" FOR UPDATE TO anon
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Usuarios autenticados podem atualizar frentistas" ON "Frentista" FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Escrita só de usuário autenticado" ON "HistoricoTanque" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
    WITH CHECK ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "historico_tanque_insert_janela" ON "HistoricoTanque" FOR INSERT TO anon, authenticated
    WITH CHECK (((tanque_id IS NOT NULL) AND (volume_fisico IS NOT NULL) AND (volume_fisico >= (0)::numeric) AND dentro_da_janela_de_escrita((data)::timestamp with time zone)));
CREATE POLICY "Permitir leitura anonima HistoricoTanque" ON "HistoricoTanque" FOR SELECT TO anon
    USING (true);
CREATE POLICY "historico_tanque_update_janela" ON "HistoricoTanque" FOR UPDATE TO anon, authenticated
    USING (dentro_da_janela_de_edicao((data)::timestamp with time zone))
    WITH CHECK (((tanque_id IS NOT NULL) AND (volume_fisico >= (0)::numeric) AND dentro_da_janela_de_edicao((data)::timestamp with time zone)));
CREATE POLICY "Anon pode se inscrever no push" ON "InscricaoPush" FOR INSERT TO anon
    WITH CHECK (true);
CREATE POLICY "leitura_insert_janela_7d" ON "Leitura" FOR INSERT TO anon, authenticated
    WITH CHECK (dentro_da_janela_de_escrita(data));
CREATE POLICY "leitura_delete_janela_7d" ON "Leitura" FOR DELETE TO anon, authenticated
    USING (dentro_da_janela_de_escrita(data));
CREATE POLICY "leitura_select_anon" ON "Leitura" FOR SELECT TO anon, authenticated
    USING (true);
CREATE POLICY "leitura_update_janela_edicao" ON "Leitura" FOR UPDATE TO anon, authenticated
    USING (dentro_da_janela_de_edicao(data))
    WITH CHECK (dentro_da_janela_de_edicao(data));
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Maquininha" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir leitura anônima Maquininha" ON "Maquininha" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "MovimentacaoEstoque" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Enable ALL for anon on NotaFrentista" ON "NotaFrentista" FOR ALL TO anon
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Enable ALL for authenticated on NotaFrentista" ON "NotaFrentista" FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Enable ALL for service_role on NotaFrentista" ON "NotaFrentista" FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Users can insert notifications" ON "Notificacao" FOR INSERT TO public
    WITH CHECK (true);
CREATE POLICY "Users can view notifications" ON "Notificacao" FOR SELECT TO public
    USING (true);
CREATE POLICY "Users can update notifications" ON "Notificacao" FOR UPDATE TO public
    USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Parcela" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Authenticated Insert Posto" ON "Posto" FOR INSERT TO public
    WITH CHECK ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Authenticated Delete Posto" ON "Posto" FOR DELETE TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir leitura anonima Posto" ON "Posto" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Public Read Posto" ON "Posto" FOR SELECT TO public
    USING (true);
CREATE POLICY "Authenticated Update Posto" ON "Posto" FOR UPDATE TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "presenca_insert_anon" ON "PresencaFrentista" FOR INSERT TO anon, authenticated
    WITH CHECK (true);
CREATE POLICY "presenca_select_anon" ON "PresencaFrentista" FOR SELECT TO anon, authenticated
    USING (true);
CREATE POLICY "presenca_update_anon" ON "PresencaFrentista" FOR UPDATE TO anon, authenticated
    USING (true)
    WITH CHECK (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Produto" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Users can insert own tokens" ON "PushToken" FOR INSERT TO public
    WITH CHECK ((((usuario_id IS NULL) OR (usuario_id IN ( SELECT "Usuario".id
   FROM "Usuario"
  WHERE ("Usuario".auth_user_id = auth.uid())))) AND ((frentista_id IS NULL) OR (frentista_id IN ( SELECT "Frentista".id
   FROM "Frentista"
  WHERE ("Frentista".user_id = auth.uid()))))));
CREATE POLICY "Users can delete own tokens" ON "PushToken" FOR DELETE TO public
    USING (((usuario_id IN ( SELECT "Usuario".id
   FROM "Usuario"
  WHERE ("Usuario".auth_user_id = auth.uid()))) OR (frentista_id IN ( SELECT "Frentista".id
   FROM "Frentista"
  WHERE ("Frentista".user_id = auth.uid())))));
CREATE POLICY "Users can view own tokens" ON "PushToken" FOR SELECT TO public
    USING (((usuario_id IN ( SELECT "Usuario".id
   FROM "Usuario"
  WHERE ("Usuario".auth_user_id = auth.uid()))) OR (frentista_id IN ( SELECT "Frentista".id
   FROM "Frentista"
  WHERE ("Frentista".user_id = auth.uid())))));
CREATE POLICY "recebimento_insert_janela_7d" ON "Recebimento" FOR INSERT TO anon, authenticated
    WITH CHECK ((EXISTS ( SELECT 1
   FROM "Fechamento" f
  WHERE ((f.id = "Recebimento".fechamento_id) AND dentro_da_janela_de_escrita(f.data)))));
CREATE POLICY "Permitir tudo para usuários autenticados_delete" ON "Recebimento" FOR DELETE TO authenticated
    USING (true);
CREATE POLICY "Recebimento delete policy" ON "Recebimento" FOR DELETE TO authenticated
    USING ((EXISTS ( SELECT 1
   FROM "Fechamento" f
  WHERE ((f.id = "Recebimento".fechamento_id) AND user_has_posto_access(f.posto_id)))));
CREATE POLICY "recebimento_delete_janela_edicao" ON "Recebimento" FOR DELETE TO anon
    USING ((EXISTS ( SELECT 1
   FROM "Fechamento" f
  WHERE ((f.id = "Recebimento".fechamento_id) AND dentro_da_janela_de_edicao(f.data)))));
CREATE POLICY "Permitir leitura anônima Recebimento" ON "Recebimento" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados_select" ON "Recebimento" FOR SELECT TO authenticated
    USING (true);
CREATE POLICY "Recebimento select policy" ON "Recebimento" FOR SELECT TO authenticated
    USING ((EXISTS ( SELECT 1
   FROM "Fechamento" f
  WHERE ((f.id = "Recebimento".fechamento_id) AND user_has_posto_access(f.posto_id)))));
CREATE POLICY "recebimento_update_janela_edicao" ON "Recebimento" FOR UPDATE TO anon, authenticated
    USING ((EXISTS ( SELECT 1
   FROM "Fechamento" f
  WHERE ((f.id = "Recebimento".fechamento_id) AND dentro_da_janela_de_edicao(f.data)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM "Fechamento" f
  WHERE ((f.id = "Recebimento".fechamento_id) AND dentro_da_janela_de_edicao(f.data)))));
CREATE POLICY "Allow all for Receita" ON "Receita" FOR ALL TO public
    USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Tanque" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir leitura anonima Tanque" ON "Tanque" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Turno" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Enable Select for Anon on Turno" ON "Turno" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Permitir tudo para usuários autenticados" ON "Usuario" FOR ALL TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Enable Select for Anon on Usuario" ON "Usuario" FOR SELECT TO anon
    USING (true);
CREATE POLICY "Allow authenticated users to read usuario_posto" ON "UsuarioPosto" FOR SELECT TO public
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir insert VendaProduto para autenticados" ON "VendaProduto" FOR INSERT TO public
    WITH CHECK ((( SELECT auth.role() AS role) = 'authenticated'::text));
CREATE POLICY "Permitir leitura VendaProduto para todos" ON "VendaProduto" FOR SELECT TO public
    USING (true);
CREATE POLICY "Public read access" ON frentistas_old_backup FOR SELECT TO public
    USING (true);
CREATE POLICY "acesso publico ganhos" ON ganhos FOR ALL TO public
    USING (true)
    WITH CHECK (true);
CREATE POLICY "acesso publico parcelas" ON parcelas FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- ---------- grants ----------
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."AuditoriaDados" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."AuditoriaDados_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Bico" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Bico" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Bico" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Bico_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Bico_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Bico_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Bomba" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Bomba" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Bomba" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Bomba_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Bomba_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Bomba_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."CarteiraBaratencia" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."CarteiraBaratencia_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."CarteiraBaratencia_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."CarteiraBaratencia_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."CategoriaFinanceira" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."CategoriaFinanceira" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."CategoriaFinanceira" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."CategoriaFinanceira_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."CategoriaFinanceira_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."CategoriaFinanceira_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Cliente" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Cliente" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Cliente" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ClienteBaratencia" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."ClienteBaratencia_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."ClienteBaratencia_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."ClienteBaratencia_id_seq" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Cliente_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Cliente_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Cliente_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Combustivel" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Combustivel" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Combustivel" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Combustivel_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Combustivel_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Combustivel_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Compra" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Compra" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Compra" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Compra_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Compra_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Compra_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Configuracao" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Configuracao" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Configuracao" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Configuracao_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Configuracao_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Configuracao_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Despesa" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Despesa" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Despesa" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Despesa_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Despesa_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Despesa_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Divida" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Divida" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Divida" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Divida_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Divida_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Divida_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Emprestimo" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Emprestimo" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Emprestimo" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Emprestimo_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Emprestimo_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Emprestimo_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Escala" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Escala" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Escala" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Escala_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Escala_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Escala_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Estoque" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Estoque" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Estoque" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Estoque_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Estoque_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Estoque_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Fechamento" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Fechamento" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Fechamento" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."FechamentoFrentista" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."FechamentoFrentista" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."FechamentoFrentista" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."FechamentoFrentista_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."FechamentoFrentista_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."FechamentoFrentista_id_seq" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Fechamento_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Fechamento_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Fechamento_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."FormaPagamento" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."FormaPagamento" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."FormaPagamento" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."FormaPagamento_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."FormaPagamento_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."FormaPagamento_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Fornecedor" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Fornecedor" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Fornecedor" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Fornecedor_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Fornecedor_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Fornecedor_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Frentista" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Frentista" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Frentista" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Frentista_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Frentista_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Frentista_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."HistoricoTanque" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."HistoricoTanque" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."HistoricoTanque" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."HistoricoTanque_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."HistoricoTanque_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."HistoricoTanque_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."InscricaoPush" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."InscricaoPush" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."InscricaoPush" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."InscricaoPush_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."InscricaoPush_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."InscricaoPush_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Leitura" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Leitura" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Leitura" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Leitura_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Leitura_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Leitura_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Maquininha" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Maquininha" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Maquininha" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Maquininha_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Maquininha_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Maquininha_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."MovimentacaoEstoque" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."MovimentacaoEstoque" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."MovimentacaoEstoque" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."MovimentacaoEstoque_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."MovimentacaoEstoque_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."MovimentacaoEstoque_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."NotaFrentista" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."NotaFrentista" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."NotaFrentista" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."NotaFrentista_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."NotaFrentista_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."NotaFrentista_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Notificacao" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Notificacao" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Notificacao" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Notificacao_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Notificacao_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Notificacao_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Parcela" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Parcela" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Parcela" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Parcela_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Parcela_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Parcela_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Posto" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Posto" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Posto" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Posto_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Posto_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Posto_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."PresencaFrentista" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."PresencaFrentista" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."PresencaFrentista" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Produto" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Produto" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Produto" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Produto_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Produto_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Produto_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."PromocaoBaratencia" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."PromocaoBaratencia_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."PromocaoBaratencia_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."PromocaoBaratencia_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."PushToken" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."PushToken" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."PushToken" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."PushToken_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."PushToken_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."PushToken_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Recebimento" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Recebimento" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Recebimento" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Recebimento_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Recebimento_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Recebimento_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Receita" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Receita" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Receita" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Receita_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Receita_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Receita_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Tanque" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Tanque" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Tanque" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Tanque_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Tanque_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Tanque_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."TokenAbastecimento" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."TokenAbastecimento_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."TokenAbastecimento_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."TokenAbastecimento_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."TransacaoBaratencia" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."TransacaoBaratencia_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."TransacaoBaratencia_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."TransacaoBaratencia_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Turno" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Turno" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Turno" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Turno_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Turno_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Turno_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Usuario" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Usuario" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."Usuario" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."UsuarioPosto" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."UsuarioPosto" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."UsuarioPosto" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."UsuarioPosto_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."UsuarioPosto_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."UsuarioPosto_id_seq" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Usuario_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Usuario_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."Usuario_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."VendaProduto" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."VendaProduto" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."VendaProduto" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."VendaProduto_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."VendaProduto_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."VendaProduto_id_seq" TO service_role;
GRANT MAINTAIN, SELECT ON TABLE public."frentistas" TO anon;
GRANT MAINTAIN, SELECT ON TABLE public."frentistas" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."frentistas" TO service_role;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."frentistas_id_seq" TO anon;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."frentistas_id_seq" TO authenticated;
GRANT SELECT, UPDATE, USAGE ON SEQUENCE public."frentistas_id_seq" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."frentistas_old_backup" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."frentistas_old_backup" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."frentistas_old_backup" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ganhos" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ganhos" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."ganhos" TO service_role;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."parcelas" TO anon;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."parcelas" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."parcelas" TO service_role;
GRANT MAINTAIN, SELECT ON TABLE public."vw_lucro_periodo" TO anon;
GRANT MAINTAIN, SELECT ON TABLE public."vw_lucro_periodo" TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public."vw_lucro_periodo" TO service_role;

-- ---------- publicação do realtime (só documenta o que o Supabase ouvia) ----------
CREATE PUBLICATION supabase_realtime FOR TABLE public."Fechamento", public."FechamentoFrentista", public."Leitura";
