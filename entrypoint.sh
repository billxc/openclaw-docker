#!/bin/sh
set -e

CONFIG_DIR="${OPENCLAW_DIR:-$HOME/.openclaw}"
CONFIG_FILE="$CONFIG_DIR/openclaw.json"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "🐾 No config found. Starting First Run Setup..."
  echo "   Open http://localhost:3578 in your browser"
  node /opt/fre/server.mjs
  # FRE server exits after setup completes, restart to launch gateway
  echo "🔄 Setup complete. Starting gateway..."
fi

exec openclaw gateway start --foreground
