# Meta Learning Boundary

Meta Learning uses only sanitized signals exported from target-owned runs.

Allowed inputs:

- failure category
- reason code
- execution profile
- adapter
- generator version
- task type
- metric buckets
- generalized improvement signal labels

Disallowed inputs:

- raw PRD or planning documents
- raw code or patch content
- raw logs or command output
- secrets, tokens, credentials, or customer text
- target-specific business documents

`mh feedback analyze --input <dir> --output <dir>` reads `sanitized-signal.json` files and writes a generalized failure taxonomy plus candidate improvement proposals. Proposals stay `candidate-only` until an eval regression validates that the generalized change is safe for the Meta Harness templates, prompts, policies, or gates.

This keeps ownership clear: Target Repos retain raw artifacts and project context; Meta stores only generalized, privacy-preserving learning signals.
