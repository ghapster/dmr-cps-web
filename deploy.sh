#!/bin/bash
set -e

echo "Building..."
npm run build

echo "Deploying to gh-pages..."
cd out

# Init a fresh git repo in the output directory
git init
git checkout -b gh-pages
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"

# Push to gh-pages branch
git push -f git@github.com:ghapster/dmr-cps-landing.git gh-pages

cd ..
echo "Deployed to https://ghapster.github.io/dmr-cps-landing/"
