# Demo Video Script

Use this script for a 3-5 minute portfolio demo. It is written for a local Dev Container recording and avoids network-dependent steps.

## Setup Before Recording

Open the repository in the Dev Container and start from the repository root:

```bash
cd /workspaces/meta-harness-platform
git status --short
```

If you want a clean named demo output, remove only the temporary output outside the repository before recording:

```bash
rm -rf /tmp/mh-e2e-review
```

Do not record secrets, environment files, or private project data. This demo uses checked-in fixtures only.

## Exact Command Sequence

Run these commands during the recording:

```bash
node ./bin/mh.mjs doctor
bash ./examples/e2e-demo/run-demo.sh /tmp/mh-e2e-review
find /tmp/mh-e2e-review/target-project -maxdepth 3 -type f | sort | sed -n '1,80p'
sed -n '1,160p' /tmp/mh-e2e-review/target-project/.harness/state.yml
find /tmp/mh-e2e-review/target-project/.harness/runs -maxdepth 3 -type f | sort
bash ./tests/smoke.sh
npm run dashboard:preview
```

Stop the dashboard preview with `Ctrl-C` after showing the browser view.

## 3-5 Minute Narrative

### 0:00-0:30 - Position The Project

"Meta Harness Platform is a starter for an agentic software factory. It is not the target app itself. Its job is to generate and upgrade a development factory inside a Target Project Repo while keeping ownership clear."

Show the top of the README:

```bash
sed -n '1,90p' README.md
```

Key point to say: Meta owns templates, generators, schemas, policies, evals, and sanitized improvement signals. The Target Repo owns planning docs, code, infra, run artifacts, and review output.

### 0:30-1:10 - Prove The CLI Is Available

Run:

```bash
node ./bin/mh.mjs doctor
```

Say: "The doctor command is the quick health check. For the demo I use only local commands and checked-in fixtures, so the path is reproducible in a Dev Container."

### 1:10-2:20 - Run The End-To-End Demo

Run:

```bash
bash ./examples/e2e-demo/run-demo.sh /tmp/mh-e2e-review
```

Narrate the lifecycle:

```text
empty output directory
-> planning scaffold
-> planning synthesis from fixture answers
-> acceptance and task packet compile
-> planning freeze
-> factory bootstrap
-> shell adapter run
-> run artifacts
```

Say: "The important guardrail is planning-first. The factory is created only after planning is frozen."

### 2:20-3:00 - Inspect The Generated Target Repo

Run:

```bash
find /tmp/mh-e2e-review/target-project -maxdepth 3 -type f | sort | sed -n '1,80p'
sed -n '1,160p' /tmp/mh-e2e-review/target-project/.harness/state.yml
```

Point out:

- `docs/planning/**` belongs to the Target Repo.
- `.harness/**` inside the generated target stores factory state and contracts.
- The Target Repo has its own `AGENTS.md`, adapters, budgets, execution profiles, and manifest.

### 3:00-3:35 - Inspect Run Artifacts

Run:

```bash
find /tmp/mh-e2e-review/target-project/.harness/runs -maxdepth 3 -type f | sort
```

Say: "A run leaves reviewable artifacts like `patch.diff`, `run-result.json`, `summary.md`, and `sanitized-signal.json`. The sanitized signal is the only kind of learning feedback Meta should keep. Raw patches, logs, PRDs, code, and secrets stay in the Target Repo."

### 3:35-4:20 - Show Verification

Run:

```bash
bash ./tests/smoke.sh
```

Say: "The smoke test covers the local lifecycle, security failure cases, upgrade dry-run behavior, eval and feedback skeletons, dashboard fixture loaders, release and maintenance reports, and the E2E demo fixture shape."

### 4:20-5:00 - Show Review Surface And Close

Run:

```bash
npm run dashboard:preview
```

Open `http://localhost:4173` if it is not opened automatically.

Say: "The dashboard is a static MVP backed by sanitized fixtures. It is here to show the review surface: run history, artifacts, patch diffs, manifest state, and policy warnings. The honest status is starter-to-MVP skeleton, with a roadmap toward beta and full harness maturity."

Close with: "The portfolio value is the system boundary: scoped agent work, deterministic local execution, policy gates, and artifacts a reviewer can inspect."

## If Time Is Short

Use only:

```bash
node ./bin/mh.mjs doctor
bash ./examples/e2e-demo/run-demo.sh /tmp/mh-e2e-review
find /tmp/mh-e2e-review/target-project/.harness/runs -maxdepth 3 -type f | sort
```

Then describe the dashboard from [docs/PORTFOLIO.md](PORTFOLIO.md) instead of launching it.

