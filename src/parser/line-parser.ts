export type LogicalLine =
  | { type: 'tag'; tag: string; value: string }
  | { type: 'stanza-header'; stanzaType: string }
  | { type: 'blank' };

/**
 * Strip a trailing `! comment` from a raw value string.
 *
 * Comments are only recognized outside of quoted strings.  A `!` inside
 * double quotes is part of the value, not a comment delimiter.
 */
export function stripTrailingComment(raw: string): string {
  let inQuote = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }

    if (!inQuote && ch === '!') {
      // Walk backwards to trim whitespace before the `!`
      let end = i;
      while (end > 0 && (raw[end - 1] === ' ' || raw[end - 1] === '\t')) {
        end--;
      }
      return raw.slice(0, end);
    }
  }

  return raw;
}

/**
 * Parse raw text into logical lines.
 *
 * Handles:
 * - Full-line comments (lines starting with `!`)
 * - Blank lines
 * - Stanza headers (`[Term]`, `[Typedef]`, `[Instance]`)
 * - Tag-value pairs (`tag: value`)
 * - Continuation lines (leading whitespace joined to the previous tag line)
 * - Trailing `! comments` stripped from values
 */
export function parseLines(text: string): LogicalLine[] {
  const rawLines = text.split(/\r?\n/);
  const results: LogicalLine[] = [];

  let pendingTag: string | null = null;
  let pendingValue: string | null = null;

  function flushPending(): void {
    if (pendingTag !== null && pendingValue !== null) {
      results.push({
        type: 'tag',
        tag: pendingTag,
        value: stripTrailingComment(pendingValue),
      });
      pendingTag = null;
      pendingValue = null;
    }
  }

  for (const raw of rawLines) {
    // Full-line comment
    if (raw.startsWith('!')) {
      continue;
    }

    // Blank line
    if (raw.trim() === '') {
      flushPending();
      results.push({ type: 'blank' });
      continue;
    }

    // Continuation line: starts with whitespace and we have a pending tag
    if ((raw[0] === ' ' || raw[0] === '\t') && pendingTag !== null) {
      pendingValue += ' ' + raw.trimStart();
      continue;
    }

    // Stanza header
    const stanzaMatch = raw.match(/^\[(\w+)\]\s*$/);
    if (stanzaMatch) {
      flushPending();
      results.push({ type: 'stanza-header', stanzaType: stanzaMatch[1] });
      continue;
    }

    // Tag-value pair: first colon separates tag from value
    const colonIdx = raw.indexOf(':');
    if (colonIdx !== -1) {
      flushPending();
      pendingTag = raw.slice(0, colonIdx).trim();
      // Value starts after the colon; strip one leading space if present
      const afterColon = raw.slice(colonIdx + 1);
      pendingValue = afterColon.startsWith(' ') ? afterColon.slice(1) : afterColon;
      continue;
    }

    // Fallback: unrecognized line — flush and skip
    flushPending();
  }

  flushPending();
  return results;
}
