#!/bin/bash
set -euo pipefail

LABEL="edu.arizona.cohortai-pan"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
USER_ID="$(id -u)"

launchctl bootout "gui/$USER_ID/$LABEL" 2>/dev/null || true
rm -f "$PLIST_PATH"
echo "CohortAI-PAN local service removed."
