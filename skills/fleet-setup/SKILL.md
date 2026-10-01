---
name: fleet-setup
description: Automatically provisions and connects a multi-agent fleet on the user machine without manual configuration. Detects available push adapters (Slack, GitLab, GitHub, etc.), initializes the fleet coordinator session, registers communication channels, binds daemon routers, and verifies end-to-end event connectivity.
---

# Autonomous Fleet Setup Guide for Agents

Use this skill when the user asks to configure, set up, or connect their AI agent fleet in Paseo.

**Zero Manual Configuration Rule**: Never ask the user to manually edit JSON files. Execute the automated discovery and setup commands below via terminal and Paseo MCP tools.

---

## Step-by-Step Setup Procedure

### Step 1: Initialize Fleet Environment

Run the initialization command to ensure required configuration directories exist:

```bash
fleet init
```

This safely creates `~/.config/paseo/fleet/` and initializes `channels.json` if not already present.

---

### Step 2: Ensure Coordinator Session Exists

1. Query active Paseo agents using `paseo agent ls` or Paseo MCP `list_agents`.
2. Look for an agent labeled or titled `"Fleet Coordinator"`.
3. If no Coordinator exists:
   - Call Paseo MCP `create_workspace` with `{ isolation: "local", name: "fleet-coordinator" }` (or use existing main workspace).
   - Call Paseo MCP `create_agent` with:
     ```json
     {
       "title": "Fleet Coordinator",
       "initialPrompt": "You are the Fleet Coordinator. You receive inbound push events, manage task decomposition, dispatch work to Worker agents, gate on Reviewer agents, and dispatch replies through active push channels."
     }
     ```
   - Note the returned `agentId`.
4. If an agent already exists, note its `agentId`.

---

### Step 3: Discover Installed Adapters

Probe the user's environment for supported Fleet push adapters:

```bash
which slack || true
which gitlab || true
which gh || true
```

Also check active MCP tools for available channels (e.g. `slack_send_message`, `gitlab_add_note`).

---

### Step 4: Register Channels & Bind Coordinator

For each discovered adapter, register it with the fleet:

1. **Slack**:

   ```bash
   # Register channel in fleet
   fleet channel add slack --tool slack_send_message --cli "slack send" --type chat --primary

   # Bind daemon to the Coordinator agent
   slack set-coordinator <coordinator_agent_id>
   ```

2. **GitLab**:

   ```bash
   # Register channel in fleet
   fleet channel add gitlab --tool gitlab_add_note --cli "gitlab comment" --type forge

   # Bind daemon to the Coordinator agent
   gitlab set-coordinator <coordinator_agent_id>
   ```

3. **Global Coordinator Binding**:
   ```bash
   fleet coordinator set <coordinator_agent_id>
   ```

---

### Step 5: Start Background Daemons

Check if background routers are running and start them if inactive:

```bash
# Check status
fleet status

# Start Slack daemon if available
slack daemon status || (slack daemon &)

# Start GitLab daemon if available
gitlab daemon status || (gitlab daemon &)
```

---

### Step 6: End-to-End Verification Ping

Verify that the fleet is live and can receive synthetic events:

```bash
fleet test-event --channel slack
```

Verify that the Coordinator receives the test envelope and responds appropriately. Confirm completion to the user with a summary of connected channels.
