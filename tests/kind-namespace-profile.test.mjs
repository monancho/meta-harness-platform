import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFactoryFilePlan } from '../packages/core/src/factory-plan.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mh-kind-profile-'));
const handoffPath = path.join(tmp, 'build-handoff.json');
fs.writeFileSync(handoffPath, JSON.stringify({ projectId: 'kind-test', projectName: 'Kind Test' }, null, 2));

const baseInput = {
  projectId: 'kind-test',
  handoff: { projectId: 'kind-test', projectName: 'Kind Test' },
  handoffPath
};

function planByPath(enableKindNamespace) {
  return new Map(buildFactoryFilePlan({ ...baseInput, enableKindNamespace }).map(file => [file.path, file]));
}

const defaultPlan = planByPath(false);
assert.equal(defaultPlan.get('.harness/factory.yml').content.includes('localTaskKubernetes: false'), true);
assert.equal(defaultPlan.get('.harness/execution-profiles.yml').content.includes('L2_KIND_NAMESPACE:'), true);
assert.match(defaultPlan.get('.harness/execution-profiles.yml').content, /L2_KIND_NAMESPACE:\n    enabled: false/);
assert.equal([...defaultPlan.keys()].some(filePath => filePath.startsWith('infra/local-task-k8s/')), false);

const kindPlan = planByPath(true);
assert.equal(kindPlan.get('.harness/factory.yml').content.includes('localTaskKubernetes: true'), true);
assert.match(kindPlan.get('.harness/execution-profiles.yml').content, /L2_KIND_NAMESPACE:\n    enabled: true/);
assert.equal(kindPlan.get('.harness/execution-profiles.yml').content.includes('create namespace per run'), true);
assert.equal(kindPlan.get('.harness/execution-profiles.yml').content.includes('cleanup namespace'), true);

for (const filePath of [
  'infra/local-task-k8s/README.md',
  'infra/local-task-k8s/kustomization.yml',
  'infra/local-task-k8s/namespace.yml',
  'infra/local-task-k8s/worker-job.yml',
  'infra/local-task-k8s/preview-job.yml',
  'infra/local-task-k8s/qa-job.yml',
  'infra/local-task-k8s/run-namespace-lifecycle.sh'
]) {
  assert.equal(kindPlan.has(filePath), true, `missing ${filePath}`);
}

const lifecycleScript = kindPlan.get('infra/local-task-k8s/run-namespace-lifecycle.sh');
assert.equal(lifecycleScript.executable, true);
assert.equal(lifecycleScript.content.includes('kubectl create namespace "$NAMESPACE"'), true);
assert.equal(lifecycleScript.content.includes('kubectl delete namespace "$NAMESPACE"'), true);
assert.equal(lifecycleScript.content.includes('worker.log'), true);
assert.equal(lifecycleScript.content.includes('preview.log'), true);
assert.equal(lifecycleScript.content.includes('qa.log'), true);

console.log('[kind-namespace-profile.test] ok');
