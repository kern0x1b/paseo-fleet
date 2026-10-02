# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `fleet sweep`: collects `snapshot` output from every adapter, merges items by `urn`, and keeps a cursor (`lastSweepAt`) with a 24-hour minimum lookback.
- Snapshot (pull) contract in the protocol specification and the adapter author guide.
- Coordinator startup sweep: verification rules, ordering and plan format (`skills/coordinator/references/startup-sweep.md`).

### Changed

- `start-fleet-coordinator` sweeps, verifies and plans waiting work before listening for events.
- Coordinator Authority Rules: outbound writes (messages, comments, pushes, merge requests, merges) require explicit user approval of the draft.

## [1.0.0] - 2026-10-02

### Added

- Standardized, model-agnostic fleet role skills:
  - `skills/coordinator/` — Inbound triage, capability probe, worktree dispatch, and outbound notification.
  - `skills/worker/` — Isolated worktree execution, TDD implementation, and verification reports.
  - `skills/reviewer/` — Independent adversarial code review, quality gating, and approval rubrics.
  - `skills/fleet-setup/` — Autonomous agent setup for zero-manual fleet configuration.
- Open **Paseo Fleet Protocol (v1)** specification, JSON Schemas, author guide, and reference event payloads.
- Standalone `fleet` CLI for managing coordinator bindings, channel registries, and synthetic health checks.
- Automated test suite covering CLI, channel manifest management, and protocol envelope validation.
