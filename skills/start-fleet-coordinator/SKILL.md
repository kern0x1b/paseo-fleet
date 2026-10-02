---
name: start-fleet-coordinator
description: Start the Fleet Coordinator session: binds your agent ID, launches background push daemons, sweeps every adapter for work that was already waiting, verifies it, presents a prioritised plan, dispatches workers, and then listens for inbound fleet events.
user-invocable: true
argument-hint: "[--since <iso|24h|3d>]"
---

# Start Fleet Coordinator

Activate the current Paseo agent session as the Fleet Coordinator, catch up on everything that was waiting before activation, and only then switch to live event handling.

---

## 1. Activate

```bash
fleet activate
```

This registers `$PASEO_AGENT_ID` as the coordinator, binds it to every adapter daemon, starts the daemons that are not running, and lists the registered channels.

Daemons only report events that happen after they start. Work that was already waiting is not pushed; step 2 collects it.

## 2. Sweep

```bash
fleet sweep
```

Pass the user's `--since` argument through if one was given. The command prints one `paseo-fleet/v1` sweep document:

- `sources`: every adapter that was asked, whether it answered, and which identity it ran as.
- `items`: deduplicated envelopes, each with a `reply_action` and a `snapshot` block (`reasons` and raw `state`).
- `errors`: everything that could not be read. Report these to the user; never present a partial sweep as complete.

The sweep is the starting list, not the boundary. Use the adapters' CLI and MCP tools for anything an item needs beyond it.

## 3. Verify, prioritise, present

Follow [startup-sweep.md](../coordinator/references/startup-sweep.md): check every item against the thing it describes, drop what needs nothing, order the rest, and present the plan to the user before acting on it.

## 4. Dispatch

Within the Authority Rules of the [coordinator skill](../coordinator/SKILL.md):

- Start investigations and Worker agents in isolated worktrees for the items that need code or analysis.
- Queue every outbound action (message, comment, push, merge request, merge) as a draft for the user's explicit approval.

## 5. Listen

Report the coordinator ID, running daemons, active channels, the plan, and what was dispatched. Then process inbound `paseo-fleet/v1` envelopes as they arrive, deduplicating them by `urn` against the items already in the plan.
