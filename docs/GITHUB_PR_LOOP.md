# GitHub PR Loop

Meta Harness keeps the first GitHub loop intentionally small. A harness run already owns the portable artifacts:

- `.harness/runs/<run-id>/patch.diff`
- `.harness/runs/<run-id>/run-result.json`
- `.harness/runs/<run-id>/summary.md`

`mh github pr` turns those artifacts into a PR-ready summary first, then optionally asks `gh` to create a pull request.

## G0 Local Patch

G0 is the default and requires no network or GitHub CLI.

```bash
node ./bin/mh.mjs github pr --target <target-repo> --run <run-id>
```

Expected result:

- prints PR body markdown to stdout
- writes `.harness/runs/<run-id>/pr-body.md`
- does not create a branch
- does not commit
- does not contact GitHub

This is the smoke-test path and remains valid even when `gh` is not installed.

## G1 gh PR

G1 is opt-in and uses the local git repository plus GitHub CLI.

```bash
node ./bin/mh.mjs github pr --target <target-repo> --run <run-id> --create
```

Expected progression:

1. read `run-result.json`, `summary.md`, and `patch.diff`
2. write `pr-body.md`
3. create or reset a local branch named `mh/<task-id>/<run-id>`
4. apply `patch.diff`
5. create a local commit
6. run `gh pr create --base <base> --head <branch> --title <title> --body-file <pr-body.md>`

If `gh` is unavailable, the command fails with an actionable message and tells the operator to install/authenticate GitHub CLI or rerun without `--create` for G0 output.

Current skeleton does not run `git push`. The branch must already be visible to GitHub or handled manually before `gh pr create` can succeed in a real remote workflow.

## G2 GitHub Actions

G2 is future work. The intended direction is:

- GitHub Actions receives or creates a run artifact bundle
- the action applies `patch.diff` in an isolated checkout
- the action creates branch, commit, PR, and comments
- PR artifacts link back to `run-result.json`, `summary.md`, and any test reports

G2 must remain downstream of the L0 local worktree runner so local runs stay deterministic and smoke tests do not require network access.
