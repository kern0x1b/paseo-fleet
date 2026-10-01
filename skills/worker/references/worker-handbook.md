# Worker Handbook

## 1. Task Execution Standard

1. **Explore First**: Read existing tests and patterns before writing new code.
2. **Reproduce First**: For bug fixes, create a reproduction script or unit test that triggers the bug.
3. **Surgical Edits**: Change only what is necessary to accomplish the task. Do not reformat unrelated files.
4. **Clean Commits**: Commit changes with conventional commit messages (e.g. `fix: handle expired tokens gracefully`).

---

## 2. Handoff Report Template

When handing off to the Coordinator and Reviewer, use this structure:

```markdown
### Worker Completion Report

**Task**: <task title>

#### Changes

- <file path>: <description of change>
- <file path>: <description of change>

#### Verification Evidence

- Command: `npm test` -> 42 passed, 0 failed (duration 1.2s)
- Command: `npm run typecheck` -> Clean, 0 errors
- Command: `npm run format:check` -> All matched files styled correctly

#### Notes for Reviewer

- <any critical edge case or decision to verify>
```
