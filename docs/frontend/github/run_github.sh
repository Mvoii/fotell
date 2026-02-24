#!/usr/bin/env bash
# run_github.sh
# Run this script AFTER `sudo apt install gh && gh auth login`
# From repo root: bash docs/frontend/github/run_github.sh

set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "=== Creating GitHub Labels ==="
gh label create "frontend"      --color "0075ca" --description "Frontend / UI work"                    2>/dev/null || true
gh label create "documentation" --color "0075ca" --description "Documentation additions or updates"    2>/dev/null || true
gh label create "design"        --color "e4e669" --description "UI/UX design decisions"                2>/dev/null || true
gh label create "planning"      --color "d93f0b" --description "Planning, spec, or architecture work"  2>/dev/null || true
gh label create "next.js"       --color "000000" --description "Next.js framework"                     2>/dev/null || true
gh label create "enhancement"   --color "a2eeef" --description "New feature or request"                2>/dev/null || true

echo "=== Creating Issue ==="
ISSUE_URL=$(gh issue create \
  --title "[Frontend] Design Specification & Branch Setup for Prediction Markets UI" \
  --body-file "docs/frontend/github/ISSUE_frontend_design_spec.md" \
  --label "frontend,documentation,design,planning,next.js,enhancement" \
  --assignee "@me")

echo "Issue created: $ISSUE_URL"
ISSUE_NUMBER=$(echo "$ISSUE_URL" | grep -oP '\d+$')

echo "=== Pushing frontend branch ==="
git push --set-upstream origin frontend

echo "=== Creating Pull Request ==="
PR_URL=$(gh pr create \
  --title "docs(frontend): comprehensive design specification & branch setup" \
  --body-file "docs/frontend/github/PR_frontend_design_spec.md" \
  --base main \
  --head frontend \
  --label "frontend,documentation,design,planning,next.js" \
  --assignee "@me" \
  --draft)

echo "PR created (draft): $PR_URL"
echo ""
echo "Done! Issue: $ISSUE_URL"
echo "      PR:    $PR_URL"
