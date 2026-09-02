# Production image: Express API + built Vue admin SPA + marketing website
FROM node:22-alpine AS base
WORKDIR /app
# Prisma needs OpenSSL on Alpine to resolve the correct engine binary
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
# prisma CLI is a devDependency; skip postinstall (prisma generate) here
RUN npm ci --omit=dev --ignore-scripts

FROM base AS build
ARG BASE_URL=http://localhost:3000
ENV BASE_URL=${BASE_URL}
COPY package.json package-lock.json ./
# Schema must exist before npm ci — package.json postinstall runs `prisma generate`
COPY db ./db
# Do not set NODE_ENV=production before npm ci — that skips devDependencies
# (vue-cli-service, sass-loader, etc.) required to build the SPA.
RUN npm ci
COPY . .
RUN npx prisma generate
ENV NODE_ENV=production
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV SERVE_ADMIN_STATIC=1
ENV SERVE_WEBSITE_STATIC=1
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/dist ./dist
COPY --from=build /app/db ./db
COPY --from=build /app/public ./public
COPY package.json package-lock.json ./
COPY backend/server.js ./backend/server.js
COPY backend/controller ./backend/controller
COPY backend/config ./backend/config
COPY backend/lib ./backend/lib
COPY backend/middleware ./backend/middleware
COPY backend/routes ./backend/routes
COPY backend/services ./backend/services
COPY backend/utils ./backend/utils
COPY backend/scripts ./backend/scripts
COPY docker/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health/ready || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
