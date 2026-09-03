#!/bin/sh
set -e

echo "[docker] Applying database schema..."
attempt=0
max_attempts=30
while [ "$attempt" -lt "$max_attempts" ]; do
  if npx prisma db push --skip-generate; then
    break
  fi
  attempt=$((attempt + 1))
  echo "[docker] Database not ready yet (${attempt}/${max_attempts})..."
  sleep 2
done

if [ "$attempt" -ge "$max_attempts" ]; then
  echo "[docker] Failed to apply database schema"
  exit 1
fi

echo "[docker] Starting Kadr Portal..."
exec node backend/server.js
