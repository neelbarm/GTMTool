FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
COPY lib ./lib
COPY public ./public
COPY scripts ./scripts
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data TRUST_PROXY=1
VOLUME ["/data"]
EXPOSE 3000
CMD ["sh", "-c", "node --no-warnings scripts/seed.js && node --no-warnings server.js"]
