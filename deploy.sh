#!/usr/bin/env bash
# deploy.sh — Build and deploy to GitHub Pages (gh-pages branch)
#
# Usage: bash deploy.sh
#
# Steps:
#   1. Verify clean working tree on master
#   2. Run production build (tsc + vite)
#   3. Stash build output to temp dir
#   4. Switch to gh-pages
#   5. Replace assets + index.html
#   6. Commit and push
#   7. Switch back to master

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

BRANCH=$(git branch --show-current)

if [ "$BRANCH" != "master" ]; then
  echo -e "${RED}Error: Must be on master branch (currently on $BRANCH)${NC}"
  exit 1
fi

# Check for uncommitted changes (ignore node_modules)
if ! git diff --quiet --exit-code -- ':!node_modules'; then
  echo -e "${RED}Error: Uncommitted changes on master. Commit or stash first.${NC}"
  git diff --stat -- ':!node_modules'
  exit 1
fi

echo -e "${CYAN}Building...${NC}"
npm run build

# Stash build output to temp dir
TMPDIR=$(mktemp -d)
cp -r dist/* "$TMPDIR/"
echo -e "${GREEN}Build complete${NC}"

# Extract version from the built JS bundle (Vite inlines it there, not in index.html)
VERSION=$(grep -rohE 'V[0-9]+\.[0-9]+' "$TMPDIR/assets/"*.js 2>/dev/null | head -1 || echo "unknown")
echo -e "${CYAN}Version: ${VERSION}${NC}"

echo -e "${CYAN}Switching to gh-pages...${NC}"
git checkout gh-pages 2>/dev/null || { echo -e "${RED}Failed to switch to gh-pages${NC}"; rm -rf "$TMPDIR"; exit 1; }

# Remove old tracked assets
OLD_ASSETS=$(git ls-files assets/)
if [ -n "$OLD_ASSETS" ]; then
  echo "$OLD_ASSETS" | xargs git rm -f --quiet 2>/dev/null || true
fi

# Copy new build output
cp "$TMPDIR/index.html" .
mkdir -p assets
cp "$TMPDIR/assets/"* assets/

# Stage only the deploy files (not node_modules, dist, etc)
git add index.html assets/

# Check if there's anything to commit
if git diff --cached --quiet; then
  echo -e "${CYAN}No changes to deploy (build matches current gh-pages)${NC}"
  git checkout master 2>/dev/null
  rm -rf "$TMPDIR"
  exit 0
fi

# Commit and push
git commit -m "Deploy ${VERSION}

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"

echo -e "${CYAN}Pushing gh-pages...${NC}"
git push origin gh-pages

echo -e "${CYAN}Switching back to master...${NC}"
git checkout master 2>/dev/null

rm -rf "$TMPDIR"

echo ""
echo -e "${GREEN}Deployed ${VERSION} to gh-pages${NC}"
echo -e "${GREEN}https://ghapster.github.io/dmr-cps-web/${NC}"
