#!/bin/bash
set -e

# NOTE: This landing page lives on the 'landing-page' branch of dmr-cps-web.
# To deploy, you'll need a separate repo (e.g., ghapster/dmr-cps-landing)
# or a different GitHub Pages setup. Update the remote URL below when ready.
#
# For local preview: npm run build && npx serve out

REPO_URL="https://github.com/ghapster/dmr-cps-landing.git"

echo "Building..."
npm run build

echo "Deploying to gh-pages..."
cd out

git init
git checkout -b gh-pages
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"

git push -f "$REPO_URL" gh-pages

cd ..
echo "Deployed!"
