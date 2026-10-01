# `paseo-fleet` (`fleet`)

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

## The Three Fleet Roles

| Role                                   | Responsibility                                                                                                                                                      | Workspace Isolation                  | Key Output                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------- |
| **Coordinator** (`skills/coordinator`) | Receives events, triages priorities, plans subtasks, provisions worktrees, delegates to Workers/Reviewers, and sends outbound notifications.                        | Main or local session                | Subtask delegation & final channel response |
| **Worker** (`skills/worker`)           | Implements code changes, writes reproduction tests (TDD), verifies locally with test suites, and produces structured completion reports.                            | Isolated Git Worktree (`branch-off`) | Verified Git diff & test proof              |
| **Reviewer** (`skills/reviewer`)       | Evaluates Worker diffs with independent perspective, inspects edge cases & security invariants, and issues definitive verdicts (`APPROVED` or `CHANGES_REQUESTED`). | Fresh review session                 | Decisive review assessment & feedback       |

---

## Key Design Principles

1. **Model & Provider Agnostic**: Roles specify operational contracts, decision matrices, and verification gates. They never hardcode `gpt-4`, `claude-3-7`, or specific LLM providers.
2. **Pluggable Event Routing**: Tools like [paseo-slack](https://github.com/kern0x1b/paseo-slack) and [paseo-gitlab](https://github.com/kern0x1b/paseo-gitlab) push events to the fleet via the open [Paseo Fleet Protocol](protocol/fleet-protocol.md).
3. **No Tool Name Collisions**: Integrations retain distinct, unambiguous tool names (`slack_send_message`, `gitlab_add_note`). Events self-describe their exact reply actions.
4. **Zero Manual Configuration**: Users never edit JSON files by hand. The included `fleet-setup` skill empowers agents to discover tools, set up coordinators, and bind channels autonomously.

---

## Quickstart: Automated Setup

When paired with an AI assistant in Paseo:

> **User Prompt**: _"Set up my fleet coordinator and connect my Slack and GitLab adapters."_

The assistant uses the autonomous setup skill (`skills/fleet-setup`) to:

1. Initialize fleet configuration via `fleet init`.
2. Ensure a Coordinator agent session is provisioned.
3. Automatically discover installed adapters (`which slack`, `which gitlab`).
4. Register channels and bind daemons via `fleet coordinator set <id>`.
5. Run an end-to-end verification ping.

---

## CLI Reference (`fleet`)

The repository includes a standalone zero-dependency CLI for fleet lifecycle management:

```bash
# Initialize fleet directories (~/.config/paseo/fleet/)
fleet init

# Configure active coordinator agent
fleet coordinator set <agent-id>
fleet coordinator get
fleet coordinator clear

# Register and inspect channels
fleet channel add slack --tool slack_send_message --cli "slack send" --type chat --primary
fleet channel add gitlab --tool gitlab_add_note --cli "gitlab comment" --type forge
fleet channel ls
fleet channel rm <name>

# Check fleet status and connected channels
fleet status

# Send a synthetic test event to verify round-trip delivery
fleet test-event --channel slack
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
