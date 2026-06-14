# AGENTS.md — Meta Harness Platform 한국어 작업 지침

이 레포는 **Meta Harness Platform**입니다. Target Project Repo가 아닙니다.

Meta Harness의 역할:

```text
공장을 만드는 공장
= Target Repo 안에 프로젝트별 개발 공장을 생성하고 업그레이드하는 도구
```

Target Repo의 역할:

```text
기획, 코드, 인프라, 실행 산출물을 소유하는 실제 프로젝트 저장소
```

가장 중요한 원칙:

```text
Meta는 프로젝트 원문 데이터를 소유하지 않는다.
Target Repo가 PRD, 코드, 인프라, 실행 로그, artifact를 소유한다.
Meta는 템플릿, 생성기, 정책, 스키마, eval, 일반화된 개선 신호만 소유한다.
```

---

## 1. 작업 시작 시 반드시 읽을 파일

Codex는 작업을 시작하기 전에 아래 순서로 읽어야 합니다.

```text
1. AGENTS.md
2. .harness/agent-workspace/current-task.md
3. current-task.md가 가리키는 원본 task packet JSON
4. .harness/agent-workspace/policies/editable-scope.yml
5. .harness/agent-workspace/policies/forbidden-scope.yml
6. .harness/agent-workspace/quality-gates.yml
7. 관련 코드 파일
```

`current-task.md`는 현재 작업의 요약 파일이고, 원본 task JSON이 source of truth입니다.

---

## 2. 현재 레포 수준

이 starter는 완성된 하네스가 아닙니다. 다음이 되는 MVP skeleton입니다.

```text
- bin/mh.mjs CLI skeleton
- planning scaffold
- planning synthesize mock
- acceptance compile mock
- planning freeze
- factory bootstrap skeleton
- shell adapter mock run
- patch.diff / run-result.json / summary.md 생성
```

Codex는 이 skeleton을 MH-001부터 MH-028까지 단계적으로 확장해야 합니다.

---

## 3. 절대 깨면 안 되는 규칙

### 3.1 Planning-first

Full Project Factory는 planning이 freeze되기 전 생성되면 안 됩니다.

상태 흐름:

```text
empty
→ planning-scaffolded
→ planning-frozen
→ factory-ready
→ runnable
→ github-connected
→ release-ready
```

### 3.2 Target ownership

Target Repo가 소유해야 하는 것:

```text
- docs/planning/**
- .harness/planning/**
- apps/**
- packages/**
- infra/**
- .devcontainer/**
- .codex/**
- .github/workflows/**
- AGENTS.md
- run artifacts
```

Meta는 생성할 수 있지만, 생성 후 소유권은 Target Repo에 있습니다.

### 3.3 Raw project data 학습 금지

Meta에 저장하면 안 되는 것:

```text
- raw PRD
- raw code
- raw logs
- secrets
- 특정 프로젝트 비즈니스 문서
```

Meta에 저장 가능한 것:

```text
- sanitized failure category
- gate failure reason code
- runtime bucket
- retry count
- template improvement signal
- generator version
- execution profile
```

### 3.4 Worktree-first

기본 실행 profile은 L0 local worktree입니다.

구현 순서:

```text
1. Shell Adapter
2. real local git worktree runner
3. Codex Adapter
4. GitHub PR loop
5. Container Worker
6. kind namespace runner
```

Kubernetes는 L0 runner가 안정화된 뒤에 구현합니다.

### 3.5 보안 경계

Worker는 task packet의 범위를 지켜야 합니다.

```text
Allowed writes: task.editableScope
Forbidden writes: task.forbiddenScope + runtime policy
항상 금지: .env*, production infra, deploy-prod workflow, long-lived credentials
```

---

## 4. 수정 가능 영역

Codex가 수정 가능한 영역:

```text
bin/**
packages/**
schemas/**
templates/**
examples/**
tests/**
docs/**
.harness/agent-workspace/**
scripts/**
README.md
package.json
```

주의 영역:

```text
docs/spec/**
```

PDF/DOCX 원본은 가능하면 수정하지 않습니다.

---

## 5. 수정 금지 영역

```text
.env*
node_modules/**
.git/**
**/*SECRET*
**/*TOKEN*
infra/**/production/**
.github/workflows/deploy-prod.yml
```

---

## 6. 검증 명령

기본 검증:

```bash
bash ./scripts/agent/verify-after-task.sh
```

강한 검증:

```bash
bash ./tests/smoke.sh
node ./scripts/agent/guard-diff.mjs
```

자동 루프는 `finish-task.sh`에서 위 검증을 실행합니다.

---

## 7. Codex 자동 실행 규칙

Codex는 Dev Container 안에서 실행됩니다.

허용:

```text
- workspace 내부 파일 읽기/수정
- Node/bash/git/make 테스트 실행
- 현재 task scope 안의 리팩터링
- 실패한 검증에 대한 1~2회 focused repair
```

금지:

```text
- workspace 밖 접근
- .env/secret/token 생성 또는 읽기
- git push
- npm publish
- docker login
- 운영 배포
- .git 삭제
```

---

## 8. 완료 보고 형식

작업이 끝나면 Codex는 다음을 요약해야 합니다.

```text
- 변경한 파일
- 구현한 내용
- 실행한 검증 명령
- 검증 결과
- 남은 위험 또는 다음 작업 참고사항
```
