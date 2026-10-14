#!/bin/bash
# Claude Code cloud session setup: install dependencies so lint, tests and builds work.
set -euo pipefail

# Only for Claude Code cloud sessions; local machines manage their own setup.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# npm install (not ci) so the cached container state is reused between sessions.
npm install --no-audit --no-fund --prefer-offline

# Git hooks (secrets guard, lint, format on commit).
npx lefthook install >/dev/null 2>&1 || true

# Playwright: use the pre-installed Chromium instead of downloading one.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  if [ -x /opt/pw-browsers/chromium ]; then
    echo 'export PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium' >> "$CLAUDE_ENV_FILE"
  fi
  echo 'export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1' >> "$CLAUDE_ENV_FILE"
fi

echo "session-start: dependencies ready"
