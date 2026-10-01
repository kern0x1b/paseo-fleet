# Adapter Author Guide: Building a Paseo Fleet Provider

This guide explains how to build a custom adapter or event router (e.g. `paseo-telegram`, `paseo-github`, `paseo-jira`, `paseo-discord`) that connects external events to the Paseo Fleet Coordinator.

---

## 1. Overview of the Contract

An adapter connects an external platform to the Paseo Fleet by implementing three lightweight responsibilities:

1. **Inbound Event Router (Daemon / Webhook)**:
   Listens to external platform events, applies Layer 1 filtering to drop noise, formats the event into the standardized `PaseoFleetEventEnvelope` JSON, and calls:
   ```bash
   paseo send <coordinator_agent_id> '<envelope_json>' --no-wait
   ```
2. **Coordinator Binding**:
   Accepts and records the active Coordinator agent ID via a CLI command (e.g. `<tool> set-coordinator <agent-id>`).
3. **Registration Hook (Channel Manifest)**:
   Registers its capabilities in `~/.config/paseo/fleet/channels.json` either by calling `fleet channel add <name> ...` or writing directly to the manifest.

---

## 2. Step-by-Step Implementation

### Step 1: Support `set-coordinator`

Provide a simple command in your tool's CLI to record where events should be delivered:

```bash
mytool set-coordinator <agent-id>
```

Store this value in your tool's user config (e.g. `~/.config/mytool/config.json`).

### Step 2: Layer 1 Noise Filtering

Before sending any event to Paseo, filter out unnecessary traffic:

- Discard bot spam, automated system notices, and chatter from public channels where the agent is not mentioned.
- Forward direct messages (DMs), direct mentions (`@bot` or `@user`), and active subscribed threads.

### Step 3: Wrap & Dispatch Event

When a relevant event occurs:

```javascript
const envelope = {
  protocol: 'paseo-fleet/v1',
  id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  timestamp: new Date().toISOString(),
  source: 'mytool',
  event_type: 'mention',
  actor: {
    id: event.userId,
    name: event.userName,
    is_bot: false,
  },
  target: {
    type: 'thread',
    id: event.threadId,
  },
  content: event.text,
  reply_action: {
    type: 'mcp',
    tool: 'mytool_send_message',
    params: {
      chat_id: event.chatId,
      reply_to: event.messageId,
    },
  },
};

execSync(`paseo send ${coordinatorAgentId} ${JSON.stringify(JSON.stringify(envelope))} --no-wait`);
```

### Step 4: Register with Fleet Registry

Provide a simple registration command or run:

```bash
fleet channel add mytool --tool mytool_send_message --cli "mytool send" --type chat
```

Now the Fleet Coordinator automatically recognizes your tool as a first-class push channel!
