# Review Rubric & Audit Checklist

Review every Worker submission against these 5 pillars:

### 1. Correctness & Requirements

- [ ] Does the implementation satisfy all acceptance criteria stated by the Coordinator?
- [ ] Are edge cases and error states handled gracefully?

### 2. Test Quality & Coverage

- [ ] Are new tests added covering the changed logic?
- [ ] Do tests assert meaningful behavior rather than trivial mock returns?
- [ ] Does the entire test suite pass cleanly?

### 3. Architecture & Conventions

- [ ] Does the code follow repository invariants (e.g. self-documenting code, comment-free, conventional commits)?
- [ ] Are boundaries between modules preserved without leaky abstractions?

### 4. Security & Privacy

- [ ] No tokens, credentials, or private paths hardcoded or logged.
- [ ] All untrusted inputs validated (e.g. Zod schemas, escaping).

### 5. Verdict Formatting

Format the conclusion of the review clearly:

```markdown
### Review Verdict: APPROVED

(or CHANGES_REQUESTED)

#### Summary of Assessment

<concise assessment>

#### Action Items (if CHANGES_REQUESTED)

1. `src/auth.js:42`: Handle `null` token case to prevent TypeError.
2. `test/auth.test.js`: Add test case for expired token refresh.
```
