import fs from 'node:fs';
import path from 'node:path';
import { assertContractFile } from './contracts.mjs';
import { abs, ensureDir, exists, readJson, shaFile, writeText } from './fs-utils.mjs';
import { buildFactoryFilePlan } from './factory-plan.mjs';
import { writeManifestLock } from './manifest.mjs';
import { assertPhase, readProjectId, setState, validateState } from './state.mjs';

export function cmdFactoryBootstrap(opts, fail) {
  const target = abs(opts.target || '../target-project');
  assertPhase(target, ['planning-frozen'], 'factory bootstrap', fail);
  const hp = path.join(target, '.harness/planning');
  const handoffPath = path.join(hp, 'build-handoff.json');
  if (!exists(handoffPath)) fail('build-handoff.json이 없습니다.');
  assertContractFile('buildHandoff', handoffPath, fail);
  const handoff = readJson(handoffPath);
  const projectId = readProjectId(target) || handoff.projectId;
  const generated = [];

  for (const file of buildFactoryFilePlan({ projectId, handoff, handoffPath })) {
    const targetPath = path.join(target, file.path);
    writeText(targetPath, file.content);
    if (file.executable) fs.chmodSync(targetPath, 0o755);
    generated.push(file.path);
  }

  ensureDir(path.join(target, '.harness/runs'));
  ensureDir(path.join(target, '.harness/tmp'));

  const manifestPath = writeManifestLock({ target, projectId, handoffPath, generated });
  const factoryPath = path.join(target, '.harness/factory.yml');
  assertContractFile('factory', factoryPath, fail);
  assertContractFile('manifest', manifestPath, fail);
  setState(target, {
    projectId,
    phase: 'factory-ready',
    fail,
    fields: {
      factoryManifestHash: `sha256:${shaFile(path.join(target, '.harness/manifest.lock'))}`
    }
  });
  validateState(target, fail);
  return `Project Factory bootstrapped: ${target}`;
}
