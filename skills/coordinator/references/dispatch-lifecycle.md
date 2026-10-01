# Coordinator Dispatch Lifecycle

This document describes the step-by-step state machine for executing work through Worker and Reviewer agents in Paseo.

---

## State Diagram

```
[Inbound Event]
       │
       ▼
   (TRIAGE) ────► Can answer directly? ──► [Respond via reply_action]
       │ (Yes, simple question)
       ▼ (No, requires code work)
(PROVISION_WORKSPACE)
       │ Call create_workspace({ isolation: "worktree", mode: "branch-off", ... })
       ▼
(SPAWN_WORKER)
       │ Call create_agent({ workspaceId, title: "Worker: ...", initialPrompt })
       ▼
 (WAIT_WORKER) ◄─── Worker executes TDD & tests
       │
       ├─► Worker failed / errored ──► (HANDLE_FAILURE)
       │
       ▼ Worker complete with diff artifact
(SPAWN_REVIEWER)
       │ Call create_agent({ workspaceId, title: "Reviewer: ...", initialPrompt })
       ▼
 (WAIT_REVIEW)
       │
       ├─► Verdict: CHANGES_REQUESTED ──► Send feedback back to Worker
       │
       ▼ Verdict: APPROVED
(FINALIZE_AND_NOTIFY)
       │
       ▼ Push branch / notify user via reply_action
     [DONE]
```

---

## Detailed Steps

### Step 1: Provisioning Isolated Workspace

Always isolate feature branches and fixes from the main project root:

```javascript
const workspace = await paseo.create_workspace({
  isolation: 'worktree',
  mode: 'branch-off',
  branchName: `fix/${issueId}-reproduce`,
  baseBranch: 'origin/main',
  worktreeSlug: `worker-${issueId}`,
});
```

### Step 2: Spawning the Worker

Select the Worker profile (using `list_profiles` if configured) and pass strict objectives:

- Exact problem description;
- Expected acceptance criteria;
- Requirement to run local test suites and provide proof before signaling completion.

### Step 3: Spawning the Reviewer

The Reviewer must evaluate:

- Diff between the branch and `baseBranch`;
- Verification command output;
- Security checks and absence of regressions.
