# AGENTS.md

Guidance for automated agents and contributors working in this repository. It
describes the architecture, layout, invariants that must hold, and the exact commands
to verify changes.

## What this is

A model-agnostic multi-agent fleet specification and protocol repository for [Paseo](https://getpaseo.com).
It defines standardized roles for **Coordinator** (orchestrator), **Worker** (implementer), and
**Reviewer** (adversarial quality gate), along with an open **Paseo Fleet Protocol** for connecting
external push event sources (e.g. `paseo-slack`, `paseo-gitlab`, `paseo-github`, `paseo-telegram`).

## Layout

| Path                              | Purpose                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------- |
| `protocol/`                       | Open Fleet Event Protocol specification, JSON schemas, author guide, and envelope examples. |
| `skills/start-fleet-coordinator/` | One-touch user skill to self-activate coordinator session and start daemons.                |
| `skills/end-fleet-coordinator/`   | One-touch user skill to stop daemons and clear coordinator bindings.                        |
| `skills/coordinator/`             | Fleet Coordinator orchestrator skill (triage matrix, workspace lifecycle).                  |
| `skills/worker/`                  | Fleet Worker implementation skill (worktree isolation, TDD, completion).                    |
| `skills/reviewer/`                | Fleet Reviewer quality gate skill (adversarial audit, security, rubric).                    |
| `skills/fleet-setup/`             | Autonomous fleet setup skill for agents (zero manual configuration).                        |
| `bin/fleet.js`                    | Executable CLI for fleet initialization, channel registration, and status checks.           |
| `src/config.js`                   | Safe manager for `~/.config/paseo/fleet/` configuration and channels registry.              |
| `src/protocol.js`                 | Standard envelope factory and schema validation.                                            |
| `test/`                           | Automated test suite run via `node --test test/`.                                           |

## Commands

Run from the repository root:

```bash
npm test             # node --test test/; must pass and never touch the live network
npm run format       # prettier --write .
npm run format:check # prettier --check .
```

## Conventions

- **Pure Modern Node.js ESM.** Zero external runtime dependencies. Uses native Node.js APIs (`node:fs`, `node:child_process`, `node:test`, `node:assert`).
- **Conventional Commits.** Subject lowercased, ≤ 100 chars (e.g. `feat: ...`, `fix: ...`, `chore: ...`).
- **Self-documenting code.** The codebase is clean and comment-free; code should be self-explanatory through clear naming and structure.
- **English everywhere** in code, documentation, and commit messages.
- **Zero manual configuration.** Tools must be discoverable and configurable programmatically by agents.

## Invariants — Do Not Break

- **Model & Provider Agnosticism.** Role skills must never hardcode specific model names or providers (`gpt-*`, `claude-*`, `gemini-*`).
- **No Tool Name Collisions.** Every channel retains its natural distinct tool name (`slack_send_message`, `gitlab_add_note`). Never reuse identical tool names across adapters.
- **Self-Describing Reply Actions.** Inbound events must contain an explicit `reply_action` detailing the target tool or command.
- **Independent Quality Gate.** The Reviewer agent must never be merged with the Worker; independent evaluation prevents author bias.
- **No personal data.** Never commit real usernames, private company URLs, tokens, or local home paths.
