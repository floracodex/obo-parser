import type {
    OboXref,
    OboDefinition,
    OboSynonym,
    OboSynonymScope,
    OboQualifier,
    OboPropertyValue,
    OboRelationship,
    OboIntersection,
    OboIsA,
    OboSubsetDef,
    OboSynonymTypeDef,
    OboIdSpace
} from '../types.js';
import {OboParseError} from '../error.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_SYNONYM_SCOPES = new Set<string>(['EXACT', 'BROAD', 'NARROW', 'RELATED']);

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/**
 * Parse a quoted string starting at `offset` (which must point to the opening `"`).
 * Returns the unescaped string content and the index after the closing `"`.
 */
export function parseQuotedString(
    input: string,
    offset: number
): {value: string; end: number} {
    if (input[offset] !== '"') {
        throw new OboParseError(
            `Expected '"' at position ${offset}, got '${input[offset]}'`,
            undefined,
            input
        );
    }

    const chunks: string[] = [];
    let segStart = offset + 1;
    let i = offset + 1;

    while (i < input.length) {
        const ch = input[i];

        if (ch === '\\') {
            // Flush the segment before this escape
            if (i > segStart) { chunks.push(input.slice(segStart, i)); }
            i++;
            if (i >= input.length) { break; }
            const esc = input[i];
            switch (esc) {
                case '"':
                    chunks.push('"');
                    break;
                case '\\':
                    chunks.push('\\');
                    break;
                case 'n':
                    chunks.push('\n');
                    break;
                case 't':
                    chunks.push('\t');
                    break;
                case ':':
                    chunks.push(':');
                    break;
                case '!':
                    chunks.push('!');
                    break;
                case 'x': {
                    if (i + 2 >= input.length) {
                        throw new OboParseError(
                            `Incomplete \\x escape at position ${i - 1}`,
                            undefined,
                            input
                        );
                    }
                    const hex = input.slice(i + 1, i + 3);
                    if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
                        throw new OboParseError(
                            `Invalid hex escape \\x${hex} at position ${i - 1}`,
                            undefined,
                            input
                        );
                    }
                    chunks.push(String.fromCharCode(parseInt(hex, 16)));
                    i += 2;
                    break;
                }
                default:
                    chunks.push(`\\${  esc}`);
            }
            i++;
            segStart = i;
            continue;
        }

        if (ch === '"') {
            if (i > segStart) { chunks.push(input.slice(segStart, i)); }
            return {value: chunks.join(''), end: i + 1};
        }

        i++;
    }

    // Unterminated quote
    throw new OboParseError(
        `Unterminated quoted string starting at position ${offset}`,
        undefined,
        input
    );
}

/**
 * Skip whitespace characters starting at `offset`.
 */
function skipWhitespace(input: string, offset: number): number {
    while (offset < input.length && (input[offset] === ' ' || input[offset] === '\t')) {
        offset++;
    }
    return offset;
}

/**
 * Read a non-whitespace token starting at `offset`.
 * Stops at whitespace, comma, `]`, `}`, or end of string.
 */
function readToken(input: string, offset: number): {token: string; end: number} {
    let i = offset;
    while (
        i < input.length &&
    input[i] !== ' ' &&
    input[i] !== '\t' &&
    input[i] !== ',' &&
    input[i] !== ']' &&
    input[i] !== '}'
    ) {
        i++;
    }
    return {token: input.slice(offset, i), end: i};
}

// ---------------------------------------------------------------------------
// Xref parsing
// ---------------------------------------------------------------------------

/**
 * Parse a single xref: `id` or `id "description"`.
 * Input is the raw text of one xref (no surrounding brackets or commas).
 */
export function parseXref(input: string): OboXref {
    const trimmed = input.trim();
    const quoteIdx = trimmed.indexOf('"');

    if (quoteIdx === -1) {
        return {id: trimmed, description: null};
    }

    const id = trimmed.slice(0, quoteIdx).trim();
    const {value} = parseQuotedString(trimmed, quoteIdx);
    return {id, description: value};
}

/**
 * Parse an xref list `[xref1, xref2, ...]` starting at `offset`.
 * Returns the parsed xrefs and the index after the closing `]`.
 */
