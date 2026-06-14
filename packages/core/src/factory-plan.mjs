import { VERSION } from './constants.mjs';
import { shaFile } from './fs-utils.mjs';
import { targetRunnerCode } from './runner-template.mjs';

function jsonContent(obj) {
  return JSON.stringify(obj, null, 2) + '\n';
}

function boolText(value) {
  return value ? 'true' : 'false';
}

function buildKindNamespaceFiles() {
  return [
    ['infra/local-task-k8s/README.md', `# Local Task Kubernetes Profile

This directory is generated only when \`factory bootstrap --enable-kind-namespace\` is used.
It is a skeleton for the optional \`L2_KIND_NAMESPACE\` execution profile and does not require
a live Kubernetes cluster during generation.

## Namespace-per-run Lifecycle

1. Create one namespace for the run, for example \`mh-run-<run-id>\`.
2. Apply the worker job that executes the selected task packet.
3. Apply preview and QA jobs for multi-service validation.
4. Collect artifacts from job logs and shared artifact paths into \`.harness/runs/<run-id>/\`.
5. Cleanup the namespace after artifacts are collected.

The default profile remains \`L0_LOCAL_WORKTREE\`. Use this profile only after explicitly
enabling it in \`.harness/execution-profiles.yml\` and wiring a real kind cluster runner.
`],
    ['infra/local-task-k8s/kustomization.yml', `resources:
  - namespace.yml
  - worker-job.yml
  - preview-job.yml
  - qa-job.yml
`],
    ['infra/local-task-k8s/namespace.yml', `apiVersion: v1
kind: Namespace
metadata:
  name: mh-run-placeholder
  labels:
    app.kubernetes.io/name: meta-harness-local-task
    meta-harness.dev/profile: L2_KIND_NAMESPACE
`],
    ['infra/local-task-k8s/worker-job.yml', `apiVersion: batch/v1
kind: Job
metadata:
  name: mh-worker
  namespace: mh-run-placeholder
  labels:
    meta-harness.dev/stage: worker
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: worker
          image: node:22
          workingDir: /workspace
          command: ["node", ".harness/bin/runner.mjs"]
          args: ["--task", "$(MH_TASK_PATH)", "--adapter", "$(MH_ADAPTER)", "--execution-profile", "L2_KIND_NAMESPACE"]
          env:
            - name: MH_TASK_PATH
              value: ".harness/tasks/example.task.json"
            - name: MH_ADAPTER
              value: "shell"
`],
    ['infra/local-task-k8s/preview-job.yml', `apiVersion: batch/v1
kind: Job
metadata:
  name: mh-preview
  namespace: mh-run-placeholder
  labels:
    meta-harness.dev/stage: preview
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: preview
          image: node:22
          workingDir: /workspace
          command: ["npm", "run", "preview", "--if-present"]
`],
    ['infra/local-task-k8s/qa-job.yml', `apiVersion: batch/v1
kind: Job
metadata:
  name: mh-qa
  namespace: mh-run-placeholder
  labels:
    meta-harness.dev/stage: qa
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: qa
          image: node:22
          workingDir: /workspace
          command: ["npm", "test"]
`],
    ['infra/local-task-k8s/run-namespace-lifecycle.sh', `#!/usr/bin/env bash
set -euo pipefail

RUN_ID="\${1:-run-local}"
NAMESPACE="mh-\${RUN_ID}"
ARTIFACT_DIR=".harness/runs/\${RUN_ID}"

mkdir -p "$ARTIFACT_DIR"
kubectl create namespace "$NAMESPACE"
trap 'kubectl delete namespace "$NAMESPACE" --ignore-not-found=true' EXIT

sed "s/mh-run-placeholder/$NAMESPACE/g" infra/local-task-k8s/worker-job.yml | kubectl apply -f -
sed "s/mh-run-placeholder/$NAMESPACE/g" infra/local-task-k8s/preview-job.yml | kubectl apply -f -
sed "s/mh-run-placeholder/$NAMESPACE/g" infra/local-task-k8s/qa-job.yml | kubectl apply -f -

kubectl -n "$NAMESPACE" wait --for=condition=complete job/mh-worker job/mh-preview job/mh-qa --timeout=20m
kubectl -n "$NAMESPACE" logs job/mh-worker > "$ARTIFACT_DIR/worker.log"
kubectl -n "$NAMESPACE" logs job/mh-preview > "$ARTIFACT_DIR/preview.log"
kubectl -n "$NAMESPACE" logs job/mh-qa > "$ARTIFACT_DIR/qa.log"
`, { executable: true }]
  ];
}

