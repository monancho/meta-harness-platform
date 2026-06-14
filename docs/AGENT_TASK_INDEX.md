# Agent Task Index

This index describes the implementation order for agents. It now covers the path from the current starter to MVP, beta, and full harness.

## Milestone map

| Milestone | Tasks | Outcome |
|---|---|---|
| M0 Agent-ready starter | MH-001 ~ MH-004 | Maintainable codebase, schemas, state machine, manifest ownership. |
| M1 Local MVP harness | MH-005 ~ MH-010 | Real L0 worktree runner, task packets, policies, adapters, PR loop skeleton. |
| M2 Dashboard and security | MH-011 ~ MH-014 | Dashboard foundation, run/artifact/patch viewers, executable security gates. |
| M3 Upgrade and execution profiles | MH-015 ~ MH-019 | Upgrade dry-run, managed blocks, GitHub Actions, container, and kind profiles. |
| M4 Evals, feedback, productization | MH-020 ~ MH-025 | Eval registry, sanitized feedback, productization/release/maintenance harnesses. |
| M5 Portfolio delivery | MH-026 ~ MH-028 | End-to-end demo, landing page, demo video script, README polish. |

## Ordered task queue

| Order | Task | Priority | Purpose |
|---:|---|---|---|
| 1 | MH-001 | P0 | Split the starter into maintainable implementation modules. |
| 2 | MH-002 | P0 | Add schemas and validation. |
| 3 | MH-003 | P0 | Enforce lifecycle state transitions. |
| 4 | MH-004 | P0 | Make manifest.lock a generated-file ownership contract. |
| 5 | MH-005 | P0 | Implement real local worktree execution. |
| 6 | MH-006 | P1 | Harden task packet compilation. |
| 7 | MH-007 | P1 | Enforce security policies. |
| 8 | MH-008 | P1 | Add adapter abstraction. |
| 9 | MH-009 | P2 | Implement Codex adapter path. |
| 10 | MH-010 | P2 | Add minimal GitHub PR loop. |
| 11 | MH-011 | P2 | Create the dashboard foundation. |
| 12 | MH-012 | P2 | Show run history and artifact files. |
| 13 | MH-013 | P2 | Render patch diffs safely. |
| 14 | MH-014 | P1 | Make security gates executable. |
| 15 | MH-015 | P2 | Report upgrade changes without modifying files. |
| 16 | MH-016 | P2 | Update generated blocks without overwriting user-owned content. |
| 17 | MH-017 | P3 | Add remote CI execution profile skeleton. |
| 18 | MH-018 | P3 | Add container worker profile skeleton. |
| 19 | MH-019 | P4 | Add optional kind namespace profile skeleton. |
| 20 | MH-020 | P3 | Create eval registry foundation. |
| 21 | MH-021 | P3 | Export privacy-preserving run signals. |
| 22 | MH-022 | P3 | Analyze sanitized failure patterns. |
| 23 | MH-023 | P4 | Add productization audit workflow. |
| 24 | MH-024 | P4 | Add release readiness workflow. |
| 25 | MH-025 | P4 | Add maintenance workflow skeleton. |
| 26 | MH-026 | P2 | Build end-to-end demo project. |
| 27 | MH-027 | P3 | Create portfolio landing page. |
| 28 | MH-028 | P3 | Prepare demo script and README polish. |

Start with MH-001 unless the user explicitly requests another task. For portfolio MVP, reach at least MH-006 plus MH-011. For a usable beta, reach MH-014. For the full planned harness, complete MH-028.
