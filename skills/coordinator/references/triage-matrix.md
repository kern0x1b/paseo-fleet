# Coordinator Triage Matrix

Use this matrix to classify incoming events and determine the required execution path.

| Event Type                    | Priority | Target Action                                                | Typical Delegation                                            |
| ----------------------------- | -------- | ------------------------------------------------------------ | ------------------------------------------------------------- |
| `pipeline_failed`             | High     | Investigate CI failure, reproduce locally, fix failing tests | Spawn Worker in worktree with branch checked out              |
| `mention` / `dm` (Bug Report) | High     | Reproduce bug, add regression test, implement fix            | Spawn Worker (TDD) -> Spawn Reviewer                          |
| `mention` / `dm` (Question)   | Medium   | Research codebase, inspect docs                              | Direct response or spawn Research Worker                      |
| `review_reply`                | Medium   | Address reviewer comments on existing branch                 | Route back to existing Worker or spawn fresh Worker on branch |
| `issue_assigned`              | Normal   | Review issue spec, plan implementation, break into subtasks  | Plan -> Spawn Worker -> Spawn Reviewer                        |

---

## Action Rules

1. **Immediate Acknowledgment**: When receiving a high-priority event from a chat channel (Slack, Telegram), draft a brief acknowledgement for `reply_action` (e.g. "Investigating pipeline failure on job #1042") and send it once the user approves; start the investigation without waiting.
2. **Never Execute Large Refactors in Coordinator Session**: Coordinator maintains fleet state and high-level context. Heavy code editing, dependency installation, and running full test suites belongs in isolated Worker sessions.
3. **Idempotency Guard**: Store processed event IDs in memory or state file to discard duplicate webhook deliveries.
