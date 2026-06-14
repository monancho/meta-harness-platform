import path from 'node:path';
import { parseSimpleYaml, assertContractFile } from './contracts.mjs';
import { readText, sha, writeText } from './fs-utils.mjs';

export const EMPTY_PHASE = 'empty';

export const ALLOWED_TRANSITIONS = Object.freeze({
  [EMPTY_PHASE]: ['planning-scaffolded'],
  'planning-scaffolded': ['planning-frozen'],
  'planning-frozen': ['factory-ready'],
  'factory-ready': ['runnable'],
  runnable: ['runnable']
});

export function statePath(target) {
  return path.join(target, '.harness/state.yml');
}

export function readState(target) {
  const s = readText(statePath(target), '');
  if (!s.trim()) return null;
  const parsed = parseSimpleYaml(s);
  return parsed.projectState || null;
}

export function getPhase(target) {
  return readState(target)?.phase || null;
}

export function canTransition(fromPhase, toPhase) {
  return (ALLOWED_TRANSITIONS[fromPhase] || []).includes(toPhase);
}

export function assertTransition(target, toPhase, fail) {
  const fromPhase = getPhase(target) || EMPTY_PHASE;
  if (!canTransition(fromPhase, toPhase)) {
    fail(`illegal phase transition: ${fromPhase} -> ${toPhase}`);
  }
  return fromPhase;
}

export function assertPhase(target, allowedPhases, commandName, fail) {
  const phase = getPhase(target) || EMPTY_PHASE;
  if (!allowedPhases.includes(phase)) {
    fail(`${commandName} requires phase=${allowedPhases.join('|')}. current=${phase}`);
  }
  return phase;
}

export function formatState({ projectId, phase, fromPhase, fields = {} }) {
  const fieldKeys = Object.keys(fields).sort();
  const fieldFingerprint = fieldKeys.map((key) => `${key}=${fields[key]}`).join('\n');
  const transitionHash = `sha256:${sha(`${projectId}\n${fromPhase}\n${phase}\n${fieldFingerprint}`)}`;
  const lines = [
    'schemaVersion: 1',
    'projectState:',
    `  projectId: ${projectId}`,
    `  phase: ${phase}`,
    `  updatedAt: deterministic:${transitionHash}`,
    `  transitionFrom: ${fromPhase}`,
    `  transitionHash: ${transitionHash}`
  ];
  for (const key of fieldKeys) {
    lines.push(`  ${key}: ${fields[key]}`);
  }
  return `${lines.join('\n')}\n`;
}

export function setState(target, { projectId, phase, fields = {}, fail = (msg) => { throw new Error(msg); } }) {
  const fromPhase = assertTransition(target, phase, fail);
  const content = formatState({ projectId, phase, fromPhase, fields });
  writeText(statePath(target), content);
}

export function validateState(target, fail) {
  assertContractFile('state', statePath(target), fail);
}

export function readProjectId(target) {
  const txt = readText(path.join(target, '.harness/project.yml'), '');
  const m = txt.match(/id:\s*([a-zA-Z0-9_-]+)/);
  return m ? m[1] : 'demo';
}
