# AGENTS.md - Meta Harness Platform 운영 지침

이 저장소는 **Meta Harness Platform**입니다. Target Project Repo가 아닙니다.

Meta Harness의 역할은 Target Repo 안에 프로젝트별 개발 공장을 생성, 검증, 업그레이드하는 것입니다. Target Repo의 역할은 실제 프로젝트의 기획, 코드, 인프라, 실행 산출물, 운영 로그를 소유하는 것입니다.

가장 중요한 원칙:

```text
Meta는 프로젝트 원문 데이터를 소유하지 않는다.
Target Repo가 PRD, 코드, 인프라, 실행 로그, artifact를 소유한다.
Meta는 템플릿, 생성기, 정책, 스키마, eval, 일반화된 개선 신호만 소유한다.
```

## 1. 프로젝트 목적

Meta Harness Platform은 AI-assisted delivery를 일회성 채팅이 아니라 감사 가능한 계약 기반 작업 흐름으로 바꾸는 도구입니다.

핵심 목표:

- planning-first Target Project Factory 생성
- task packet 기반 범위 제한 실행
- local worktree-first runner와 adapter 계층 제공
- security policy, manifest ownership, artifact contract 검증
- dashboard preview, eval, release, maintenance skeleton 제공
- raw project data를 Meta에 저장하지 않는 개선 신호 흐름 제공

## 2. 핵심 아키텍처 요약

운영 기준은 **Planning-first**입니다. MH-001부터 MH-028까지의 구현 task queue는 완료된 개발 히스토리로 유지하며, 이후 작업은 이 계약을 보존하는 release cleanup, hardening, 유지보수 중심으로 진행합니다.

```text
bin/mh.mjs
  -> packages/core/src/*.mjs
     -> planning scaffold / synthesize / freeze
     -> factory bootstrap / manifest lock
     -> runner template / agent adapters / execution profiles
     -> security gates / eval / signal / release / maintenance commands

templates/**
  -> Target Repo에 생성될 기본 파일과 운영 지침

schemas/**
  -> task packet, run result, manifest, factory 계약

tests/**
  -> smoke, fixture, contract regression 검증

docs/**
  -> user guide, developer guide, development history, portfolio material
```

기본 실행 방향은 L0 local worktree입니다. Shell adapter와 local git worktree runner가 안정적인 기본 경로이며, Codex/GitHub/Container/kind profile은 그 위의 확장입니다.

## 3. Meta Repo와 Target Repo의 소유권 경계

Meta Repo가 소유하는 것:

- CLI, core package, schemas, tests
- Target Repo 생성을 위한 templates
- 일반화된 보안 정책과 실행 profile 정의
- sanitized eval/signal/report skeleton
- 문서, 사용 가이드, 개발자 가이드, 포트폴리오 설명

Target Repo가 소유하는 것:

- `docs/planning/**`
- `.harness/planning/**`
- `apps/**`, `packages/**`, `infra/**`
- `.devcontainer/**`, `.codex/**`, `.github/workflows/**`
- Target Repo의 `AGENTS.md`
- run artifacts, patch, logs, verification output

Meta에 저장하면 안 되는 것:

- raw PRD, raw code, raw logs
- secrets, tokens, long-lived credentials
- 특정 프로젝트의 비즈니스 원문 문서

Meta에 저장 가능한 것:

- sanitized failure category
- gate failure reason code
- runtime bucket, retry count
- template improvement signal
- generator version, execution profile

## 4. 수정 가능 범위

