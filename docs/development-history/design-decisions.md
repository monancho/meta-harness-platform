# Design Decisions

## Planning First

Factory bootstrap is blocked until planning is frozen. This keeps generated implementation work downstream of explicit planning approval.

## Target Ownership

Target repos own raw planning data, source code, infrastructure, logs, and artifacts. Meta owns generators, templates, schemas, policies, and sanitized improvement signals.

## Worktree First

L0 local git worktree execution is the default isolation path. Higher profiles build on the same task packet and artifact contracts.

## Dependency-Free Dashboard Preview

The dashboard preview uses `apps/dashboard/preview.mjs` instead of a framework package. This keeps smoke tests offline and avoids assuming an `apps/dashboard/package.json`.

## Sanitized Feedback

Eval and signal flows are intentionally sanitized. Raw project data must not be stored in Meta learning outputs.

## Documentation Over Deletion For Ambiguous Cleanup

Runtime artifacts are ignored, but ambiguous local files are documented before removal. See [Release Cleanup Notes](release-cleanup-notes.md).

