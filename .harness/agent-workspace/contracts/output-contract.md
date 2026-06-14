# Agent Output Contract

For every implementation task, the agent must provide a final summary with:

```text
Task ID:
Files changed:
Behavior changed:
Tests run:
Acceptance criteria:
Remaining gaps:
```

If tests fail, include:

```text
Failing command:
Observed error:
Likely cause:
Next fix:
```

Do not claim completion if any acceptance criterion remains unmet.
