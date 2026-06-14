$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$Target = Join-Path $Root ".tmp-smoke-target-project"

Remove-Item -Recurse -Force $Target -ErrorAction SilentlyContinue

Push-Location $Root

node ./bin/mh.mjs doctor
node ./scripts/agent/validate-agent-ready.mjs

node ./bin/mh.mjs scaffold planning --target $Target --project-id demo
node ./bin/mh.mjs plan synthesize --target $Target --input ./examples/demo-answers.json
node ./bin/mh.mjs plan compile-acceptance --target $Target
node ./bin/mh.mjs plan freeze --target $Target --approved
node ./bin/mh.mjs factory bootstrap --target $Target

Push-Location $Target
node "$Root/bin/mh.mjs" run --task .harness/tasks/example.task.json --adapter shell
Pop-Location

$RunsDir = Join-Path $Target ".harness/runs"
if (!(Test-Path $RunsDir)) {
  throw "Smoke failed: runs directory was not created."
}

$RunResults = Get-ChildItem $RunsDir -Recurse -Filter "run-result.json"
if ($RunResults.Count -lt 1) {
  throw "Smoke failed: run-result.json was not created."
}

Write-Host "[ok] PowerShell smoke flow passed"

Pop-Location
Remove-Item -Recurse -Force $Target -ErrorAction SilentlyContinue
