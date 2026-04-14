import {describe, it, expect} from 'vitest';
import {readFileSync, existsSync} from 'fs';
import {join} from 'path';
import {parseObo} from '../../src/parse.js';
import {parseOboStream} from '../../src/stream.js';
import type {OboStanza, OboTerm} from '../../src/types.js';

const UO_PATH = join(__dirname, 'uo.obo');

const describeIfFile = (path: string) => (existsSync(path) ? describe : describe.skip);

async function collectStanzas(input: AsyncGenerator<OboStanza>): Promise<OboStanza[]> {
    const results: OboStanza[] = [];
    for await (const stanza of input) {
        results.push(stanza);
    }
    return results;
}

async function* singleChunk(text: string): AsyncGenerator<string> {
    yield text;
}

describeIfFile(UO_PATH)('UO (Units of Measurement) ontology', () => {
    const text = existsSync(UO_PATH) ? readFileSync(UO_PATH, 'utf-8') : '';

    it('parses without throwing', () => {
        expect(() => parseObo(text)).not.toThrow();
    });

    it('has correct header metadata', () => {
        const doc = parseObo(text);
        expect(doc.header.formatVersion).toBe('1.2');
        expect(doc.header.ontology).toBe('uo');
        expect(doc.header.dataVersion).toBeTruthy();
    });

    it('parses the expected number of terms', () => {
        const doc = parseObo(text);
        // UO has ~574 terms as of 2026-01-16
        expect(doc.terms.length).toBeGreaterThanOrEqual(500);
        expect(doc.terms.length).toBeLessThan(1000);
    });

    it('every term has an id', () => {
        const doc = parseObo(text);
        for (const term of doc.terms) {
            expect(term.id).toBeTruthy();
            expect(term.id).toMatch(/^UO:/);
        }
    });

    it('most terms have a name', () => {
        const doc = parseObo(text);
        const named = doc.terms.filter((t) => t.name !== null);
        expect(named.length / doc.terms.length).toBeGreaterThan(0.99);
    });

    it('parses the root term correctly', () => {
        const doc = parseObo(text);
        const root = doc.terms.find((t) => t.id === 'UO:0000000');
        expect(root).toBeDefined();
        expect(root!.name).toBe('unit');
        expect(root!.definition).toBeDefined();
        expect(root!.isA).toHaveLength(0);
    });

    it('parses a mid-hierarchy term with is_a', () => {
        const doc = parseObo(text);
        const lengthUnit = doc.terms.find((t) => t.id === 'UO:0000001');
        expect(lengthUnit).toBeDefined();
        expect(lengthUnit!.name).toBe('length unit');
        expect(lengthUnit!.isA.length).toBeGreaterThanOrEqual(1);
        expect(lengthUnit!.isA[0].target).toBe('UO:0000000');
    });

    it('detects obsolete terms', () => {
        const doc = parseObo(text);
        const obsolete = doc.terms.filter((t) => t.isObsolete);
        expect(obsolete.length).toBeGreaterThanOrEqual(1);
    });

    it('parses synonyms', () => {
        const doc = parseObo(text);
        const withSynonyms = doc.terms.filter((t) => t.synonyms.length > 0);
        expect(withSynonyms.length).toBeGreaterThan(0);
        for (const term of withSynonyms) {
            for (const syn of term.synonyms) {
                expect(syn.text).toBeTruthy();
                expect(['EXACT', 'BROAD', 'NARROW', 'RELATED']).toContain(syn.scope);
            }
        }
    });

    it('streaming produces identical results', async () => {
        const doc = parseObo(text);
        const stanzas = await collectStanzas(parseOboStream(singleChunk(text)));

        const streamTerms = stanzas
            .filter((s): s is {type: 'term'; term: OboTerm} => s.type === 'term')
            .map((s) => s.term);

        expect(streamTerms.length).toBe(doc.terms.length);

        // Spot-check a few terms for deep equality
        expect(streamTerms[0]).toEqual(doc.terms[0]);
        expect(streamTerms[streamTerms.length - 1]).toEqual(doc.terms[doc.terms.length - 1]);
    });
});
