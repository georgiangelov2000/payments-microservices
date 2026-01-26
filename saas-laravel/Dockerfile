FROM php:8.3-fpm

# -------------------------
# System dependencies
# -------------------------
RUN apt-get update && apt-get install -y \
    git \
    curl \
    zip \
    unzip \
    libpq-dev \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# -------------------------
# PHP extensions
# -------------------------
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install \
        pdo \
        pdo_pgsql \
        zip \
        gd \
        pcntl

RUN pecl install redis \
    && docker-php-ext-enable redis        

# -------------------------
# Install Node.js 20 (LTS)
# -------------------------
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# -------------------------
# Composer
# -------------------------
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# -------------------------
# App directory
# -------------------------
WORKDIR /var/www

COPY . .

# -------------------------
# Expose PHP-FPM
# -------------------------
EXPOSE 9000

CMD ["php-fpm"]
