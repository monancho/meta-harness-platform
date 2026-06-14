#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const taskId = process.argv[2];
if (!taskId) {
  console.error('Usage: node scripts/agent/render-current-task.mjs MH-001');
  process.exit(1);
}

const root = process.cwd();
const tasksDir = path.join(root, '.harness/agent-workspace/tasks');
const files = fs.readdirSync(tasksDir).filter((name) => name.startsWith(`${taskId}-`) && name.endsWith('.task.json'));
if (files.length === 0) {
  console.error(`[render-current-task:error] task packet not found: ${taskId}`);
  process.exit(1);
}
const taskPath = path.join('.harness/agent-workspace/tasks', files[0]);
const task = JSON.parse(fs.readFileSync(path.join(root, taskPath), 'utf8'));

const arr = (value) => Array.isArray(value) ? value : [];
const criteria = arr(task.acceptanceCriteria).map((item) => {
  if (typeof item === 'string') return `- ${item}`;
  return `- ${item.id ? `**${item.id}**: ` : ''}${item.text || JSON.stringify(item)}`;
}).join('\n') || '- 없음';

const editable = arr(task.editableScope).map((x) => `- \`${x}\``).join('\n') || '- task packet에 명시 없음';
const forbidden = arr(task.forbiddenScope).map((x) => `- \`${x}\``).join('\n') || '- task packet에 명시 없음';
const verify = task.commands?.verify ? task.commands.verify.map((x) => `- \`${x}\``).join('\n') : '- `bash ./scripts/agent/verify-after-task.sh`';
const contextFiles = arr(task.contextFiles).map((x) => `- \`${x}\``).join('\n') || '- `AGENTS.md`';

const titleKo = task.titleKo || task.title || taskId;
const objectiveKo = task.objectiveKo || task.objective || '';

const content = `# 현재 작업: ${taskId}

> 이 파일은 자동 생성된 현재 작업 진입 파일입니다.  
> 원본 작업 계약은 \`${taskPath}\` 입니다.

## 1. 작업 제목

${titleKo}

## 2. 목표

${objectiveKo}

## 3. 원본 Task Packet

\`${taskPath}\`

## 4. 반드시 읽을 파일

- \`AGENTS.md\`
- \`.harness/agent-workspace/backlog.yml\`
- \`.harness/agent-workspace/quality-gates.yml\`
- \`.harness/agent-workspace/policies/editable-scope.yml\`
- \`.harness/agent-workspace/policies/forbidden-scope.yml\`
${contextFiles}

## 5. 수정 가능 범위

${editable}

## 6. 수정 금지 범위

${forbidden}

## 7. 완료 기준

${criteria}

## 8. 검증 명령

${verify}
- \`bash ./scripts/agent/verify-after-task.sh\`

## 9. Codex 자동 작업 지시

\`\`\`text
AGENTS.md를 먼저 읽어라.
그다음 이 current-task.md와 원본 task packet JSON을 읽어라.
현재 작업은 ${taskId}이다.

수행 원칙:
- task packet의 objective와 acceptanceCriteria를 충족한다.
- editableScope 안에서만 수정한다.
- forbiddenScope는 절대 수정하지 않는다.
- 기존 CLI 명령과 smoke test를 깨지 않는다.
- Dev Container 내부에서 작업한다고 가정한다.
- 필요한 테스트를 직접 실행하고, 실패하면 현재 task 범위 안에서 1~2회 수정한다.
- git push, npm publish, rm -rf .git, .env 파일 접근/수정은 하지 않는다.

완료 목표:
- bash ./scripts/agent/verify-after-task.sh 통과
- 변경 파일 수와 patch 크기가 budget 안에 있음
- 변경 요약 가능
\`\`\`

## 10. 예산

\`\`\`json
${JSON.stringify(task.budgets || {}, null, 2)}
\`\`\`
`;

fs.mkdirSync(path.join(root, '.harness/agent-workspace'), { recursive: true });
fs.writeFileSync(path.join(root, '.harness/agent-workspace/current-task.md'), content, 'utf8');
console.log(`[ok] current task rendered: ${taskId} -> .harness/agent-workspace/current-task.md`);
