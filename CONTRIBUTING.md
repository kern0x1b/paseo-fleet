# Contributing

Thanks for your interest in improving `paseo-fleet`.

## Development Setup

```bash
# Run tests offline
npm test

# Check code formatting
npm run format:check

# Link CLI locally
npm link
```

## Before Opening a Pull Request

- `npm test` passes completely and stays offline.
- Code follows the project standard: comment-free, self-documenting code.
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/).
- No model or provider names hardcoded into role skills.
- No personal data or credentials committed.

## Guidelines & Invariants

See [AGENTS.md](AGENTS.md) for architectural guidelines, invariants, and directory layouts.
