#!/usr/bin/env bash
# Cài bộ kit vào Claude Code.
#   ./install.sh            -> cài cho TẤT CẢ dự án (~/.claude)
#   ./install.sh --project  -> chỉ cài cho dự án hiện tại (./.claude)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
if [[ "${1:-}" == "--project" ]]; then DEST="$PWD/.claude"; else DEST="$HOME/.claude"; fi
mkdir -p "$DEST/skills" "$DEST/agents" "$DEST/commands"
cp -R "$HERE/skills/animated-admin-dashboard" "$DEST/skills/"
cp "$HERE"/agents/*.md "$DEST/agents/"
cp "$HERE"/commands/*.md "$DEST/commands/"
echo "Đã cài vào $DEST"
echo "Mở Claude Code và gõ:  /new-dashboard <mô tả trang cần làm>"
