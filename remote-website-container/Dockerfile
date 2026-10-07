FROM alpine:latest

# Install required packages
RUN apk update && apk add \
    vsftpd \
    nginx \
    php83 \
    php83-fpm \
    php83-opcache \
    php83-json \
    php83-mysqli \
    php83-mbstring \
    php83-session \
    php83-zlib \
    php83-curl \
    php83-phar \
    php83-dom \
    php83-fileinfo \
    php83-gd \
    php83-zip \
    php83-sqlite3 \
    php83-openssl \
    supervisor \
    shadow \
    openssl \
    gettext # For envsubst

# Create shared group and configure users
RUN addgroup -g 1000 www_shared && \
    mkdir -p /var/www/html && \
    adduser -D -h /var/www/html -G www_shared -s /bin/false allsky && \
    adduser nginx www_shared && \
    chown allsky:www_shared /var/www/html && \
    chmod 2775 /var/www/html

# Use configuration template
COPY vsftpd.conf.template /etc/vsftpd/
COPY entrypoint.sh /entrypoint.sh

# Configure other services
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisord.conf

# Copy Initial index.html
COPY index.html /var/www/html/index.html

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]