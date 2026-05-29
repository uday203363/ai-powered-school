#!/bin/bash
# Clear all caches and restart fresh
echo "🧹 Clearing all caches..."
rm -rf node_modules/.vite
rm -rf .env.local.bak

echo "✅ Clean build starting..."
npm run dev
