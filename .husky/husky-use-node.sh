#!/bin/sh

# Prefer system Node (Windows / CI). Optional nvm when present.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "$NVM_DIR/nvm.sh"
  nvm use >/dev/null 2>&1 || true
fi
