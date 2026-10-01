---
name: end-fleet-coordinator
description: Stop the Fleet Coordinator session: cleanly stops all background push daemons (GitLab, Slack) and deactivates event routing.
user-invocable: true
---

# End Fleet Coordinator

Use this skill to safely shut down the Fleet Coordinator session and stop all background push daemons.

---

## Shutdown Procedure

Immediately execute the shutdown command:

```bash
fleet stop
```

This command automatically:

1. Terminates the running Slack event listener daemon (`slack daemon stop`).
2. Terminates the running GitLab event router daemon (`gitlab daemon stop`).
3. Ensures no background polling or WebSocket connections remain active.

---

## Confirmation

After executing `fleet stop`, confirm to the user that:

- Background push daemons have been cleanly stopped.
- Polling and WebSocket listeners are inactive.
- No further events will be routed to Paseo until the coordinator is restarted with `/start-fleet-coordinator`.
