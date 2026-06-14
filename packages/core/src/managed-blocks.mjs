import { sha } from './fs-utils.mjs';

export const MANAGED_BLOCK_BEGIN = 'BEGIN META-HARNESS MANAGED BLOCK';
export const MANAGED_BLOCK_END = 'END META-HARNESS MANAGED BLOCK';

const ID_PATTERN = '[A-Za-z0-9._/-]+';
const BEGIN_RE = new RegExp(`${MANAGED_BLOCK_BEGIN}:\\s*(${ID_PATTERN})`);
const END_RE = new RegExp(`${MANAGED_BLOCK_END}:\\s*(${ID_PATTERN})`);

function fail(code, message) {
  return { ok: false, code, message, blocks: [] };
}

function lineEndOffset(text, lineStart) {
  const next = text.indexOf('\n', lineStart);
  return next === -1 ? text.length : next + 1;
}

export function parseManagedBlocks(text) {
  const blocks = [];
  const seen = new Set();
  let open = null;
  let offset = 0;
  const lines = text.split(/(?<=\n)/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const begin = line.match(BEGIN_RE);
    const end = line.match(END_RE);

    if (begin && end) {
      return fail('invalid-marker-line', `managed block marker line ${index + 1} contains both begin and end markers`);
    }
    if (begin) {
      const id = begin[1];
      if (open) return fail('nested-marker', `managed block ${id} begins before ${open.id} ends`);
      if (seen.has(id)) return fail('duplicate-marker', `managed block ${id} is duplicated`);
      seen.add(id);
      open = {
        id,
        startLine: index + 1,
        startOffset: offset,
        bodyStartOffset: lineEndOffset(text, offset)
      };
    }
    if (end) {
      const id = end[1];
      if (!open) return fail('missing-begin-marker', `managed block ${id} ends without a begin marker`);
      if (open.id !== id) {
        return fail('mismatched-marker', `managed block ${open.id} ended by ${id}`);
      }
      blocks.push({
        ...open,
        endLine: index + 1,
        bodyEndOffset: offset,
        endOffset: lineEndOffset(text, offset),
        content: text.slice(open.bodyStartOffset, offset)
      });
      open = null;
    }
    offset += line.length;
  }

  if (open) return fail('missing-end-marker', `managed block ${open.id} has no end marker`);
  if (blocks.length === 0) return fail('missing-marker', 'no managed block markers found');
  return { ok: true, blocks };
}

export function managedBlockMetadata(text) {
  const parsed = parseManagedBlocks(text);
  if (!parsed.ok) return [];
  return parsed.blocks.map(block => ({
    id: block.id,
    checksum: `sha256:${sha(block.content)}`
  }));
}

function blockMap(blocks) {
  return new Map(blocks.map(block => [block.id, block]));
}

export function replaceManagedBlocks(current, next) {
  const currentParsed = parseManagedBlocks(current);
  if (!currentParsed.ok) return { ok: false, stage: 'current', ...currentParsed };
  const nextParsed = parseManagedBlocks(next);
  if (!nextParsed.ok) return { ok: false, stage: 'template', ...nextParsed };

  const currentById = blockMap(currentParsed.blocks);
  const nextById = blockMap(nextParsed.blocks);
  const missingInCurrent = [...nextById.keys()].filter(id => !currentById.has(id));
  const missingInNext = [...currentById.keys()].filter(id => !nextById.has(id));
  if (missingInCurrent.length || missingInNext.length) {
    return {
      ok: false,
      stage: 'matching',
      code: 'marker-set-mismatch',
      message: `managed block ids differ: missing in current=${missingInCurrent.join(',') || '-'}, missing in template=${missingInNext.join(',') || '-'}`
    };
  }

  let content = current;
  for (const block of [...currentParsed.blocks].sort((a, b) => b.bodyStartOffset - a.bodyStartOffset)) {
    content = content.slice(0, block.bodyStartOffset) + nextById.get(block.id).content + content.slice(block.bodyEndOffset);
  }
  return {
    ok: true,
    content,
    blocks: currentParsed.blocks.map(block => ({
      id: block.id,
      currentChecksum: `sha256:${sha(block.content)}`,
      templateChecksum: `sha256:${sha(nextById.get(block.id).content)}`
    }))
  };
}
