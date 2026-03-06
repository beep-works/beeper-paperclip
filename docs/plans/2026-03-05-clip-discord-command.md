# /clip Discord Command — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Discord `/clip` slash command that collects channel messages, summarizes them with AI, gets human approval, then creates a Paperclip issue assigned to CEO/PM.

**Architecture:** OpenClaw skill (`clip`) registered as a native Discord slash command. The skill reads recent channel messages, calls the LLM to produce a task summary, sends an embed with approve/cancel buttons, and on approval POSTs to the local Paperclip API using a JWT token.

**Tech Stack:** OpenClaw skills system, Discord message tool, Paperclip REST API (`localhost:3100/api`), Paperclip agent JWT

---

## Flow

```
/clip [limit:N | from:<messageId>]
  ↓
1. Collect channel messages (user messages only, not bot)
  ↓
2. LLM summarizes → title + description
  ↓
3. Post embed to channel:
   "📎 새 태스크 요약
    제목: ...
    내용: ...
    [✅ 생성] [❌ 취소]"
  ↓
4. User clicks ✅
  ↓
5. GET /api/companies → pick first company
   GET /api/companies/:id/agents → find CEO or PM
   POST /api/companies/:id/issues { title, description, assigneeAgentId }
  ↓
6. Reply with Paperclip issue link
```

---

## Task 1: Enable Discord inline buttons

**Files:**
- Modify: `~/.openclaw/openclaw.json`

**Step 1: Check current config**

```bash
openclaw gateway config.get
```

Look for `channels.discord.capabilities`.

**Step 2: Patch config to enable inline buttons for all**

Use gateway config.patch:
```json
{
  "channels": {
    "discord": {
      "capabilities": {
        "inlineButtons": "all"
      }
    }
  }
}
```

**Step 3: Verify restart completed and buttons enabled**

Gateway auto-restarts after config.patch. Confirm in `/status`.

---

## Task 2: Set up Paperclip agent JWT

**Goal:** Get an API token for calling Paperclip from the skill.

**Step 1: Check if JWT already exists**

```bash
cat ~/.paperclip/instances/default/.env | grep JWT
```

**Step 2: Generate agent JWT via Paperclip CLI**

```bash
cd ~/paperclip && pnpm paperclipai token create --label "openclaw-clip-skill" 2>&1
```

If that doesn't work, check available token commands:
```bash
cd ~/paperclip && pnpm paperclipai --help 2>&1
```

**Step 3: Save JWT to env**

Add to `~/.paperclip/instances/default/.env`:
```
PAPERCLIP_OPENCLAW_JWT=<token>
```

**Step 4: Verify API is accessible with the token**

```bash
curl -s http://localhost:3100/api/health
curl -s -H "Authorization: Bearer <token>" http://localhost:3100/api/companies | python3 -m json.tool | head -30
```

---

## Task 3: Create the `clip` skill

**Files:**
- Create: `~/.openclaw/skills/clip/SKILL.md`

**Step 1: Create skill directory**

```bash
mkdir -p ~/.openclaw/skills/clip
```

**Step 2: Write SKILL.md**

```markdown
---
name: clip
description: "Collect Discord channel messages and create a Paperclip issue via /clip slash command"
user-invocable: true
command-options:
  - name: limit
    type: integer
    description: "Number of recent messages to analyze (default: 20)"
    required: false
  - name: from
    type: string
    description: "Message ID to start from (reads from this message to now)"
    required: false
allowed-tools: ["message", "exec"]
---

# /clip Skill

When invoked via `/clip`, do the following in order:

## Step 1: Collect messages

Use the `message` tool to read messages from the current channel.

- If `from` option provided: read all messages from that message ID to now (use `after: <from>`)
- If `limit` option provided: read that many recent messages (default 20)
- Filter: keep only messages from human users (exclude bot messages, i.e. author is not a bot)

## Step 2: Summarize with AI

Analyze the collected messages and produce:
- **title**: concise Korean task title (max 80 chars)
- **description**: markdown summary of what needs to be done (2-5 sentences)
- **suggested_agent_role**: which type of agent should handle this (e.g. "CEO", "PM", "CTO", "engineer")

## Step 3: Post confirmation embed

Post to the current channel with Discord components v2:
- Section block with the summary
- Two buttons: ✅ 생성 (style: success) and ❌ 취소 (style: danger)
- Set `reusable: true` so buttons remain active

## Step 4: Wait for button click

The button click will trigger a new message/interaction. When you see ✅ 생성 clicked:

## Step 5: Call Paperclip API

1. GET http://localhost:3100/api/companies
   - Pick the first company (or the one named "beeper")
   - Save `companyId`

2. GET http://localhost:3100/api/companies/{companyId}/agents
   - Find agent whose role/title matches `suggested_agent_role` (CEO or PM preferred)
   - Save `assigneeAgentId`

3. POST http://localhost:3100/api/companies/{companyId}/issues
   ```json
   {
     "title": "<title from step 2>",
     "description": "<description from step 2>",
     "assigneeAgentId": "<id from step 5.2>",
     "status": "backlog",
     "priority": "medium"
   }
   ```
   Use `Authorization: Bearer $PAPERCLIP_OPENCLAW_JWT` header.
   Read JWT from environment: `process.env.PAPERCLIP_OPENCLAW_JWT`

## Step 6: Report result

Post success message to channel:
"✅ Paperclip 이슈 생성 완료! 에이전트 <name>에게 배정됨"

If ❌ 취소 clicked: post "취소됐어요." and stop.
```

**Step 3: Commit skill**

```bash
cd ~/.openclaw/workspace && git add -A && git commit -m "feat: add /clip Discord slash command skill"
```

---

## Task 4: Wire JWT into Paperclip server environment

The skill runs inside OpenClaw and needs `PAPERCLIP_OPENCLAW_JWT` available at runtime.

**Step 1: Check how OpenClaw passes env vars to skills**

Skills run in the OpenClaw agent process. Env vars set in `openclaw.json` or the host environment are available.

Option A — Add to host shell profile:
```bash
echo 'export PAPERCLIP_OPENCLAW_JWT="<token>"' >> ~/.zshenv
```

Option B — Add to OpenClaw config:
```json
{ "env": { "PAPERCLIP_OPENCLAW_JWT": "<token>" } }
```

**Step 2: Apply via gateway config.patch**
```json
{ "env": { "PAPERCLIP_OPENCLAW_JWT": "<token>" } }
```

**Step 3: Verify the env var is visible in a skill exec**
```bash
echo $PAPERCLIP_OPENCLAW_JWT
```

---

## Task 5: Test end-to-end

**Step 1: Type `/clip limit:5` in Discord**

Verify:
- Skill is registered as native slash command
- Collects last 5 user messages from channel
- Posts summary embed with buttons

**Step 2: Click ✅ 생성**

Verify:
- Paperclip API call succeeds
- Issue appears in Paperclip UI at `http://100.68.237.62:3100`
- CEO/PM agent is shown as assignee

**Step 3: Test `from` parameter**

Right-click an older message → Copy Message ID.
Run `/clip from:<id>`.
Verify messages between that ID and now are collected.

**Step 4: Test ❌ 취소**

Verify cancellation message appears and no issue is created.

---

## Notes

- Paperclip server must be running (`pnpm dev --tailscale-auth` in `~/paperclip`)
- If no CEO/PM found in agents list, fall back to unassigned (omit `assigneeAgentId`)
- Button interactions on Discord have a 3-second response window — post a loading message first if needed
