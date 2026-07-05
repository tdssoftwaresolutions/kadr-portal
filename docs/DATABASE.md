# Database (Prisma + MySQL)

## Shared Prisma client

Use the singleton only — do **not** call `new PrismaClient()` in new files:

```javascript
const prisma = require('../lib/prisma') // adjust path to lib/prisma.js
```

`lib/prisma.js` keeps one connection pool per Node process and reuses it across nodemon reloads in development. Creating many clients was causing hosted MySQL errors such as:

```text
ERROR 1226: User has exceeded the 'max_connections_per_hour' (500)
```

## If you still hit connection limits

1. **Restart the API once** after pulling this change (stop duplicate nodemon processes).
2. **Wait up to an hour** for the host’s hourly connection counter to reset (Hostinger / shared MySQL).
3. Avoid running multiple `npm run start` / `serve-server` copies at the same time.
4. In production, use a single API instance or connection pooling at the host if available.

## Optional env

- `PRISMA_LOG=1` — log Prisma queries to the console (debug only).
