# Portfolio Case Study Draft

## Problem

AI-assisted software work often happens as unstructured chat. It is difficult to audit scope, reproduce runs, enforce security boundaries, or explain what was generated and why.

## Solution

Meta Harness Platform turns agent work into a repo-resident project factory. A Target Repo receives planning contracts, task packets, scoped execution, verification commands, security gates, and run artifacts.

## Highlights

- Planning-first lifecycle and state machine.
- Task packet contract with editable and forbidden scopes.
- Local git worktree runner that preserves artifacts.
- Dependency-free dashboard preview for review surfaces.
- Sanitized eval and signal skeletons that avoid raw project data retention.

## Demo Path

```bash
npm run doctor
npm run demo:e2e
npm run smoke
npm run dashboard:preview
```

## Positioning

This is a DevTool portfolio project focused on governance, reproducibility, and practical agent boundaries rather than a claim of full autonomy.