export function parseXrefList(
    input: string,
    offset: number
): {xrefs: OboXref[]; end: number} {
    if (input[offset] !== '[') {
        throw new OboParseError(`Expected '[' at position ${offset}`, undefined, input);
    }

    const closeBracket = findMatchingBracket(input, offset);
    const inner = input.slice(offset + 1, closeBracket).trim();
    const xrefs: OboXref[] = [];

    if (inner.length > 0) {
        const parts = splitXrefList(inner);
        for (const part of parts) {
            xrefs.push(parseXref(part));
        }
    }

    return {xrefs, end: closeBracket + 1};
}

/**
 * Find the matching `]` for a `[` at `offset`, respecting quoted strings.
 */
function findMatchingBracket(input: string, offset: number): number {
    let depth = 0;
    let inQuote = false;
    let escaped = false;

    for (let i = offset; i < input.length; i++) {
        if (escaped) {
            escaped = false;
            continue;
        }
        const ch = input[i];
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inQuote = !inQuote;
            continue;
        }
        if (!inQuote) {
            if (ch === '[') { depth++; }
            if (ch === ']') {
                depth--;
                if (depth === 0) { return i; }
            }
        }
    }

    return input.length;
}

/**
 * Split the inner content of an xref list by commas, respecting quoted strings.
 */
function splitXrefList(inner: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuote = false;
    let escaped = false;

    for (const ch of inner) {
        if (escaped) {
            current += ch;
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            current += ch;
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inQuote = !inQuote;
            current += ch;
            continue;
        }
        if (ch === ',' && !inQuote) {
            const trimmed = current.trim();
            if (trimmed) { parts.push(trimmed); }
            current = '';
            continue;
        }
        current += ch;
    }

    const trimmed = current.trim();
    if (trimmed) { parts.push(trimmed); }
    return parts;
}

// ---------------------------------------------------------------------------
// Qualifier parsing
// ---------------------------------------------------------------------------

/**
 * Parse qualifier block `{key="value", key2="value2"}` from the beginning of
 * a value string, if present.  Returns qualifiers and the remainder.
 */
export function parseQualifiers(value: string): {
    qualifiers: OboQualifier[];
    remainder: string;
} {
    const trimmed = value.trim();
    if (!trimmed.startsWith('{')) {
        return {qualifiers: [], remainder: value};
    }

    const closeBrace = findMatchingBrace(trimmed, 0);
    const inner = trimmed.slice(1, closeBrace).trim();
    const remainder = trimmed.slice(closeBrace + 1).trim();
    const qualifiers: OboQualifier[] = [];

    if (inner.length > 0) {
    // Split by commas outside quotes
        const parts = splitXrefList(inner);
        for (const part of parts) {
            const eqIdx = part.indexOf('=');
            if (eqIdx !== -1) {
                const key = part.slice(0, eqIdx).trim();
                const rawVal = part.slice(eqIdx + 1).trim();
                // Value may be quoted or bare
                if (rawVal.startsWith('"')) {
                    const {value: parsed} = parseQuotedString(rawVal, 0);
                    qualifiers.push({key, value: parsed});
                } else {
                    qualifiers.push({key, value: rawVal});
                }
            }
        }
    }

    return {qualifiers, remainder};
}

function findMatchingBrace(input: string, offset: number): number {
    let depth = 0;
    let inQuote = false;
    let escaped = false;

    for (let i = offset; i < input.length; i++) {
        if (escaped) {
            escaped = false;
            continue;
        }
        const ch = input[i];
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inQuote = !inQuote;
            continue;
        }
        if (!inQuote) {
            if (ch === '{') { depth++; }
            if (ch === '}') {
                depth--;
                if (depth === 0) { return i; }
            }
        }
    }

    return input.length;
}

// ---------------------------------------------------------------------------
// Tag value parsers
// ---------------------------------------------------------------------------

/**
 * Parse a `def:` value: `"definition text" [xref_list]`
 */
