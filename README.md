# `paseo-fleet` (`fleet`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node-%E2%89%A520-3c873a.svg)](https://nodejs.org)
[![Tests: node --test](https://img.shields.io/badge/tests-node%20--test-brightgreen.svg)](test)
[![Code style: Prettier](https://img.shields.io/badge/code%20style-prettier-ff69b4.svg)](https://prettier.io)

Model-agnostic multi-agent fleet skills (**Coordinator**, **Worker**, **Reviewer**) and open event protocol for [Paseo](https://getpaseo.com), Claude Code, and Antigravity.

Enables autonomous agent teams to triage incoming events from external channels (Slack, GitLab, GitHub, Telegram), execute implementations in isolated git worktrees, gate on independent adversarial review, and report outcomes seamlessly without hardcoded model or tool dependencies.

---

## Architecture Overview

```
                      External Platforms (Slack, GitLab, GitHub, Webhooks)
                                           │
                                           ▼ (Layer 1 Filter)
                      ┌────────────────────────────────────────┐
                      │  Paseo Fleet Protocol (Inbound Event)  │
                      │  paseo send <coordinator_agent_id>     │
                      └────────────────────┬───────────────────┘
                                           │
                                           ▼
                      ┌────────────────────────────────────────┐
                      │      Fleet Coordinator (Orchestrator)  │
                      │  - Triage & Deduplication              │
                      │  - Subtask Decomposition               │
                      │  - Worktree Provisioning               │
                      └────────────┬───────────────────────▲───┘
                                   │                       │
           1. Delegate Task        │                       │ 4. Verdict (APPROVED)
                                   ▼                       │
        ┌────────────────────────────────────┐             │
        │    Fleet Worker (Implementer)      │             │
        │  - Isolated Git Worktree           │             │
        │  - Test-Driven Development (TDD)   │             │
        │  - Self-Verification Evidence      │             │
        └──────────────────┬─────────────────┘             │
                           │                               │
                           │ 2. Handoff Diff Artifact      │
                           ▼                               │
        ┌──────────────────────────────────────────────────┴─┐
        │          Fleet Reviewer (Quality Gate)             │
        │  - Independent Adversarial Critique                │
        │  - Security, Invariant & Regression Checks         │
        │  - Feedback Loop (CHANGES_REQUESTED / APPROVED)    │
        └────────────────────────────────────────────────────┘
```

---

## Fleet Skills & Roles

`paseo-fleet` provides ready-to-use skills for both user invocation and autonomous subagent delegation:

### User-Invocable Skills

| Skill                 | Invocation Command         | Description                                                                                                                                                                      |
| --------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Start Coordinator** | `/start-fleet-coordinator` | **One-touch autonomous activation.** Self-detects `$PASEO_AGENT_ID`, binds to Slack & GitLab routers, launches background daemons, verifies push channels, and begins listening. |
| **End Coordinator**   | `/end-fleet-coordinator`   | **One-touch shutdown.** Sends `SIGTERM` to all background daemons, clears coordinator bindings, and deactivates event routing. Alias: `/stop-fleet-coordinator`.                 |
| **Fleet Setup**       | `fleet-setup`              | Automatically discovers installed CLI push adapters (`which slack`, `which gitlab`), provisions directories, registers channels, and verifies connectivity.                      |

### Autonomous Agent Roles

| Role            | Skill Path           | Workspace Isolation                  | Key Responsibility                                                                                                                                                  |
| --------------- | -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Coordinator** | `skills/coordinator` | Active session                       | Triages incoming `paseo-fleet/v1` envelopes, decomposes complex tasks, provisions git worktrees, delegates to Workers/Reviewers, and sends outbound notifications.  |
| **Worker**      | `skills/worker`      | Isolated Git Worktree (`branch-off`) | Implements code changes, writes reproduction tests (TDD), verifies locally with test suites, and produces structured completion reports.                            |
| **Reviewer**    | `skills/reviewer`    | Independent review session           | Evaluates Worker diffs with independent perspective, inspects edge cases & security invariants, and issues definitive verdicts (`APPROVED` or `CHANGES_REQUESTED`). |

---

## Autonomous Lifecycle: Zero Manual Work

Start and stop the entire multi-agent fleet with zero manual file editing:

```bash
# 1. Activate the current agent session as Coordinator and launch background daemons
fleet activate

# 2. Collect everything that was already waiting on you from every adapter
fleet sweep

# 3. Check coordinator liveness, channels, and background daemon status
fleet status

# 4. Cleanly shut down daemons and unbind coordinator
fleet stop
```

When running inside a Paseo agent session, invoking `/start-fleet-coordinator` automatically calls `fleet activate`, which:

1. Detects the unique session ID (`$PASEO_AGENT_ID`).
2. Registers the ID as the active Coordinator in `~/.config/paseo/fleet/config.json`.
3. Binds the ID to the Slack daemon (`slack set-coordinator <id>`).
4. Binds the ID to the GitLab daemon (`gitlab set-coordinator <id>`).
5. Checks if daemons are already running; if not, spawns them in background (`slack daemon` and `gitlab daemon --all-hours`).
6. Reads `~/.config/paseo/fleet/channels.json` and reports ready channels.

The skill then runs `fleet sweep`, verifies every item against its source, presents a prioritised plan, dispatches Workers for the items that need code, and queues every outbound action (messages, comments, pushes, merge requests) for the user's approval before it starts listening for new events.

---

## Multi-Project & Multi-Instance Isolation

The fleet protocol prevents collisions across multiple projects, repositories, and workspaces using explicit routing scopes:

```json
{
  "channels": {
    "slack:work": {
      "type": "chat",
      "instance": "T0123456789",
      "scope": null,
      "mcp_tool": "slack_send_message",
      "cli_command": "slack send",
      "description": "Work Slack workspace",
      "is_primary": true
    },
    "gitlab:work": {
      "type": "forge",
      "instance": "https://gitlab.example.com",
      "scope": "team/project",
      "mcp_tool": "gitlab_create_issue_note",
      "cli_command": "gitlab comment",
      "description": "Work GitLab (team/project)"
    }
  },
  "primary_channel": "slack:work"
}
```

- **`instance`**: Uniquely identifies the team, tenant, or host (e.g. Slack Team `T0123456789`, GitLab host `https://gitlab.example.com`).
- **`scope`**: Identifies the specific repository, project, or channel namespace (e.g. `team/project` or `C01DEV`).
- **`urn`**: Globally unique uniform resource name (`urn:gitlab:gitlab.example.com:team/project:issue:42`), enabling 100% idempotent deduplication across agents.

---

## CLI Reference (`fleet`)

```bash
# Initialize fleet directories (~/.config/paseo/fleet/)
fleet init

# Activate current agent ($PASEO_AGENT_ID) as coordinator & start daemons
fleet activate

# Check fleet status, coordinator binding, and background daemon health
fleet status

# Collect waiting work from every adapter (default: since the last sweep, at least 24h back)
fleet sweep
fleet sweep --since 3d --adapters gitlab
fleet sweep --no-cursor   # do not move the cursor

# Register a push channel provider
fleet channel add slack:work --tool slack_send_message --cli "slack send" --type chat --instance T0123456789 --primary
fleet channel add gitlab:work --tool gitlab_create_issue_note --cli "gitlab comment" --type forge --instance https://gitlab.example.com --scope team/project

# Inspect registered channels
fleet channel ls

# Remove a channel
fleet channel rm gitlab:work

# Dispatch synthetic test event to verify round-trip delivery
fleet test-event --channel slack:work

# Stop all background daemons and unbind coordinator
fleet stop
```

---

## Building Custom Adapters

Anyone can build custom adapters (e.g. `paseo-telegram`, `paseo-github`, `paseo-jira`, `paseo-discord`). Read the [Adapter Author Guide](protocol/author-guide.md) to implement the contract in minutes.

---

## Documentation Index

- [**Paseo Fleet Protocol Specification**](protocol/fleet-protocol.md)
- [**Adapter Author Guide**](protocol/author-guide.md)
- [**Coordinator Triage Matrix**](skills/coordinator/references/triage-matrix.md)
- [**Coordinator Dispatch Lifecycle**](skills/coordinator/references/dispatch-lifecycle.md)
- [**Worker Handbook & Delivery Standard**](skills/worker/references/worker-handbook.md)
- [**Reviewer Rubric & Audit Checklist**](skills/reviewer/references/review-rubric.md)

---

## License

MIT © kern0x1b
