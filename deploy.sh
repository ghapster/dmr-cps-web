#!/bin/bash
# Deploy to GitHub Pages
# Usage: bash deploy.sh
#
# Builds the project and pushes dist/ to the gh-pages branch.
# Assumes remote 'origin' is configured.

set -e

echo "Building..."
npm run build

echo "Deploying to gh-pages..."

# Save current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# Create a temporary directory for the deploy
TEMP_DIR=$(mktemp -d)
cp -r dist/* "$TEMP_DIR/"

# Switch to gh-pages (create if doesn't exist)
if git show-ref --verify --quiet refs/heads/gh-pages; then
  git checkout gh-pages
else
  git checkout --orphan gh-pages
  git rm -rf . 2>/dev/null || true
fi

# Clean and copy new build
git rm -rf . 2>/dev/null || true
cp -r "$TEMP_DIR"/* .
rm -rf "$TEMP_DIR"

# Commit and push
git add -A
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"
git push origin gh-pages

# Return to original branch
git checkout "$CURRENT_BRANCH"

echo "Deployed!"
