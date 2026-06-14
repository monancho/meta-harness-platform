const DEFAULT_MAX_DISPLAY_LINES = 240;

export function parsePatchDiff(text, options = {}) {
  const source = String(text ?? '');
  const forbiddenScope = Array.isArray(options.forbiddenScope) ? options.forbiddenScope : [];
  const maxDisplayLines = positiveNumber(options.maxDisplayLines, DEFAULT_MAX_DISPLAY_LINES);

  if (!source.trim()) {
    return buildResult({
      state: 'empty',
      files: [],
      malformedLines: [],
      forbiddenScope,
      maxDisplayLines
    });
  }

  const files = [];
  const malformedLines = [];
  let current = null;
  let currentHunk = null;

  const lines = source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const lineNumber = index + 1;

    const diffMatch = raw.match(/^diff --git a\/(.+) b\/(.+)$/);
    if (diffMatch) {
      current = createFile(diffMatch[1], diffMatch[2]);
      current.rawHeader.push(raw);
      files.push(current);
      currentHunk = null;
      continue;
    }

    if (!current) {
      if (raw.trim()) malformedLines.push({ lineNumber, text: raw, reason: 'line outside file diff' });
      continue;
    }

    if (/^(index|new file mode|deleted file mode|old mode|new mode|similarity index|rename from|rename to)\b/.test(raw)) {
      current.rawHeader.push(raw);
      continue;
    }

    if (raw.startsWith('--- ')) {
      current.oldPath = normalizePatchPath(raw.slice(4).trim());
      current.rawHeader.push(raw);
      continue;
    }

    if (raw.startsWith('+++ ')) {
      current.newPath = normalizePatchPath(raw.slice(4).trim());
      current.rawHeader.push(raw);
      continue;
    }

    const hunkMatch = raw.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)$/);
    if (hunkMatch) {
      currentHunk = {
        header: raw,
        oldStart: Number(hunkMatch[1]),
        oldLines: Number(hunkMatch[2] ?? 1),
        newStart: Number(hunkMatch[3]),
        newLines: Number(hunkMatch[4] ?? 1),
        section: hunkMatch[5].trim(),
        lines: []
      };
      current.hunks.push(currentHunk);
      continue;
    }

    if (!currentHunk) {
      if (raw.trim() && raw !== '\\ No newline at end of file') {
        malformedLines.push({ lineNumber, text: raw, reason: 'line outside hunk' });
      }
      continue;
    }

    if (raw === '' && index === lines.length - 1) continue;

    const kind = classifyDiffLine(raw);
    if (!kind) {
      malformedLines.push({ lineNumber, text: raw, reason: 'unrecognized hunk line' });
      continue;
    }

    const item = {
      kind,
      text: raw === '\\ No newline at end of file' ? raw : raw.slice(1)
    };
    currentHunk.lines.push(item);
    if (kind === 'add') current.additions += 1;
    if (kind === 'delete') current.deletions += 1;
  }

  return buildResult({
    state: files.length === 0 ? 'malformed' : malformedLines.length ? 'partial' : 'ready',
    files,
    malformedLines,
    forbiddenScope,
    maxDisplayLines
  });
}

function buildResult({ state, files, malformedLines, forbiddenScope, maxDisplayLines }) {
  const normalizedFiles = files.map(file => {
    const paths = unique([file.oldPath, file.newPath, file.oldName, file.newName].filter(path => path && path !== '/dev/null'));
    const riskyMatches = matchForbiddenPaths(paths, forbiddenScope);
    return {
      ...file,
      displayPath: file.newPath && file.newPath !== '/dev/null' ? file.newPath : file.oldPath,
      paths,
      riskyMatches,
      lineCount: file.hunks.reduce((count, hunk) => count + hunk.lines.length + 1, 0)
    };
  });

  const totals = normalizedFiles.reduce((summary, file) => {
    summary.additions += file.additions;
    summary.deletions += file.deletions;
    summary.displayLineCount += file.lineCount;
    if (file.riskyMatches.length > 0) summary.riskyPaths.push(...file.riskyMatches);
    return summary;
  }, {
    filesChanged: normalizedFiles.length,
    additions: 0,
    deletions: 0,
    displayLineCount: 0,
    riskyPaths: []
  });

  const truncated = totals.displayLineCount > maxDisplayLines;
  return {
    state,
    files: normalizedFiles,
    malformedLines,
    summary: {
      ...totals,
      riskyPaths: uniqueRiskyMatches(totals.riskyPaths),
      malformedLineCount: malformedLines.length,
      truncated,
      maxDisplayLines
    }
  };
}

function createFile(oldName, newName) {
  return {
    oldName,
    newName,
    oldPath: oldName,
    newPath: newName,
    rawHeader: [],
    hunks: [],
    additions: 0,
    deletions: 0
  };
}

function classifyDiffLine(raw) {
  if (raw.startsWith('+')) return 'add';
  if (raw.startsWith('-')) return 'delete';
  if (raw.startsWith(' ')) return 'context';
  if (raw === '\\ No newline at end of file') return 'meta';
  return null;
}

function normalizePatchPath(value) {
  if (value === '/dev/null') return value;
  return value.replace(/^(a|b)\//, '');
}

function matchForbiddenPaths(paths, forbiddenScope) {
  const matches = [];
  for (const path of paths) {
    for (const pattern of forbiddenScope) {
      if (matchesGlob(path, pattern)) matches.push({ path, pattern });
    }
  }
  return uniqueRiskyMatches(matches);
}

function matchesGlob(path, pattern) {
  const normalizedPath = String(path ?? '').replace(/^\/+/, '');
  const normalizedPattern = String(pattern ?? '').replace(/^\/+/, '');
  if (!normalizedPattern) return false;
  const regex = globToRegExp(normalizedPattern);
  return regex.test(normalizedPath);
}

function globToRegExp(pattern) {
  let source = '^';
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index];
    const next = pattern[index + 1];
    if (char === '*' && next === '*') {
      const after = pattern[index + 2];
      if (after === '/') {
        source += '(?:.+/)?';
        index += 2;
      } else {
        source += '.*';
        index += 1;
      }
      continue;
    }
    if (char === '*') {
      source += '[^/]*';
      continue;
    }
    source += escapeRegExp(char);
  }
  source += '$';
  return new RegExp(source, 'i');
}

function escapeRegExp(value) {
  return value.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
}

function positiveNumber(value, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

function unique(items) {
  return [...new Set(items)];
}

function uniqueRiskyMatches(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = `${item.path}\u0000${item.pattern}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
