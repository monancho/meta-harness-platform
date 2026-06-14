# Agent Adapter

Agent adapter는 서로 다른 worker를 위한 표준 실행 경계를 제공합니다.

현재 방향:

1. deterministic local baseline으로 Shell adapter 사용
2. L0 isolation을 위한 local git worktree runner
3. Codex adapter skeleton과 missing-binary path
4. GitHub PR loop skeleton
5. Container와 kind execution profile skeleton

adapter가 달라도 task packet이 계약입니다. task packet은 editable scope, forbidden scope, verification command, budget, acceptance criteria, expected artifact를 포함합니다.

adapter를 통과시키기 위해 task scope check를 약화하지 않습니다. adapter failure는 structured run result나 명시적인 CLI error로 보고해야 합니다.
