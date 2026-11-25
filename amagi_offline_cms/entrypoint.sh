#!/bin/sh
# Container entrypoint: runs pending migrations before starting the Next.js app
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec npm start
