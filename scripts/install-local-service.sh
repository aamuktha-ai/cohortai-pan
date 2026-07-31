#!/bin/bash
set -euo pipefail

LABEL="edu.arizona.cohortai-pan"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
NODE_BINARY="$(command -v node)"
USER_ID="$(id -u)"

if [ ! -f "$ROOT_DIR/.env" ]; then
  echo "Missing $ROOT_DIR/.env. Copy .env.example and configure PAN_REFERENCE_PATH first."
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"
launchctl bootout "gui/$USER_ID/$LABEL" 2>/dev/null || true

cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BINARY</string>
    <string>$ROOT_DIR/server.js</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT_DIR</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/cohortai-pan-service.out.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/cohortai-pan-service.err.log</string>
</dict>
</plist>
PLIST

launchctl bootstrap "gui/$USER_ID" "$PLIST_PATH"
launchctl kickstart -k "gui/$USER_ID/$LABEL"
echo "CohortAI-PAN local service is running at http://127.0.0.1:5180"
