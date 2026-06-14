import path from 'node:path';
import { abs, ensureDir, exists, readJson, writeJson, writeText, shaFile } from './fs-utils.mjs';
import { readProjectId, setState, statePath } from './state.mjs';

export function loadAnswers(inputPath, fail) {
  const defaults = {
    projectName: 'Demo Project',
    projectId: 'demo',
    problem: '초기 문제 정의가 필요하다.',
    goal: '작동 가능한 MVP를 만든다.',
    targetUsers: ['초기 사용자'],
    mvpScope: ['기본 화면', '기본 데이터 구조', '기본 실행 흐름'],
    nonGoals: ['결제', '복잡한 권한', '운영용 Kubernetes'],
    primaryScreen: 'Dashboard',
    stack: { frontend: 'React', backend: 'Node/Fastify', database: 'SQLite', packageManager: 'pnpm' }
  };
  if (!inputPath) return defaults;
  const p = abs(inputPath);
  if (!exists(p)) return defaults;
  try { return { ...defaults, ...readJson(p) }; }
  catch { fail(`현재 starter는 JSON input만 지원합니다: ${p}`); }
}

export function cmdScaffoldPlanning(opts) {
  const target = abs(opts.target || '../target-project');
  const projectId = opts['project-id'] || opts.projectId || 'demo';
  ensureDir(target);
  ensureDir(path.join(target, 'docs/planning'));
  ensureDir(path.join(target, '.harness/planning'));
  ensureDir(path.join(target, '.github'));

  writeText(path.join(target, 'README.md'), `# ${projectId}\n\nPlanning-first Target Project Repo.\n\n## Current phase\n\nplanning-scaffolded\n`);
  writeText(path.join(target, '.harness/project.yml'), `schemaVersion: 1\nproject:\n  id: ${projectId}\n  name: ${projectId}\n  owner: target-repo\n  sourceOfTruth:\n    planning: docs/planning\n    agentPack: .harness/planning\n`);
  setState(target, { projectId, phase: 'planning-scaffolded' });
  writeText(path.join(target, '.github/pull_request_template.md'), `## Summary\n\n## Checklist\n\n- [ ] Planning artifacts reviewed\n- [ ] Acceptance criteria are testable\n- [ ] Non-goals are clear\n`);
  writeText(path.join(target, 'docs/planning/00_IDEA_BRIEF.md'), `# 00. Idea Brief\n\n> Fill this before running planning synthesis.\n`);
  return `planning-only scaffold created: ${target}`;
}

