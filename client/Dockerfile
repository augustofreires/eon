# Multi-stage build
FROM node:20-alpine AS builder

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --silent

# Copiar código fonte
COPY . .

# Argumentos de build
ARG REACT_APP_API_URL=http://localhost:5001

# Build da aplicação
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Estágio de produção com Nginx
FROM nginx:1.25-alpine

# Copiar configuração customizada do Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar arquivos buildados do React
COPY --from=builder /app/build /usr/share/nginx/html

# Criar script de entrada para substituir variáveis de ambiente
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'envsubst < /usr/share/nginx/html/index.html > /tmp/index.html' >> /docker-entrypoint.sh && \
    echo 'cp /tmp/index.html /usr/share/nginx/html/index.html' >> /docker-entrypoint.sh && \
    echo 'nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Expor porta 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:80 || exit 1

# Comando para iniciar Nginx
ENTRYPOINT ["/docker-entrypoint.sh"]