export function parseDefinition(value: string): OboDefinition {
    const trimmed = value.trim();
    const {value: text, end} = parseQuotedString(trimmed, 0);

    const offset = skipWhitespace(trimmed, end);
    let xrefs: OboXref[] = [];
    if (offset < trimmed.length && trimmed[offset] === '[') {
        ({xrefs} = parseXrefList(trimmed, offset));
    }

    return {text, xrefs};
}

/**
 * Parse a `synonym:` value: `"text" SCOPE [TYPE] [xref_list]`
 */
export function parseSynonym(value: string): OboSynonym {
    const trimmed = value.trim();
    const {value: text, end} = parseQuotedString(trimmed, 0);

    let offset = skipWhitespace(trimmed, end);
    const {token: scope, end: scopeEnd} = readToken(trimmed, offset);

    if (!VALID_SYNONYM_SCOPES.has(scope)) {
        throw new OboParseError(`Invalid synonym scope: '${scope}'`, 'synonym', value);
    }

    offset = skipWhitespace(trimmed, scopeEnd);

    // Next might be a synonym type ID or directly the xref list
    let type: string | null = null;
    let xrefs: OboXref[] = [];

    if (offset < trimmed.length && trimmed[offset] !== '[') {
    // It's a synonym type
        const {token: typeId, end: typeEnd} = readToken(trimmed, offset);
        type = typeId;
        offset = skipWhitespace(trimmed, typeEnd);
    }

    if (offset < trimmed.length && trimmed[offset] === '[') {
        ({xrefs} = parseXrefList(trimmed, offset));
    }

    return {text, scope: scope as OboSynonymScope, type, xrefs};
}

/**
 * Parse a single xref tag value: `id "optional desc"`
 */
export function parseXrefTagValue(value: string): OboXref {
    return parseXref(value);
}

/**
 * Parse a `property_value:` value.
 * Forms:
 * - `property "value" xsd:string`
 * - `property "value" xsd:dateTime`
 * - `property value` (bare ID value, no datatype)
 */
export function parsePropertyValue(value: string): OboPropertyValue {
    const trimmed = value.trim();
    const {token: property, end} = readToken(trimmed, 0);
    let offset = skipWhitespace(trimmed, end);

    if (offset < trimmed.length && trimmed[offset] === '"') {
        const {value: val, end: valEnd} = parseQuotedString(trimmed, offset);
        offset = skipWhitespace(trimmed, valEnd);

        let datatype: string | null = null;
        if (offset < trimmed.length) {
            ({token: datatype} = readToken(trimmed, offset));
        }
        return {property, value: val, datatype};
    }

    // Bare value (typically a reference ID)
    const {token: val} = readToken(trimmed, offset);
    return {property, value: val, datatype: null};
}

/**
 * Parse an `is_a:` value, potentially with qualifiers.
 * `TARGET_ID {qualifiers}`
 */
export function parseIsA(value: string): OboIsA {
    const {qualifiers, remainder} = extractTrailingQualifiers(value);
    return {target: remainder.trim(), qualifiers};
}

/**
 * Parse a `relationship:` value: `predicate target {qualifiers}`
 */
export function parseRelationship(value: string): OboRelationship {
    const {qualifiers, remainder} = extractTrailingQualifiers(value);
    const trimmed = remainder.trim();
    const spaceIdx = trimmed.indexOf(' ');

    if (spaceIdx === -1) {
        throw new OboParseError(
            `Expected 'predicate target' but got '${trimmed}'`,
            'relationship',
            value
        );
    }

    return {
        predicate: trimmed.slice(0, spaceIdx),
        target: trimmed.slice(spaceIdx + 1).trim(),
        qualifiers
    };
}

/**
 * Parse an `intersection_of:` value.
 * Forms:
 * - `TARGET_ID` (genus — bare accession)
 * - `predicate TARGET_ID` (differentia)
 * Either form may have trailing qualifiers: `{key="value"}`.
 */
export function parseIntersectionOf(value: string): OboIntersection {
    const {qualifiers, remainder} = extractTrailingQualifiers(value);
    const trimmed = remainder.trim();
    const spaceIdx = trimmed.indexOf(' ');

    if (spaceIdx === -1) {
        return {predicate: null, target: trimmed, qualifiers};
    }

    return {
        predicate: trimmed.slice(0, spaceIdx),
        target: trimmed.slice(spaceIdx + 1).trim(),
        qualifiers
    };
}