일반 유지보수 작업에서 수정 가능한 영역:

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
AGENTS.md
package.json
.gitignore
```

주의 영역:

- `docs/spec/**`: 원본 PDF/DOCX는 가능하면 수정하지 않습니다.
- `examples/generated-target-project-demo/**`: Target Repo 예시 ownership을 훼손하지 않습니다.
- `.harness/agent-workspace/tasks/**`: 완료된 task packet은 히스토리로 다룹니다.

## 5. 수정 금지 범위

절대 수정하거나 커밋하지 말아야 할 영역:

```text
.env
.env.*
node_modules/**
.git/**
**/*SECRET*
**/*TOKEN*
**/*.pem
**/*.key
infra/**/production/**
.github/workflows/deploy-prod.yml
.harness/runs/**
.harness/tmp/**
.harness/agent-workspace/auto-runs/**
.harness/agent-workspace/nightly-logs/**
```

운영 배포, `npm publish`, `git push`, `docker login`, production credential 생성/조회는 사용자 명시 요청 없이 수행하지 않습니다.

## 6. 작업 전 확인 절차

작업 시작 전 다음을 확인합니다.

```bash
git branch --show-current
git status
npm run agent:status
```

release cleanup 또는 hardening 작업에서는 다음 원칙을 따릅니다.

- `main`에서 직접 수정하지 않습니다.
- 새 작업 브랜치를 만들고 그 안에서만 수정합니다.
- 필요하면 `release-cleanup-before-YYYYMMDD-HHMMSS` 형식의 local backup tag를 만듭니다.
- working tree에 기존 변경이 있으면 사용자 변경으로 간주하고 덮어쓰지 않습니다.
- 애매한 산출물은 삭제하지 말고 문서화합니다.

## 7. 작업 후 검증 절차

기본 검증:

```bash
npm run doctor
npm run verify
npm run smoke
```

관련 기능 검증:

```bash
npm run dashboard:preview
npm run demo:e2e
node ./scripts/agent/guard-diff.mjs
```

`npm run dashboard:preview`는 `apps/dashboard/preview.mjs` 기반의 장시간 실행 preview 서버입니다. 검증 시에는 실행 가능 여부와 URL 출력 확인 후 종료해도 됩니다.

검증 실패 시:

- 원인을 먼저 분석합니다.
- 최소 수정으로 해결합니다.
- 테스트를 약화하지 않습니다.
- smoke test가 검증하는 계약을 우회하지 않습니다.
- 없는 구조나 package script를 있다고 가정하지 않습니다.

## 8. 보안 원칙

- secrets, tokens, `.env*`, PEM/key material을 읽거나 생성하거나 커밋하지 않습니다.
- Target Repo의 raw project data를 Meta Repo로 복사하지 않습니다.
- Worker와 adapter는 task packet의 `editableScope`, `forbiddenScope`, runtime policy를 지켜야 합니다.
- production infra와 deploy-prod workflow는 기본적으로 변경 금지입니다.
- 외부 네트워크, publish, push, deployment 계열 작업은 사용자 명시 요청과 별도 승인 없이는 수행하지 않습니다.

## 9. 임시 산출물 처리 원칙

커밋하지 않는 런타임 산출물:

- `.harness/runs/`
- `.harness/tmp/`
- `.harness/agent-workspace/auto-runs/`
- `.harness/agent-workspace/nightly-logs/`
- `.harness/agent-workspace/autoloop.lock`
- `.tmp-*`
- one-off 실행 스크립트와 제작 메모

삭제 여부가 애매한 파일은 먼저 `docs/development-history/release-cleanup-notes.md`에 기록합니다. 사용자가 명시하지 않은 파일은 임의 삭제하지 않습니다.

## 10. 커밋/PR 규칙

- main에 직접 커밋하지 않습니다.
- cleanup, docs, 기능 수정, 검증 보고서는 가능한 한 작은 단위로 커밋합니다.
- 커밋 전 `git status`와 `git diff --stat`로 범위를 확인합니다.
- 커밋 메시지는 변경 목적이 드러나게 작성합니다.
- 사용자 명시 요청 전에는 push하지 않습니다.
- PR 또는 merge 전에는 최종 검증 결과와 rollback 방법을 문서화합니다.

## 11. 완료 보고 형식

작업 완료 시 다음을 요약합니다.

```text
- 브랜치명과 backup tag
- 변경한 파일
- 구현/정리한 내용
- 실행한 검증 명령
- 검증 결과
- 남겨둔 검토 항목
- main에 merge/push하지 않았다는 확인
```
