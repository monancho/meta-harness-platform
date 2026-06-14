import assert from 'node:assert/strict';
import { parseManagedBlocks, replaceManagedBlocks } from '../packages/core/src/managed-blocks.mjs';

const current = `user header
<!-- BEGIN META-HARNESS MANAGED BLOCK: alpha -->
old generated content
<!-- END META-HARNESS MANAGED BLOCK: alpha -->
user footer
`;

const next = `ignored template header
<!-- BEGIN META-HARNESS MANAGED BLOCK: alpha -->
new generated content
<!-- END META-HARNESS MANAGED BLOCK: alpha -->
ignored template footer
`;

const replaced = replaceManagedBlocks(current, next);
assert.equal(replaced.ok, true);
assert.equal(replaced.content, `user header
<!-- BEGIN META-HARNESS MANAGED BLOCK: alpha -->
new generated content
<!-- END META-HARNESS MANAGED BLOCK: alpha -->
user footer
`);

const missing = parseManagedBlocks('no markers here\n');
assert.equal(missing.ok, false);
assert.equal(missing.code, 'missing-marker');

const duplicated = parseManagedBlocks(`# BEGIN META-HARNESS MANAGED BLOCK: alpha
one
# END META-HARNESS MANAGED BLOCK: alpha
# BEGIN META-HARNESS MANAGED BLOCK: alpha
two
# END META-HARNESS MANAGED BLOCK: alpha
`);
assert.equal(duplicated.ok, false);
assert.equal(duplicated.code, 'duplicate-marker');

const nested = parseManagedBlocks(`# BEGIN META-HARNESS MANAGED BLOCK: alpha
# BEGIN META-HARNESS MANAGED BLOCK: beta
# END META-HARNESS MANAGED BLOCK: beta
# END META-HARNESS MANAGED BLOCK: alpha
`);
assert.equal(nested.ok, false);
assert.equal(nested.code, 'nested-marker');

console.log('[managed-blocks.test] ok');
