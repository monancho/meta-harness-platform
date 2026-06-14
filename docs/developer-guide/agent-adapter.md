# Agent Adapter

Agent adapters provide a normalized execution boundary for different workers.

Current direction:

1. Shell adapter as deterministic local baseline.
2. Local git worktree runner for L0 isolation.
3. Codex adapter skeleton and missing-binary path.
4. GitHub PR loop skeleton.
5. Container and kind execution profile skeletons.

A task packet remains the contract regardless of adapter. It carries editable scope, forbidden scope, verification commands, budgets, acceptance criteria, and expected artifacts.

Do not weaken task scope checks to make an adapter pass. Adapter failures should be reported as structured run results or explicit CLI errors.

