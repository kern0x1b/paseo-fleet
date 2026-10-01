---
name: start-fleet-coordinator
description: Start the Fleet Coordinator session: automatically binds your agent ID, launches background push daemons (GitLab, Slack), verifies channels, and begins listening for inbound fleet events.
user-invocable: true
argument-hint: "[--dry-run]"
---

# Start Fleet Coordinator

Use this skill to activate the current Paseo agent session as the autonomous Fleet Coordinator.

---

## Autonomous Activation Procedure

Immediately execute the following activation command:

```bash
fleet activate
```

This single command automatically performs all necessary setup:

1. Detects your session's unique identifier (`$PASEO_AGENT_ID`).
2. Registers your ID as the active Coordinator in `~/.config/paseo/fleet/config.json`.
3. Binds your ID to the Slack daemon (`slack set-coordinator <id>`).
4. Binds your ID to the GitLab daemon (`gitlab set-coordinator <id>`).
5. Launches background push daemons (`slack daemon start` and `gitlab daemon start`) if they are not already running.
6. Verifies active channels from `~/.config/paseo/fleet/channels.json`.

---

## Confirmation & Reporting

After executing `fleet activate`, print a clear status confirmation to the user:

- **Coordinator Agent ID**: your `$PASEO_AGENT_ID`.
- **Connected Daemons**: Slack daemon (Socket Mode) and GitLab daemon (Polling).
- **Active Push Channels**: List the active channels (e.g. `slack:work`, `gitlab:work`).
- **Readiness**: State that you are now listening for inbound events and ready to orchestrate incoming tasks.

---

## Coordinator Responsibilities

Once activated, your session operates as the central orchestrator for the repository:

1. **Inbound Events**: Parse incoming `paseo-fleet/v1` event envelopes sent by daemons.
2. **Triage & Decomposition**: Break down bug reports, mentions, or pipeline alerts into well-bounded tasks.
3. **Worker Delegation**: For code changes, spawn Worker agents in isolated git worktrees (`create_workspace` with `isolation: "worktree"`).
4. **Reviewer Quality Gate**: Spawn a Reviewer agent to verify tests and diffs before merging or closing.
5. **Deterministic Outbound Reply**: Dispatch completion reports and replies using the payload's `reply_action` or the primary channel (`slack:work`).
