#!/usr/bin/env bash
set -e

echo "🔄 Reverting VS Code terminal & editor settings..."

VSCODE_SETTINGS="$HOME/.config/Code/User/settings.json"

# Backup existing settings if present
if [ -f "$VSCODE_SETTINGS" ]; then
  cp "$VSCODE_SETTINGS" "$VSCODE_SETTINGS.backup.$(date +%s)"
  echo "📦 Backup created:"
  echo "   $VSCODE_SETTINGS.backup.*"
fi

# Remove the settings file (VS Code will recreate defaults)
rm -f "$VSCODE_SETTINGS"

# Optional: clear cached renderer settings (safe)
rm -rf "$HOME/.config/Code/User/workspaceStorage"

echo "✅ VS Code settings reverted to default"
echo "➡ Restart VS Code completely"
echo "   Run: pkill code && code"