export function buildFactoryFilePlan({ projectId, handoff, handoffPath, enableKindNamespace = false }) {
  const files = [
    ['package.json', jsonContent({ name: projectId, version: '0.1.0', private: true, type: 'module', scripts: { test: "node -e \"console.log('test ok')\"", lint: "node -e \"console.log('lint ok')\"", typecheck: "node -e \"console.log('typecheck ok')\"" } })],
    ['apps/web/src/index.ts', `export const appName = ${JSON.stringify(handoff.projectName || projectId)};\n`],
    ['apps/api/src/server.ts', `export function health(){ return { ok: true }; }\n`],
    ['packages/shared/src/index.ts', `export const shared = true;\n`],
    ['packages/contracts/README.md', `# Contracts\n\nAPI contracts and shared schemas live here.\n`],
    ['infra/docker/compose.dev.yml', `services:\n  web:\n    image: node:22\n    working_dir: /workspace\n    volumes:\n      - ../../:/workspace\n    command: node -e \"console.log('dev placeholder')\"\n`],
    ['infra/docker/compose.preview.yml', `services:\n  preview:\n    image: node:22\n    working_dir: /workspace\n    volumes:\n      - ../../:/workspace\n    command: node -e \"console.log('preview placeholder')\"\n`],
    ['infra/docker/compose.prod.yml', `services:\n  app:\n    image: node:22\n    command: node -e \"console.log('prod placeholder')\"\n`],
    ['infra/caddy/Caddyfile', `:8080 {\n  respond \"Meta Harness preview placeholder\"\n}\n`],
    ['.devcontainer/devcontainer.json', jsonContent({ name: 'target-project-factory', image: 'mcr.microsoft.com/devcontainers/typescript-node:22', workspaceFolder: '/workspace' })],
    ['.codex/config.toml', `# Project-scoped Codex config placeholder\n# Keep credentials in user-level config or runtime secrets, not here.\n`],
    ['AGENTS.md', `# AGENTS.md — Target Project Factory Instructions

## Role

<!-- BEGIN META-HARNESS MANAGED BLOCK: target-factory-instructions -->
You are working inside a **Target Project Repo** generated by Meta Harness.
This repository is the source of truth for its own planning, code, infrastructure, CI/CD, and run artifacts.

## Required read order

1. AGENTS.md
2. .harness/state.yml
3. .harness/factory.yml
4. .harness/planning/build-handoff.json
5. .harness/planning/acceptance-criteria.json
6. The selected .harness/tasks/*.task.json
7. .harness/security/runtime-policy.yml

## Allowed behavior

- Implement only the selected task packet.
- Modify only paths in editableScope.
- Run only verification commands listed in the task packet or project scripts.
- Produce patch/report/artifacts under .harness/runs/<run-id>/.

## Forbidden behavior

Never edit:

- .env*
- infra/**/production/**
- .github/workflows/deploy-prod.yml
- long-lived credentials

Never send raw docs/code/logs to Meta Harness. Only sanitized signals are allowed.

## Definition of Done

A task is complete when:

- acceptance criteria are satisfied
- lint/typecheck/test pass or failure is reported clearly
- no forbidden path is modified
- patch.diff, run-result.json, summary.md, and sanitized-signal.json are produced
<!-- END META-HARNESS MANAGED BLOCK: target-factory-instructions -->
`],
    ['CLAUDE.md', `@AGENTS.md\n`],
    ['.github/workflows/ci.yml', `# BEGIN META-HARNESS MANAGED BLOCK: ci-workflow\nname: ci\non:\n  pull_request:\n  push:\n    branches: [main]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm test\n# END META-HARNESS MANAGED BLOCK: ci-workflow\n`],
    ['.github/workflows/harness-run.yml', `# BEGIN META-HARNESS MANAGED BLOCK: harness-run-workflow\nname: harness-run

on:
  workflow_dispatch:
    inputs:
      task_path:
        description: Task packet path relative to the target repo
        required: true
        default: .harness/tasks/example.task.json
      adapter:
        description: Agent adapter to execute
        required: true
        type: choice
        default: shell
        options:
          - shell
          - codex
      execution_profile:
        description: Execution profile marker for this CI wrapper
        required: true
        type: choice
        default: L3_GITHUB_ACTION
        options:
          - L3_GITHUB_ACTION
      enabled:
        description: Set true to run; false keeps the profile disabled by default
        required: true
        type: boolean
        default: false

permissions:
  contents: read

jobs:
  harness-run:
    if: \${{ inputs.enabled == true }}
    runs-on: ubuntu-latest
    env:
      MH_EXECUTION_PROFILE: \${{ inputs.execution_profile }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Run harness task
        run: node .harness/bin/runner.mjs --task "\${{ inputs.task_path }}" --adapter "\${{ inputs.adapter }}"

      - name: Locate latest run
        if: always()
        id: latest-run
        shell: bash
        run: |
          latest="$(find .harness/runs -mindepth 1 -maxdepth 1 -type d -name 'run-*' -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -n 1 | cut -d' ' -f2-)"
          if [ -n "$latest" ]; then
            echo "path=$latest" >> "$GITHUB_OUTPUT"
            echo "id=$(basename "$latest")" >> "$GITHUB_OUTPUT"
          fi

      - name: Mirror local run summary
        if: always() && steps.latest-run.outputs.path != ''
        shell: bash
        run: |
          {
            echo "## Harness Run"
            echo ""
            echo "- Run ID: \${{ steps.latest-run.outputs.id }}"
            echo "- Task: \${{ inputs.task_path }}"
            echo "- Adapter: \${{ inputs.adapter }}"
            echo "- Execution profile: \${{ inputs.execution_profile }}"
            echo ""
            if [ -f "\${{ steps.latest-run.outputs.path }}/summary.md" ]; then
              cat "\${{ steps.latest-run.outputs.path }}/summary.md"
            else
              echo "summary.md was not produced."
            fi
          } >> "$GITHUB_STEP_SUMMARY"

      - name: Upload harness run artifacts
        if: always() && steps.latest-run.outputs.path != ''
        uses: actions/upload-artifact@v4
        with:
          name: harness-run-\${{ steps.latest-run.outputs.id }}
          if-no-files-found: warn
          path: |
            \${{ steps.latest-run.outputs.path }}/patch.diff
            \${{ steps.latest-run.outputs.path }}/run-result.json
            \${{ steps.latest-run.outputs.path }}/summary.md
            \${{ steps.latest-run.outputs.path }}/sanitized-signal.json
# END META-HARNESS MANAGED BLOCK: harness-run-workflow
`],
    ['Makefile', `dev:\n\t@echo \"dev placeholder\"\n\npreview:\n\t@echo \"preview placeholder\"\n\ntest:\n\tnpm test\n\nlint:\n\tnpm run lint\n\ntypecheck:\n\tnpm run typecheck\n\nharness-run:\n\tnode .harness/bin/runner.mjs --task $(TASK) --adapter $(ADAPTER)\n`],
    ['.harness/bin/runner.mjs', targetRunnerCode(), { executable: true }],
    ['.harness/factory.yml', `schemaVersion: 1\nfactory:\n  id: ${projectId}\n  version: 0.1.0\n  generatedBy: meta-harness-platform-starter\n  generatorVersion: ${VERSION}\ngeneratedFrom:\n  buildHandoff: .harness/planning/build-handoff.json\n  buildHandoffHash: sha256:${shaFile(handoffPath)}\ncapabilities:\n  planning: true\n  bootstrap: true\n  mvpBuild: true\n  localWorktreeRunner: true\n  localTaskKubernetes: ${boolText(enableKindNamespace)}\n  githubActions: true\n`],
    ['.harness/execution-profiles.yml', `defaultProfile: L0_LOCAL_WORKTREE\nprofiles:\n  L0_LOCAL_WORKTREE:\n    enabled: true\n    isolation:\n      filesystem: git-worktree-or-fallback\n      network: inherited-restricted\n      secrets: filtered-env\n    artifacts:\n      - patch.diff\n      - run-result.json\n      - summary.md\n      - sanitized-signal.json\n  L1_CONTAINER_WORKER:\n    enabled: false\n  L2_KIND_NAMESPACE:\n    enabled: ${boolText(enableKindNamespace)}\n    optInFlag: --enable-kind-namespace\n    templates: infra/local-task-k8s\n    cluster: kind\n    lifecycle:\n      - create namespace per run\n      - run worker job\n      - run preview job\n      - run QA job\n      - collect artifacts\n      - cleanup namespace\n    notes:\n      - Disabled by default; generated Kubernetes templates require explicit bootstrap opt-in.\n      - Skeleton only; config generation and tests do not require a live Kubernetes cluster.\n  L3_GITHUB_ACTION:\n    enabled: false\n    trigger: workflow_dispatch\n    workflow: .github/workflows/harness-run.yml\n    runner: github-hosted-ubuntu\n    wrapsProfile: L0_LOCAL_WORKTREE\n    inputs:\n      - task_path\n      - adapter\n      - execution_profile\n    permissions:\n      contents: read\n    artifacts:\n      - patch.diff\n      - run-result.json\n      - summary.md\n      - sanitized-signal.json\n    notes:\n      - PR comments, checks, branch writes, and remote patch application are staged behind later hardening.\n`],
    ['.harness/agents/adapters.yml', `schemaVersion: 1\ndefaultAdapter: shell\ninterface:\n  lifecycle: prepare-execute-collectArtifacts-summarize\n  methods: prepare, execute, collectArtifacts, summarize\nadapters:\n  shell:\n    enabled: true\n    type: local-shell-mvp\n    implementation: builtin:shell\n    status: default\n  codex:\n    enabled: true\n    type: codex-exec\n    implementation: builtin:codex\n    binary: codex\n    status: available-if-codex-cli-installed\n  claude:\n    enabled: false\n    type: claude-code\n    implementation: placeholder\n    status: disabled-placeholder\n  openhands:\n    enabled: false\n    type: openhands\n    implementation: placeholder\n    status: disabled-placeholder\n`],
    ['.harness/security/runtime-policy.yml', `phases:\n  setup:\n    network:\n      default: deny\n      allow:\n        - registry.npmjs.org\n        - api.github.com\n  worker:\n    network:\n      default: deny\n    forbiddenWrites:\n      - .env*\n      - **/*.pem\n      - **/*secret*\n      - **/*token*\n      - infra/**/production/**\n      - .github/workflows/deploy-prod.yml\n    commandPolicy:\n      default: deny\n      allow:\n        - node *\n        - npm test\n        - npm run *\n        - bash ./tests/*\n        - make *\n      deny:\n        - git push*\n        - npm publish*\n        - docker login*\n        - rm -rf .git*\n`],
    ['.harness/budgets.yml', `budgets:\n  default:\n    maxRuntimeMinutes: 20\n    maxRetries: 1\n    maxChangedFiles: 20\n    maxPatchLines: 800\n`],
    ['.harness/tasks/example.task.json', jsonContent({
      schemaVersion: '1.0.0',
      taskId: 'ISSUE-001',
      taskType: 'frontend-ui',
      priority: 'P2',
      title: 'Harness run loop proof task',
      objective: 'Create a small generated frontend feature file to prove the harness run loop.',
      editableScope: ['apps/web/src/**', 'packages/shared/**', 'docs/**', 'tests/**'],
      forbiddenScope: ['.env*', 'infra/**/production/**', '.github/workflows/deploy-prod.yml'],
      acceptanceCriteria: [{ id: 'AC-001', text: 'The harness run creates patch.diff, run-result.json, summary.md, and sanitized-signal.json.' }],
      verifyCommands: ["node -e \"console.log('lint ok')\"", "node -e \"console.log('typecheck ok')\"", "node -e \"console.log('test ok')\""],
      commands: { verify: ["node -e \"console.log('lint ok')\"", "node -e \"console.log('typecheck ok')\"", "node -e \"console.log('test ok')\""] },
      budgets: { maxRuntimeMinutes: 20, maxRetries: 1, maxChangedFiles: 20, maxPatchLines: 800 },
      expectedArtifacts: ['patch.diff', 'run-result.json', 'summary.md', 'sanitized-signal.json']
    })]
  ];
  if (enableKindNamespace) files.push(...buildKindNamespaceFiles());
  return files.map(([path, content, options = {}]) => ({ path, content, ...options }));
}
