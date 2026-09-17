# Backend Laravel do Posto Providência — imagem de DESENVOLVIMENTO.
# Produção (cutover, #105) ganha imagem própria com php-fpm + nginx; aqui é `artisan serve`
# com o código montado por volume, para o ciclo editar → recarregar sem rebuild.
FROM php:8.5-cli-alpine

RUN apk add --no-cache postgresql-dev icu-dev libzip-dev \
    && docker-php-ext-install pdo_pgsql pgsql intl zip pcntl \
    && rm -rf /tmp/pear

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /app
EXPOSE 8000
# `php -S` em vez de `artisan serve`: o ServeCommand recria o ambiente do worker só com uma
# lista fixa de variáveis (APP_ENV, XDEBUG_*, PATH…) e descarta DB_HOST & cia. — o worker então
# lia o 127.0.0.1:5433 do .env em vez do `postgres` do compose. O servidor embutido do PHP
# respeita o ambiente real, e o Dotenv do Laravel é imutável (não sobrescreve o que já existe).
CMD ["php", "-S", "0.0.0.0:8000", "-t", "public", "public/index.php"]
