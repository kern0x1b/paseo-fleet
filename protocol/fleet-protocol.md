# Paseo Fleet Protocol Specification (v1)

The **Paseo Fleet Protocol** defines a standardized, model-agnostic contract for multi-agent fleets operating inside Paseo. It specifies how external systems (chat apps, code forges, alert managers) deliver push events to an agent fleet, how a Coordinator delegates tasks to specialized Worker and Reviewer agents, and how progress and outcomes are reported back.

---

## 1. Architectural Philosophy

1. **Protocol, Not Monolith**: Tools maintain their own standalone CLI, daemon, and MCP servers (`paseo-slack`, `paseo-gitlab`, `paseo-github`). The fleet coordinates through standardized event payloads rather than centralized runtime plugins.
2. **Model & Provider Agnostic**: Role instructions never hardcode specific model families (`gpt-*`, `claude-*`, `gemini-*`). Roles define behavior, verification gates, and delegation schemas.
3. **No Collision, Deterministic Routing**: Tools keep their natural, unique names (`slack_send_message`, `gitlab_add_note`). Events self-describe their exact reply action.
4. **Deterministic Layer 1 Filtering**: External daemons drop noise before dispatching to Paseo. The Coordinator receives only relevant, high-signal actionable events.

---

## 2. Inbound Push Event Envelope

When an external tool or daemon (e.g. `slack daemon`, `gitlab daemon`) detects an event relevant to the fleet, it formats the event as a JSON envelope and delivers it to the Fleet Coordinator agent using:

```bash
paseo send <coordinator_agent_id> '<event_envelope_json>' --no-wait
```

### JSON Schema Specification

```json
{
  "$schema": "https://getpaseo.com/schemas/fleet-event-v1.json",
  "protocol": "paseo-fleet/v1",
  "id": "evt_01jg84z9x2...",
  "timestamp": "2026-10-02T10:15:30Z",
  "source": "slack" | "gitlab" | "github" | "webhook" | "custom",
  "event_type": "dm" | "mention" | "review_reply" | "pipeline_failed" | "issue_assigned" | "alert",
  "actor": {
    "id": "U12345678",
    "name": "alex.dev",
    "is_bot": false
  },
  "target": {
    "type": "thread" | "channel" | "mr" | "issue" | "url",
    "id": "1727200000.123",
    "title": "Pipeline #1042 failed on main",
    "url": "https://gitlab.example.com/org/repo/-/pipelines/1042"
  },
  "content": "Build failed on job test-unit: AssertionError in auth.test.ts",
  "reply_action": {
    "type": "mcp" | "cli",
    "tool": "slack_send_message",
    "command": "slack send",
    "params": {
      "channel": "C12345678",
      "thread_ts": "1727200000.123"
    }
  }
}
```

### Required Fields

| Field          | Type   | Description                                                         |
| -------------- | ------ | ------------------------------------------------------------------- |
| `protocol`     | string | Constant `"paseo-fleet/v1"`.                                        |
| `id`           | string | Unique event ID for idempotency and deduplication.                  |
| `timestamp`    | string | ISO-8601 creation timestamp.                                        |
| `source`       | string | Originating platform identifier (e.g. `slack`, `gitlab`, `github`). |
| `event_type`   | string | Semantic category of the inbound event.                             |
| `actor`        | object | Initiator identity (`id`, `name`, `is_bot`).                        |
| `content`      | string | Extracted text message, error message, or user request.             |
| `reply_action` | object | Explicit target and parameters for sending replies.                 |

---

## 3. Outbound Notification & Channels Registry

For proactive messages initiated by the fleet (e.g. daily summaries, worker completion notifications, critical blocker alerts), the Coordinator consults the local channels registry located at:

`~/.config/paseo/fleet/channels.json`

### Registry Structure

```json
{
  "version": "1.0",
  "primary_channel": "slack",
  "channels": {
    "slack": {
      "type": "chat",
      "mcp_tool": "slack_send_message",
      "cli_command": "slack send",
      "default_target": {
        "channel": "C_DEVOPS_ALERTS"
      },
      "capabilities": ["dm", "mention", "thread_reply", "reactions"]
    },
    "gitlab": {
      "type": "forge",
      "mcp_tool": "gitlab_add_note",
      "cli_command": "gitlab comment",
      "capabilities": ["mr_comment", "issue_note", "pipeline_status"]
    }
  }
}
```

Tools register themselves via the `fleet channel add` command without requiring manual JSON editing by users.

---

## 4. Multi-Agent Triad Interaction

```
[Inbound Event] ──► (Coordinator)
                         │
                         ├── 1. Creates worktree workspace & spawns Worker
                         │   └─► (Worker)
                         │           │
                         │           ├─ TDD implementation
                         │           └─ Returns Diff + Test Proof
                         │
                         ├── 2. Spawns Reviewer with Diff & Criteria
                         │   └─► (Reviewer)
                         │           │
                         │           ├─ Verifies invariants & tests
                         │           └─ Returns Verdict (APPROVED / CHANGES)
                         │
                         └── 3. Dispatches reply via reply_action or primary channel
                             └─► [Outbound Notification]
```
