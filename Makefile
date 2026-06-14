.PHONY: help start status auto1 auto3 yolo3 verify smoke checkpoint restore install-tools

help:
	@echo "Meta Harness v1.4 — 사용 가능한 명령"
	@echo "  make start        # 환경 점검 + 시작 안내"
	@echo "  make status       # 작업 상태 확인"
	@echo "  make auto1        # 다음 작업 1개 자동 실행"
	@echo "  make auto3        # 다음 작업 3개 자동 실행"
	@echo "  make yolo3        # Dev Container 폐기 전제 yolo 모드 3개 실행"
	@echo "  make verify       # 검증"
	@echo "  make checkpoint   # 복구 지점 생성"
	@echo "  make restore      # 최근 checkpoint로 복구"

start:
	bash ./scripts/devcontainer/first-run.sh

status:
	bash ./scripts/agent/status.sh

auto1:
	bash ./scripts/agent/auto-loop.sh --limit 1

auto3:
	bash ./scripts/agent/auto-loop.sh --limit 3

yolo3:
	bash ./scripts/agent/auto-loop.sh --limit 3 --mode yolo

verify:
	bash ./scripts/agent/verify-after-task.sh

smoke:
	bash ./tests/smoke.sh

checkpoint:
	bash ./scripts/agent/create-checkpoint.sh

restore:
	bash ./scripts/agent/restore-checkpoint.sh

install-tools:
	bash ./scripts/devcontainer/install-tools.sh
