# Startup Sweep: from Snapshot to Plan

The sweep returns what each platform says is waiting. A platform field is a claim, not a fact. This document turns the sweep into a plan the user can act on.

---

## 1. Verify every item

Check each item against the thing it describes before it reaches the plan:

- **Approved merge request** → read the merge status and the head pipeline. Approved with a failing pipeline is blocked on whoever owns the failing job.
- **Failing pipeline** → read the failing job's log and name the actual error. "Pipeline failed" is not an item; the error is.
- **Review comment or technical claim** → check it against the code on the branch before agreeing or disagreeing.
- **To-do** → open its target. To-dos outlive closed or reassigned issues.
- **Unanswered message** → read the conversation. An acknowledgement ("thanks", "ok") needs no reply; drop it.
- **Version, price, product or API someone mentions** → look it up from the source.

If a check cannot be finished, the item says what is unverified. Never guess.

## 2. Drop what needs nothing

Remove items whose next step belongs to nobody, and items already handled since the platform last updated. Items waiting on someone else move to a short "waiting on others" list with the person and what they owe.

## 3. Order

1. Blocks another person (a review they wait for, a question that stops their work, a red pipeline on a shared branch).
2. Answered in minutes (a short reply, a merge that is ready, an approval).
3. Needs a block of time (implementation, investigation).
4. New, unstarted work.

## 4. Present

One table, one row per item:

| #   | What | Where | State (evidence) | Next action |
| --- | ---- | ----- | ---------------- | ----------- |

- **Where** is a link from the item's `target.url`.
- **State** carries the evidence in a few words: who approved and when, the actual error, what exactly was asked.
- **Next action** is one concrete verb with an object, never "look into it".
- **Delegation**: mark each row as _worker_, _investigation_, _draft for approval_, or _user only_.

Then the "waiting on others" list and the sweep `errors`.

## 5. Project-specific rules

The protocol and these skills are project-agnostic. A project's own instructions (its `AGENTS.md`, `CLAUDE.md` or project skills) may add verification steps, ordering rules, output language or people to notify. Read and follow them; they win over the defaults above.
