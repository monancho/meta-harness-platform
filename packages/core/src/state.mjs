import path from 'node:path';
import { readText, writeText } from './fs-utils.mjs';

export function statePath(target) {
  return path.join(target, '.harness/state.yml');
}

export function getPhase(target) {
  const s = readText(statePath(target), '');
  const m = s.match(/phase:\s*([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export function setState(target, { projectId, phase, extra = '' }) {
  const content = `schemaVersion: 1\nprojectState:\n  projectId: ${projectId}\n  phase: ${phase}\n  updatedAt: ${new Date().toISOString()}\n${extra}`;
  writeText(statePath(target), content);
}

export function readProjectId(target) {
  const txt = readText(path.join(target, '.harness/project.yml'), '');
  const m = txt.match(/id:\s*([a-zA-Z0-9_-]+)/);
  return m ? m[1] : 'demo';
}
