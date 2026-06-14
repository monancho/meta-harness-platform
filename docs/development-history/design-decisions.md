# 주요 설계 결정

## Planning First

planning이 freeze되기 전에는 factory bootstrap을 막습니다. 이렇게 하면 generated implementation work가 명시적으로 승인된 planning 이후에만 진행됩니다.

## Target Ownership

Target repo는 raw planning data, source code, infrastructure, log, artifact를 소유합니다. Meta는 generator, template, schema, policy, sanitized improvement signal을 소유합니다.

## Worktree First

L0 local git worktree execution을 기본 isolation path로 둡니다. higher profile은 같은 task packet과 artifact contract 위에서 확장됩니다.

## Dependency-Free Dashboard Preview

Dashboard preview는 framework package 대신 `apps/dashboard/preview.mjs`를 사용합니다. 이 선택은 smoke test를 offline으로 유지하고 `apps/dashboard/package.json` 존재를 가정하지 않게 합니다.

## Sanitized Feedback

Eval과 signal flow는 의도적으로 sanitized data만 다룹니다. raw project data는 Meta learning output에 저장하면 안 됩니다.

## 애매한 Cleanup은 삭제보다 문서화

Runtime artifact는 ignore하지만, 애매한 local file은 제거 전에 문서화합니다. [Release Cleanup Notes](release-cleanup-notes.md)를 참고하세요.