/**
 * Parse a `holds_over_chain:` or `equivalent_to_chain:` value: `rel1 rel2`
 */
export function parseChain(value: string, tag = 'holds_over_chain'): [string, string] {
    const trimmed = value.trim();
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx === -1) {
        throw new OboParseError(
            `Expected 'rel1 rel2' but got '${trimmed}'`,
            tag,
            value
        );
    }
    return [trimmed.slice(0, spaceIdx), trimmed.slice(spaceIdx + 1).trim()];
}

/**
 * Parse a `subsetdef:` header value: `ID "description"`
 */
export function parseSubsetDef(value: string): OboSubsetDef {
    const trimmed = value.trim();
    const quoteIdx = trimmed.indexOf('"');
    if (quoteIdx === -1) {
        return {id: trimmed, description: ''};
    }
    const id = trimmed.slice(0, quoteIdx).trim();
    const {value: description} = parseQuotedString(trimmed, quoteIdx);
    return {id, description};
}

/**
 * Parse a `synonymtypedef:` header value: `ID "description" [SCOPE]`
 */
export function parseSynonymTypeDef(value: string): OboSynonymTypeDef {
    const trimmed = value.trim();
    const quoteIdx = trimmed.indexOf('"');
    if (quoteIdx === -1) {
        return {id: trimmed, description: '', scope: null};
    }
    const id = trimmed.slice(0, quoteIdx).trim();
    const {value: description, end} = parseQuotedString(trimmed, quoteIdx);

    const offset = skipWhitespace(trimmed, end);
    let scope: OboSynonymScope | null = null;
    if (offset < trimmed.length) {
        const {token} = readToken(trimmed, offset);
        if (VALID_SYNONYM_SCOPES.has(token)) {
            scope = token as OboSynonymScope;
        }
    }

    return {id, description, scope};
}

/**
 * Parse an `idspace:` header value: `PREFIX URI ["description"]`
 */
export function parseIdSpace(value: string): OboIdSpace {
    const trimmed = value.trim();
    const {token: prefix, end} = readToken(trimmed, 0);
    let offset = skipWhitespace(trimmed, end);
    const {token: uri, end: uriEnd} = readToken(trimmed, offset);
    offset = skipWhitespace(trimmed, uriEnd);

    let description: string | null = null;
    if (offset < trimmed.length && trimmed[offset] === '"') {
        ({value: description} = parseQuotedString(trimmed, offset));
    }

    return {prefix, uri, description};
}

/**
 * Extract trailing qualifier block from a value string.
 * Qualifiers appear at the END: `some value {key="val"}`.
 *
 * Uses a forward scan to find the last top-level `{...}` block,
 * correctly handling quoted strings and escape sequences.
 */
function extractTrailingQualifiers(value: string): {
    qualifiers: OboQualifier[];
    remainder: string;
} {
    const trimmed = value.trim();

    if (!trimmed.endsWith('}')) {
        return {qualifiers: [], remainder: trimmed};
    }

    // Forward scan to find the last top-level '{' outside quotes
    let lastTopLevelBrace = -1;
    let inQuote = false;
    let escaped = false;
    let depth = 0;

    for (let i = 0; i < trimmed.length; i++) {
        if (escaped) {
            escaped = false;
            continue;
        }
        const ch = trimmed[i];
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (ch === '"') {
            inQuote = !inQuote;
            continue;
        }
        if (!inQuote) {
            if (ch === '{') {
                if (depth === 0) {
                    lastTopLevelBrace = i;
                }
                depth++;
            } else if (ch === '}') {
                depth--;
            }
        }
    }

    if (lastTopLevelBrace === -1 || depth !== 0) {
        return {qualifiers: [], remainder: trimmed};
    }

    const qualifierStr = trimmed.slice(lastTopLevelBrace);
    const remainder = trimmed.slice(0, lastTopLevelBrace).trim();
    const {qualifiers} = parseQualifiers(qualifierStr);
    return {qualifiers, remainder};
}
