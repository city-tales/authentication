#!/usr/bin/env bash
# Validate Git branch name against allowed patterns.
# Usage: validate_branch.sh <branch_name>
set -euo pipefail

branch="$1"
regex='^(feature/[a-z0-9]+(-[a-z0-9]+)*|feature/ISS-[0-9]+/[a-z0-9]+(-[a-z0-9]+)*|feature/ISS-[0-9]+/(issues|bug|incident)/[a-z0-9]+(-[a-z0-9]+)*|hotfix/[a-z0-9]+(-[a-z0-9]+)*|hotfix/ISS-[0-9]+/[a-z0-9]+(-[a-z0-9]+)*|hotfix/TKT-[0-9]+/[a-z0-9]+(-[a-z0-9]+)*)$'

if [[ "$branch" =~ $regex ]]; then
    echo "✅ Branch name is valid: $branch"
    exit 0
else
    echo "❌ Invalid branch name: $branch"
    echo "Allowed patterns:"
    echo "  feature/<descriptive-name>"
    echo "  feature/ISS-<issue_id>/<descriptive-name>"
    echo "  feature/ISS-<issue_id>/issues/<descriptive-name>"
    echo "  feature/ISS-<issue_id>/bug/<descriptive-name>"
    echo "  feature/ISS-<issue_id>/incident/<descriptive-name>"
    echo "  hotfix/<descriptive-name>"
    echo "  hotfix/ISS-<issue_id>/<descriptive-name>"
    echo "  hotfix/TKT-<issue_id>/<descriptive-name>"
    exit 1
fi