import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CONTRACT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../schemas');

export const CONTRACTS = {
  state: 'state.contract.json',
  factory: 'factory.contract.json',
  manifest: 'manifest.contract.json',
  taskPacket: 'task-packet.contract.json',
  runResult: 'run-result.contract.json',
  buildHandoff: 'build-handoff.contract.json'
};

export const SCHEMA_ERROR_CODE = 'MH_SCHEMA_VALIDATION_FAILED';

function readContract(name) {
  const file = CONTRACTS[name];
  if (!file) throw new Error(`unknown contract: ${name}`);
  return JSON.parse(fs.readFileSync(path.join(CONTRACT_ROOT, file), 'utf8'));
}

function coerceYamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  return trimmed.replace(/^["']|["']$/g, '');
}

export function parseSimpleYaml(text) {
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue;
    const match = rawLine.match(/^(\s*)([^:]+):(.*)$/);
    if (!match) continue;
    const indent = match[1].length;
    const key = match[2].trim();
    const rawValue = match[3];
    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1).value;
    if (rawValue.trim() === '') {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      parent[key] = coerceYamlScalar(rawValue);
    }
  }

  return root;
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function validateValue(value, schema, location, errors) {
  if (!schema) return;

  if (schema.type && typeOf(value) !== schema.type) {
    errors.push(`${location} expected ${schema.type}, got ${typeOf(value)}`);
    return;
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${location} must be one of: ${schema.enum.join(', ')}`);
  }

  if (schema.minLength && typeof value === 'string' && value.length < schema.minLength) {
    errors.push(`${location} must not be empty`);
  }

  if (schema.pattern && typeof value === 'string' && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${location} must match ${schema.pattern}`);
  }

  if (schema.type === 'object') {
    const required = schema.required || [];
    for (const key of required) {
      if (value[key] === undefined) errors.push(`${location}.${key} is required`);
    }
    for (const [key, childSchema] of Object.entries(schema.properties || {})) {
      if (value[key] !== undefined) validateValue(value[key], childSchema, `${location}.${key}`, errors);
    }
  }

  if (schema.type === 'array' && schema.items) {
    value.forEach((item, index) => validateValue(item, schema.items, `${location}[${index}]`, errors));
  }
}

export function validateObject(contractName, value) {
  const contract = readContract(contractName);
  const errors = [];
  validateValue(value, { type: 'object', required: contract.required || [], properties: contract.properties || {} }, contract.contractId || contractName, errors);
  return { ok: errors.length === 0, errors, contract };
}

export function readContractFile(contractName, filePath) {
  const contract = readContract(contractName);
  const text = fs.readFileSync(filePath, 'utf8');
  if (contract.format === 'yaml') return parseSimpleYaml(text);
  return JSON.parse(text);
}

export function validateContractFile(contractName, filePath) {
  const value = readContractFile(contractName, filePath);
  return validateObject(contractName, value);
}

export function assertContractFile(contractName, filePath, fail) {
  let result;
  try {
    result = validateContractFile(contractName, filePath);
  } catch (error) {
    fail(`[${SCHEMA_ERROR_CODE}] ${contractName} ${filePath}: ${error.message}`);
  }
  if (!result.ok) {
    fail(`[${SCHEMA_ERROR_CODE}] ${contractName} ${filePath}: ${result.errors.join('; ')}`);
  }
}
