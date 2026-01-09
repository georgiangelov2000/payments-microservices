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
    ca-certificates \
    gnupg \
    && docker-php-ext-install pdo pdo_pgsql

# -------------------------
# Install Node.js (LTS) properly
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

# Copy Laravel source
COPY . .

# -------------------------
# Expose PHP-FPM port
# -------------------------
EXPOSE 9000

# -------------------------
# Start PHP-FPM
# -------------------------
CMD ["php-fpm"]
