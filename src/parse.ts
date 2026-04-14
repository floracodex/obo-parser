import type {OboDocument, OboTagValue} from './types.js';
import {parseLines} from './parser/line-parser.js';
import {buildHeader} from './parser/header-builder.js';
import {buildTerm, buildTypedef, buildInstance} from './parser/stanza-builder.js';

/**
 * Parse an OBO format string into a fully typed document.
 *
 * @param text - The full contents of an OBO file as a string.
 * @returns A typed OboDocument with header, terms, typedefs, and instances.
 */
export function parseObo(text: string): OboDocument {
    // Strip UTF-8 BOM if present
    const input = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
    const lines = parseLines(input);

    const headerTags: OboTagValue[] = [];
    const stanzas: {stanzaType: string; tags: OboTagValue[]}[] = [];
    let current: {stanzaType: string; tags: OboTagValue[]} | null = null;

    for (const line of lines) {
        if (line.type === 'blank') {
            continue;
        }

        if (line.type === 'stanza-header') {
            current = {stanzaType: line.stanzaType, tags: []};
            stanzas.push(current);
            continue;
        }

        if (line.type === 'tag') {
            if (current === null) {
                // Before any stanza — these are header tags
                headerTags.push({tag: line.tag, value: line.value});
            } else {
                current.tags.push({tag: line.tag, value: line.value});
            }
        }
    }

    const doc: OboDocument = {
        header: buildHeader(headerTags),
        terms: [],
        typedefs: [],
        instances: []
    };

    for (const stanza of stanzas) {
        if (stanza.tags.length === 0) {
            continue;
        }
        switch (stanza.stanzaType) {
            case 'Term':
                doc.terms.push(buildTerm(stanza.tags));
                break;
            case 'Typedef':
                doc.typedefs.push(buildTypedef(stanza.tags));
                break;
            case 'Instance':
                doc.instances.push(buildInstance(stanza.tags));
                break;
            // Unknown stanza types are silently skipped
        }
    }

    return doc;
}
