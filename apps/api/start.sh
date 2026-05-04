#!/bin/sh
set -e

# Run database migrations before starting the server
echo "[Mandara API] Running database migrations..."
cd /app/packages/db
/app/node_modules/.bin/prisma migrate deploy

# Start the API server
echo "[Mandara API] Starting server..."
cd /app
exec node apps/api/dist/index.js
