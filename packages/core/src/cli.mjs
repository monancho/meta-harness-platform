import { execSync } from 'node:child_process';
import { VERSION } from './constants.mjs';
import { cmdFactoryBootstrap } from './bootstrap.mjs';
import { cmdCompileAcceptance, cmdPlanFreeze, cmdPlanSynthesize, cmdScaffoldPlanning } from './planning.mjs';
import { cmdRun } from './runner.mjs';

function log(msg = '') { console.log(msg); }
function fail(msg, code = 1) { console.error(`\n[meta-harness:error] ${msg}\n`); process.exit(code); }
function ok(msg) { console.log(`[ok] ${msg}`); }

export function parse(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) out[key] = true;
      else { out[key] = next; i++; }
    } else out._.push(a);
  }
  return out;
}

function cmdDoctor() {
  log(`Meta Harness Starter v${VERSION}`);
  log(`Node: ${process.version}`);
  try { log(`Git: ${execSync('git --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()}`); }
  catch { log('Git: not found (L0 runner still works in fallback mode)'); }
  try { log(`Make: ${execSync('make --version', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n')[0]}`); }
  catch { log('Make: not found (you can run .harness/bin/runner.mjs directly)'); }
  ok('doctor completed');
}

function usage() {
  log(`Meta Harness Starter v${VERSION}\n\nCommands:\n  doctor\n  scaffold planning --target <dir> --project-id <id>\n  plan synthesize --target <dir> --input <json>\n  plan compile-acceptance --target <dir>\n  plan freeze --target <dir> --approved\n  factory bootstrap --target <dir>\n  run --target <dir> --task <task.json> --adapter shell\n`);
}

export function runCli(argv) {
  const opts = parse(argv);
  const [a, b] = opts._;
  if (!a || a === 'help' || a === '--help') usage();
  else if (a === 'doctor') cmdDoctor(opts);
  else if (a === 'scaffold' && b === 'planning') ok(cmdScaffoldPlanning(opts, fail));
  else if (a === 'plan' && b === 'synthesize') ok(cmdPlanSynthesize(opts, fail));
  else if (a === 'plan' && b === 'compile-acceptance') ok(cmdCompileAcceptance(opts, fail));
  else if (a === 'plan' && b === 'freeze') ok(cmdPlanFreeze(opts, fail));
  else if (a === 'factory' && b === 'bootstrap') ok(cmdFactoryBootstrap(opts, fail));
  else if (a === 'run') cmdRun(opts, fail);
  else fail(`unknown command: ${opts._.join(' ')}`);
}
