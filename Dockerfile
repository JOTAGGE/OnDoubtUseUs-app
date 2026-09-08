# Dockerfile Hardened para o backend do On Doubt, Use Us :)
FROM node:22-slim

# Instala ffmpeg e python3 (necessários para o yt-dlp e conversão de áudio)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cria usuário e grupo não-privilegiados com UID/GID fixos
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/false -m appuser

# Copia manifestos de pacotes
COPY package*.json ./

# Instala apenas dependências de produção necessárias para o servidor
RUN npm install --omit=dev && npm cache clean --force

# Copia o código do servidor
COPY local-server.mjs ./

# Cria diretório de downloads com permissões estritas para o usuário não-root
RUN mkdir -p /app/downloads && chown -R appuser:appgroup /app/downloads /app

# Configura variáveis de ambiente padrão para container
ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0
ENV CORS_ORIGIN=*
ENV DOWNLOAD_DIR=/app/downloads
ENV MAX_CONCURRENT_JOBS=2
ENV MAX_PLAYLIST_ITEMS=30
ENV MIN_FREE_DISK_MB=500
ENV DOWNLOADS_ENABLED=true

# Troca para usuário sem privilégios (nunca rodar como root)
USER appuser

EXPOSE 8787

CMD ["node", "local-server.mjs"]
