#!/usr/bin/env bash
# Build-time data generation for Agent Dashboard
# Reads agent workspaces and generates static JSON files
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
OPENCLAW_DIR="${OPENCLAW_HOME:-$HOME/.openclaw}"
CONFIG="$OPENCLAW_DIR/openclaw.json"

mkdir -p "$DATA_DIR"

AGENTS=("pm" "dev" "reviewer" "qa")
AGENT_NAMES=("Project Manager" "Developer" "Reviewer" "QA Engineer")
AGENT_EMOJIS=("📋" "⚡" "🔍" "🧪")

# ── agents.json ──
echo "Building agents.json..."
agents_json="["
for i in "${!AGENTS[@]}"; do
  id="${AGENTS[$i]}"
  name="${AGENT_NAMES[$i]}"
  emoji="${AGENT_EMOJIS[$i]}"
  ws="$OPENCLAW_DIR/workspace-$id"

  # Read AGENTS.md
  agents_md=""
  [[ -f "$ws/AGENTS.md" ]] && agents_md=$(cat "$ws/AGENTS.md")

  # Read SOUL.md
  soul_md=""
  [[ -f "$ws/SOUL.md" ]] && soul_md=$(cat "$ws/SOUL.md")

  # Get model from config
  model=$(jq -r '.agents.defaults.model.primary // "unknown"' "$CONFIG" 2>/dev/null || echo "unknown")

  # Subagent permissions
  subagents=$(jq -r --arg id "$id" '.agents.list[] | select(.id == $id) | .subagents.allowAgents // [] | join(", ")' "$CONFIG" 2>/dev/null || echo "")

  [[ $i -gt 0 ]] && agents_json+=","
  agents_json+=$(jq -n \
    --arg id "$id" \
    --arg name "$name" \
    --arg emoji "$emoji" \
    --arg model "$model" \
    --arg workspace "workspace-$id" \
    --arg agents_md "$agents_md" \
    --arg soul_md "$soul_md" \
    --arg subagents "$subagents" \
    '{id:$id, name:$name, emoji:$emoji, model:$model, workspace:$workspace, agentsMd:$agents_md, soulMd:$soul_md, subagents:$subagents}')
done
agents_json+="]"
echo "$agents_json" | jq '.' > "$DATA_DIR/agents.json"

# ── status.json ──
echo "Building status.json..."
status_json="["
for i in "${!AGENTS[@]}"; do
  id="${AGENTS[$i]}"
  ws="$OPENCLAW_DIR/workspace-$id"

  # Recent memory files
  recent_memory="[]"
  if [[ -d "$ws/memory" ]]; then
    recent_memory=$(find "$ws/memory" -name '*.md' -type f 2>/dev/null | sort -r | head -5 | while read -r f; do
      date=$(basename "$f" .md)
      content=$(cat "$f" | head -20)
      jq -n --arg date "$date" --arg content "$content" '{date:$date, content:$content}'
    done | jq -s '.' 2>/dev/null || echo "[]")
  fi

  [[ $i -gt 0 ]] && status_json+=","
  status_json+=$(jq -n \
    --arg id "$id" \
    --arg workspace "workspace-$id" \
    --argjson memory "$recent_memory" \
    --arg built "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{id:$id, workspace:$workspace, recentMemory:$memory, builtAt:$built}')
done
status_json+="]"
echo "$status_json" | jq '.' > "$DATA_DIR/status.json"

# ── projects.json ──
echo "Building projects.json..."
projects_json="[]"
# Scan all workspaces for projects
all_projects="["
first=true
for id in "${AGENTS[@]}"; do
  ws="$OPENCLAW_DIR/workspace-$id"
  if [[ -d "$ws/projects" ]]; then
    for proj_dir in "$ws/projects"/*/; do
      [[ -d "$proj_dir" ]] || continue
      proj_name=$(basename "$proj_dir")
      
      # Look for requirements or README
      desc=""
      [[ -f "$proj_dir/REQUIREMENTS.md" ]] && desc=$(head -5 "$proj_dir/REQUIREMENTS.md" | tail -1)
      [[ -z "$desc" && -f "$proj_dir/README.md" ]] && desc=$(head -5 "$proj_dir/README.md" | tail -1)

      # Check for status indicators
      has_files=$(find "$proj_dir" -type f | wc -l)
      
      $first || all_projects+=","
      first=false
      all_projects+=$(jq -n \
        --arg name "$proj_name" \
        --arg agent "$id" \
        --arg desc "$desc" \
        --argjson files "$has_files" \
        '{name:$name, agent:$agent, description:$desc, fileCount:$files}')
    done
  fi
done
all_projects+="]"
echo "$all_projects" | jq '.' > "$DATA_DIR/projects.json"

echo "✅ Data built in $DATA_DIR"
ls -la "$DATA_DIR"
