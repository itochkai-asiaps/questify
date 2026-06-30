#!/bin/bash
set -e
cd /opt/questify-staging
git fetch origin
git reset --hard origin/staging
rm -rf .next node_modules/.cache
BUILD=$(git rev-list --count HEAD)
export NEXT_PUBLIC_APP_VERSION="S v0.2-b${BUILD}"
npm run build
pm2 restart questify-staging
echo "Deployed: $NEXT_PUBLIC_APP_VERSION"