export function cmdPlanSynthesize(opts, fail) {
  const target = abs(opts.target || '../target-project');
  if (!exists(statePath(target))) fail('planning scaffold가 없습니다. 먼저 scaffold planning을 실행하세요.');
  const answers = loadAnswers(opts.input, fail);
  const projectId = readProjectId(target) || answers.projectId;
  const docs = path.join(target, 'docs/planning');
  const hp = path.join(target, '.harness/planning');
  ensureDir(docs); ensureDir(hp);

  const reqs = answers.mvpScope.map((s, i) => ({ id: `REQ-${String(i + 1).padStart(3, '0')}`, text: s, priority: i === 0 ? 'must' : 'should' }));
  const ac = reqs.map((r, i) => ({ id: `AC-${String(i + 1).padStart(3, '0')}`, requirementId: r.id, text: `${r.text} 기능은 기본 성공/빈 상태/오류 상태를 처리해야 한다.`, verification: 'test-or-manual-gate' }));
  const backlog = reqs.map((r, i) => ({ id: `BL-${String(i + 1).padStart(3, '0')}`, requirementId: r.id, title: r.text, taskType: i === 0 ? 'frontend-ui' : 'fullstack-feature', acceptanceCriteria: [ac[i].id] }));
  const screenSpecs = [{ id: 'SCREEN-001', name: answers.primaryScreen, states: ['loading', 'empty', 'error', 'success'], responsive: ['mobile', 'tablet', 'desktop'] }];

  writeText(path.join(docs, '01_CLARIFYING_QUESTIONS.md'), `# 01. Clarifying Questions\n\n- 핵심 사용자는 누구인가?\n- MVP에서 반드시 필요한 기능은 무엇인가?\n- 이번 버전에서 하지 않을 것은 무엇인가?\n`);
  writeText(path.join(docs, '02_PLANNING_ANSWERS.md'), `# 02. Planning Answers\n\n## Project\n${answers.projectName}\n\n## Problem\n${answers.problem}\n\n## Goal\n${answers.goal}\n`);
  writeText(path.join(docs, '03_PRD.md'), `# 03. PRD\n\n## Product\n${answers.projectName}\n\n## Problem\n${answers.problem}\n\n## Goal\n${answers.goal}\n\n## MVP Scope\n${answers.mvpScope.map(x => `- ${x}`).join('\n')}\n`);
  writeText(path.join(docs, '04_TARGET_USERS.md'), `# 04. Target Users\n\n${answers.targetUsers.map(x => `- ${x}`).join('\n')}\n`);
  writeText(path.join(docs, '05_MVP_SCOPE.md'), `# 05. MVP Scope\n\n${answers.mvpScope.map(x => `- ${x}`).join('\n')}\n`);
  writeText(path.join(docs, '06_NON_GOALS.md'), `# 06. Non-goals\n\n${answers.nonGoals.map(x => `- ${x}`).join('\n')}\n`);
  writeText(path.join(docs, '07_USER_STORIES.md'), `# 07. User Stories\n\n${answers.mvpScope.map((x, i) => `- US-${i + 1}: 사용자는 ${x}을/를 할 수 있다.`).join('\n')}\n`);
  writeText(path.join(docs, '08_USER_FLOWS.md'), `# 08. User Flows\n\n1. 사용자가 대시보드에 진입한다.\n2. 주요 작업을 확인한다.\n3. 항목을 생성하거나 상태를 변경한다.\n4. 결과를 확인한다.\n`);
  writeText(path.join(docs, '09_SCREEN_SPECS.md'), `# 09. Screen Specs\n\n## ${answers.primaryScreen}\n\nStates: loading / empty / error / success\n\nResponsive: mobile / tablet / desktop\n`);
  writeText(path.join(docs, '10_DESIGN_BRIEF.md'), `# 10. Design Brief\n\n- 빠른 이해가 가능한 dashboard-first UI\n- 상태별 피드백 명확화\n- 포트폴리오 설명 가능한 구조\n`);
  writeText(path.join(docs, '11_ACCEPTANCE_CRITERIA.md'), `# 11. Acceptance Criteria\n\n${ac.map(x => `- ${x.id}: ${x.text}`).join('\n')}\n`);
  writeText(path.join(docs, '12_TRACEABILITY_MATRIX.md'), `# 12. Traceability Matrix\n\n| Requirement | Acceptance Criteria | Backlog |\n|---|---|---|\n${reqs.map((r, i) => `| ${r.id} | ${ac[i].id} | ${backlog[i].id} |`).join('\n')}\n`);
  writeText(path.join(docs, '13_BACKLOG.md'), `# 13. Backlog\n\n${backlog.map(x => `- ${x.id}: ${x.title}`).join('\n')}\n`);
  writeText(path.join(docs, '14_BUILD_HANDOFF.md'), `# 14. Build Handoff\n\n## Stack\n\n- Frontend: ${answers.stack.frontend}\n- Backend: ${answers.stack.backend}\n- Database: ${answers.stack.database}\n\n## First Vertical Slice\n\n${backlog[0].title}\n`);

  const baseline = { schemaVersion: '1.0.0', projectId, projectName: answers.projectName, createdAt: new Date().toISOString(), problem: answers.problem, goal: answers.goal };
  const handoff = { schemaVersion: '1.0.0', projectId, projectName: answers.projectName, stack: answers.stack, firstVerticalSlice: backlog[0], requirements: reqs, acceptanceCriteria: ac, screenSpecs, nonGoals: answers.nonGoals };
  writeJson(path.join(hp, 'planning-baseline.json'), baseline);
  writeJson(path.join(hp, 'requirements.json'), { requirements: reqs });
  writeJson(path.join(hp, 'acceptance-criteria.json'), { acceptanceCriteria: ac });
  writeJson(path.join(hp, 'screen-specs.json'), { screens: screenSpecs });
  writeJson(path.join(hp, 'backlog.items.json'), { backlog });
  writeJson(path.join(hp, 'traceability.json'), { links: reqs.map((r, i) => ({ requirementId: r.id, acceptanceCriteriaId: ac[i].id, backlogItemId: backlog[i].id })) });
  writeText(path.join(hp, 'non-goals.policy.yml'), `nonGoals:\n${answers.nonGoals.map(x => `  - ${x}`).join('\n')}\n`);
  writeJson(path.join(hp, 'build-handoff.json'), handoff);
  return 'planning docs and agent-pack generated';
}

export function cmdCompileAcceptance(opts, fail) {
  const target = abs(opts.target || '../target-project');
  const hp = path.join(target, '.harness/planning');
  const acPath = path.join(hp, 'acceptance-criteria.json');
  if (!exists(acPath)) fail('acceptance-criteria.json이 없습니다. 먼저 plan synthesize를 실행하세요.');
  const ac = readJson(acPath).acceptanceCriteria || [];
  const tests = ac.map((item, i) => ({
    acceptanceCriteriaId: item.id,
    testId: `TEST-${String(i + 1).padStart(3, '0')}`,
    strategy: item.verification || 'test-or-manual-gate',
    suggestedCommand: `node -e \"console.log('${item.id} ok')\"`,
    manualReviewRequired: false
  }));
  writeJson(path.join(hp, 'verification-map.json'), { verificationMap: tests });
  writeJson(path.join(hp, 'acceptance-tests.generated.json'), { tests });
  return 'acceptance criteria compiled to verification-map';
}

export function cmdPlanFreeze(opts, fail) {
  const target = abs(opts.target || '../target-project');
  if (!opts.approved) fail('planning freeze requires --approved');
  const hp = path.join(target, '.harness/planning');
  const handoff = path.join(hp, 'build-handoff.json');
  if (!exists(handoff)) fail('build-handoff.json이 없습니다. 먼저 plan synthesize를 실행하세요.');
  const baseline = path.join(hp, 'planning-baseline.json');
  const projectId = readProjectId(target);
  setState(target, { projectId, phase: 'planning-frozen', extra: `  planningBaselineHash: sha256:${exists(baseline) ? shaFile(baseline) : 'missing'}\n  buildHandoffHash: sha256:${shaFile(handoff)}\n  humanApproved: true\n` });
  return 'planning baseline frozen';
}
