# Agent Dashboard - Requirements

## Overview
A static dashboard for viewing OpenClaw agent status, context, and project progress.
Deployed on GitHub Pages. **Read-only** (no modifications for security).

## Tech Stack
- Static site (HTML/CSS/JS) — no backend
- Build-time data generation via shell scripts
- GitHub Actions for CI/CD → GitHub Pages deployment
- Modern, clean UI (dark mode preferred)

## Features

### 1. Agent Context Viewer
- Display each agent's AGENTS.md and SOUL.md content
- Show agent identity (name, emoji, model)
- Rendered markdown (not raw text)

### 2. Agent Status & Logs
- Current model assignment
- Workspace path
- Recent activity summary (from memory files)
- Session status (if available from build-time export)

### 3. Read-Only (Security)
- No edit functionality
- No API tokens exposed in client code
- All data is pre-built static JSON

### 4. Project Status
- List of active projects
- Status per project (from memory/project files)
- Which agent is assigned to what

## Architecture

```
/
├── index.html          # Main dashboard
├── css/style.css       # Styles
├── js/app.js           # Dashboard logic
├── data/
│   ├── agents.json     # Agent configs & context (built at build time)
│   ├── status.json     # Agent status snapshots
│   └── projects.json   # Active projects
└── scripts/
    └── build-data.sh   # Extracts data from workspace → JSON
```

## Build Process
1. `scripts/build-data.sh` reads agent workspaces, configs, memory files
2. Generates JSON files in `data/`
3. Static site renders from those JSON files
4. GitHub Actions runs build + deploys to gh-pages branch

## Design
- Dark mode default
- Card-based layout (one card per agent)
- Sidebar navigation: Agents | Projects | Logs
- Responsive (mobile-friendly)
- Agent emoji as avatar

## Acceptance Criteria
- [ ] All 4 agents visible with their context
- [ ] Status shows model, workspace, recent activity
- [ ] Projects section shows active work
- [ ] Build script generates valid JSON
- [ ] Deployable to GitHub Pages
- [ ] No secrets or tokens in output
- [ ] Mobile responsive
