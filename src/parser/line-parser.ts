export type LogicalLine =
  | {type: 'tag'; tag: string; value: string}
  | {type: 'stanza-header'; stanzaType: string}
  | {type: 'blank'};

/**
 * Strip a trailing `! comment` from a raw value string.
 *
 * Comments are only recognized outside of quoted strings. A `!` inside
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
 * Stateful line accumulator that handles continuation lines and produces
 * LogicalLine objects. Shared by both the string and streaming parsers to
 * avoid duplicating line-level parsing logic.
 */
export class LineAccumulator {
    private pendingTag: string | null = null;
    private pendingValue: string | null = null;

    /**
   * Feed a single raw line (no line terminators) into the accumulator.
   * Returns zero or more logical lines produced by this raw line.
   */
    feed(raw: string): LogicalLine[] {
        const results: LogicalLine[] = [];

        // Full-line comment
        if (raw.startsWith('!')) {
            return results;
        }

        // Blank line
        if (raw.trim() === '') {
            this.flushPendingInto(results);
            results.push({type: 'blank'});
            return results;
        }

        // Continuation line: starts with whitespace and we have a pending tag
        if ((raw[0] === ' ' || raw[0] === '\t') && this.pendingTag !== null) {
            this.pendingValue += ` ${  raw.trimStart()}`;
            return results;
        }

        // Stanza header
        const stanzaMatch = raw.match(/^\[(\w+)\]\s*$/);
        if (stanzaMatch?.[1]) {
            this.flushPendingInto(results);
            results.push({type: 'stanza-header', stanzaType: stanzaMatch[1]});
            return results;
        }

        // Tag-value pair: first colon separates tag from value
        const colonIdx = raw.indexOf(':');
        if (colonIdx !== -1) {
            this.flushPendingInto(results);
            this.pendingTag = raw.slice(0, colonIdx).trim();
            const afterColon = raw.slice(colonIdx + 1);
            this.pendingValue = afterColon.startsWith(' ') ? afterColon.slice(1) : afterColon;
            return results;
        }

        // Fallback: unrecognized line — flush and skip
        this.flushPendingInto(results);
        return results;
    }

    /**
   * Flush any remaining pending tag-value pair. Call this after all lines
   * have been fed to emit the final logical line.
   */
    flush(): LogicalLine[] {
        const results: LogicalLine[] = [];
        this.flushPendingInto(results);
        return results;
    }

    private flushPendingInto(results: LogicalLine[]): void {
        if (this.pendingTag !== null && this.pendingValue !== null) {
            results.push({
                type: 'tag',
                tag: this.pendingTag,
                value: stripTrailingComment(this.pendingValue)
            });
            this.pendingTag = null;
            this.pendingValue = null;
        }
    }
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
    const accumulator = new LineAccumulator();
    const results: LogicalLine[] = [];

    for (const raw of rawLines) {
        results.push(...accumulator.feed(raw));
    }

    results.push(...accumulator.flush());
    return results;
}
