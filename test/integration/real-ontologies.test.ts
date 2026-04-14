import {describe, it, expect} from 'vitest';
import {readFileSync, existsSync} from 'fs';
import {join} from 'path';
import {parseObo} from '../../src/parse.js';
import {parseOboStream} from '../../src/stream.js';
import type {OboStanza, OboTerm, OboTypedef} from '../../src/types.js';

function oboPath(name: string): string {
    return join(__dirname, name);
}

const describeIfFile = (path: string) => (existsSync(path) ? describe : describe.skip);

function lazyRead(path: string): () => string {
    let cached: string | undefined;
    return () => {
        if (cached === undefined) {
            cached = readFileSync(path, 'utf-8');
        }
        return cached;
    };
}

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

// ---------------------------------------------------------------------------
// UO — Units of Measurement (small, basic)
// ---------------------------------------------------------------------------

describeIfFile(oboPath('uo.obo'))('UO (Units of Measurement)', () => {
    const getText = lazyRead(oboPath('uo.obo'));

    it('parses without throwing', () => {
        expect(() => parseObo(getText())).not.toThrow();
    });

    it('has correct header metadata', () => {
        const doc = parseObo(getText());
        expect(doc.header.formatVersion).toBe('1.2');
        expect(doc.header.ontology).toBe('uo');
        expect(doc.header.dataVersion).toBeTruthy();
    });

    it('parses expected number of terms', () => {
        const doc = parseObo(getText());
        expect(doc.terms.length).toBeGreaterThanOrEqual(500);
    });

    it('every term has a UO: id', () => {
        const doc = parseObo(getText());
        for (const term of doc.terms) {
            expect(term.id).toBeTruthy();
            expect(term.id).toMatch(/^UO:/);
        }
    });

    it('streaming produces identical results', async () => {
        const doc = parseObo(getText());
        const stanzas = await collectStanzas(parseOboStream(singleChunk(getText())));
        const streamTerms = stanzas
            .filter((s): s is {type: 'term'; term: OboTerm} => s.type === 'term')
            .map((s) => s.term);
        expect(streamTerms).toEqual(doc.terms);
    });
});

// ---------------------------------------------------------------------------
// GO — Gene Ontology (large, exercises many features)
// ---------------------------------------------------------------------------

describeIfFile(oboPath('go.obo'))('GO (Gene Ontology)', () => {
    const getText = lazyRead(oboPath('go.obo'));

    it('parses without throwing', () => {
        expect(() => parseObo(getText())).not.toThrow();
    });

    it('has correct header metadata', () => {
        const doc = parseObo(getText());
        expect(doc.header.formatVersion).toBe('1.2');
        expect(doc.header.ontology).toBe('go');
        expect(doc.header.dataVersion).toBeTruthy();
    });

    it('parses >40,000 terms', () => {
        const doc = parseObo(getText());
        expect(doc.terms.length).toBeGreaterThan(40000);
    });

    it('has no unparsed header tags', () => {
        const doc = parseObo(getText());
        expect(doc.header.unparsedTags).toEqual([]);
    });

    it('has no unparsed stanza tags', () => {
        const doc = parseObo(getText());
        for (const term of doc.terms) {
            expect(term.unparsedTags).toEqual([]);
        }
        for (const td of doc.typedefs) {
            expect(td.unparsedTags).toEqual([]);
        }
    });

    it('parses header subsetDefs and synonymTypeDefs', () => {
        const doc = parseObo(getText());
        expect(doc.header.subsetDefs.length).toBeGreaterThan(10);
        for (const sd of doc.header.subsetDefs) {
            expect(sd.id).toBeTruthy();
            expect(sd.description).toBeTruthy();
        }
        expect(doc.header.synonymTypeDefs.length).toBeGreaterThan(0);
    });

    it('parses header idSpaces', () => {
        const doc = parseObo(getText());
        expect(doc.header.idSpaces.length).toBeGreaterThan(0);
        for (const is of doc.header.idSpaces) {
            expect(is.prefix).toBeTruthy();
            expect(is.uri).toBeTruthy();
        }
    });

    it('parses header property_values', () => {
        const doc = parseObo(getText());
        expect(doc.header.propertyValues.length).toBeGreaterThan(0);
        for (const pv of doc.header.propertyValues) {
            expect(pv.property).toBeTruthy();
            expect(pv.value).toBeTruthy();
        }
    });

    it('every non-obsolete term has a definition', () => {
        const doc = parseObo(getText());
        const active = doc.terms.filter((t) => !t.isObsolete);
        for (const term of active) {
            expect(term.definition).not.toBeNull();
            expect(term.definition!.text.length).toBeGreaterThan(0);
        }
    });

    it('parses synonyms with scopes and xrefs', () => {
        const doc = parseObo(getText());
        const withSyn = doc.terms.filter((t) => t.synonyms.length > 0);
        expect(withSyn.length).toBeGreaterThan(20000);
        for (const term of withSyn.slice(0, 100)) {
            for (const syn of term.synonyms) {
                expect(syn.text).toBeTruthy();
                expect(['EXACT', 'BROAD', 'NARROW', 'RELATED']).toContain(syn.scope);
            }
        }
    });

    it('parses is_a relationships', () => {
        const doc = parseObo(getText());
        const withIsA = doc.terms.filter((t) => t.isA.length > 0);
        expect(withIsA.length).toBeGreaterThan(30000);
        for (const term of withIsA.slice(0, 100)) {
            for (const isa of term.isA) {
                expect(isa.target).toMatch(/^GO:/);
            }
        }
    });

    it('parses named relationships', () => {
        const doc = parseObo(getText());
        const withRel = doc.terms.filter((t) => t.relationships.length > 0);
        expect(withRel.length).toBeGreaterThan(10000);
        for (const term of withRel.slice(0, 50)) {
            for (const rel of term.relationships) {
                expect(rel.predicate).toBeTruthy();
                expect(rel.target).toMatch(/^GO:/);
            }
        }
    });

    it('detects obsolete terms with replaced_by and consider', () => {
        const doc = parseObo(getText());
        const obsolete = doc.terms.filter((t) => t.isObsolete);
        expect(obsolete.length).toBeGreaterThan(5000);
        const withReplace = obsolete.filter((t) => t.replacedBy.length > 0);
        const withConsider = obsolete.filter((t) => t.consider.length > 0);
        expect(withReplace.length).toBeGreaterThan(1000);
        expect(withConsider.length).toBeGreaterThan(1000);
    });

    it('parses typedefs with relationship properties', () => {
        const doc = parseObo(getText());
        expect(doc.typedefs.length).toBeGreaterThan(0);
        const transitive = doc.typedefs.filter((t) => t.isTransitive);
        expect(transitive.length).toBeGreaterThan(0);
        const withChain = doc.typedefs.filter((t) => t.holdsOverChain.length > 0);
        expect(withChain.length).toBeGreaterThan(0);
        for (const td of withChain) {
            for (const chain of td.holdsOverChain) {
                expect(chain).toHaveLength(2);
                expect(chain[0]).toBeTruthy();
                expect(chain[1]).toBeTruthy();
            }
        }
    });

    it('streaming produces identical term count', async () => {
        const doc = parseObo(getText());
        const stanzas = await collectStanzas(parseOboStream(singleChunk(getText())));
        const streamTerms = stanzas.filter((s) => s.type === 'term');
        expect(streamTerms.length).toBe(doc.terms.length);
    });
});

// ---------------------------------------------------------------------------
// PO — Plant Ontology (intersection_of, disjoint_from, created_by)
// ---------------------------------------------------------------------------

describeIfFile(oboPath('po.obo'))('PO (Plant Ontology)', () => {
    const getText = lazyRead(oboPath('po.obo'));

    it('parses without throwing', () => {
        expect(() => parseObo(getText())).not.toThrow();
    });

    it('has no unparsed tags in any stanza', () => {
        const doc = parseObo(getText());
        for (const term of doc.terms) {
            expect(term.unparsedTags).toEqual([]);
        }
        for (const td of doc.typedefs) {
            expect(td.unparsedTags).toEqual([]);
        }
    });

    it('parses intersection_of components', () => {
        const doc = parseObo(getText());
        const withIntersection = doc.terms.filter((t) => t.intersectionOf.length > 0);
        expect(withIntersection.length).toBeGreaterThan(50);
        for (const term of withIntersection) {
            const genus = term.intersectionOf.filter((i) => i.predicate === null);
            expect(genus.length).toBeGreaterThanOrEqual(1);
            for (const comp of term.intersectionOf) {
                expect(comp.target).toBeTruthy();
            }
        }
    });

    it('parses disjoint_from', () => {
        const doc = parseObo(getText());
        const withDisjoint = doc.terms.filter((t) => t.disjointFrom.length > 0);
        expect(withDisjoint.length).toBeGreaterThan(10);
    });

    it('parses created_by and creation_date', () => {
        const doc = parseObo(getText());
        const withCreator = doc.terms.filter((t) => t.createdBy !== null);
        expect(withCreator.length).toBeGreaterThan(500);
        const withDate = doc.terms.filter((t) => t.creationDate !== null);
        expect(withDate.length).toBeGreaterThan(500);
    });

    it('parses typedefs with inverse_of', () => {
        const doc = parseObo(getText());
        const withInverse = doc.typedefs.filter((t) => t.inverseOf !== null);
        expect(withInverse.length).toBeGreaterThanOrEqual(1);
        for (const td of withInverse) {
            expect(td.inverseOf).toBeTruthy();
        }
    });

    it('parses header synonymTypeDefs with scopes', () => {
        const doc = parseObo(getText());
        expect(doc.header.synonymTypeDefs.length).toBeGreaterThan(0);
        const withScope = doc.header.synonymTypeDefs.filter((s) => s.scope !== null);
        expect(withScope.length).toBeGreaterThan(0);
    });

    it('parses treat-xrefs-as-is_a', () => {
        const doc = parseObo(getText());
        expect(doc.header.treatXrefsAsIsA.length).toBeGreaterThan(0);
    });

    it('streaming produces identical results', async () => {
        const doc = parseObo(getText());
        const stanzas = await collectStanzas(parseOboStream(singleChunk(getText())));
        const streamTerms = stanzas
            .filter((s): s is {type: 'term'; term: OboTerm} => s.type === 'term')
            .map((s) => s.term);
        expect(streamTerms).toEqual(doc.terms);
        const streamTypedefs = stanzas
            .filter((s): s is {type: 'typedef'; typedef: OboTypedef} => s.type === 'typedef')
            .map((s) => s.typedef);
        expect(streamTypedefs).toEqual(doc.typedefs);
    });
});

// ---------------------------------------------------------------------------
// PATO — Phenotype And Trait Ontology (transitive_over, domain/range)
// ---------------------------------------------------------------------------

describeIfFile(oboPath('pato.obo'))('PATO (Phenotype And Trait Ontology)', () => {
    const getText = lazyRead(oboPath('pato.obo'));

    it('parses without throwing', () => {
        expect(() => parseObo(getText())).not.toThrow();
    });

    it('has no unparsed tags in any stanza', () => {
        const doc = parseObo(getText());
        for (const term of doc.terms) {
            expect(term.unparsedTags).toEqual([]);
        }
        for (const td of doc.typedefs) {
            expect(td.unparsedTags).toEqual([]);
        }
    });

    it('parses typedefs with transitive_over', () => {
        const doc = parseObo(getText());
        const withTransOver = doc.typedefs.filter((t) => t.transitiveOver.length > 0);
        expect(withTransOver.length).toBeGreaterThan(0);
    });

    it('parses typedefs with domain and range', () => {
        const doc = parseObo(getText());
        const withDomain = doc.typedefs.filter((t) => t.domain !== null);
        expect(withDomain.length).toBeGreaterThan(0);
        const withRange = doc.typedefs.filter((t) => t.range !== null);
        expect(withRange.length).toBeGreaterThan(0);
    });

    it('parses many disjoint_from relationships', () => {
        const doc = parseObo(getText());
        const withDisjoint = doc.terms.filter((t) => t.disjointFrom.length > 0);
        expect(withDisjoint.length).toBeGreaterThan(50);
    });

    it('parses header idSpaces', () => {
        const doc = parseObo(getText());
        expect(doc.header.idSpaces.length).toBeGreaterThan(0);
    });

    it('parses property_values on terms', () => {
        const doc = parseObo(getText());
        const withPV = doc.terms.filter((t) => t.propertyValues.length > 0);
        expect(withPV.length).toBeGreaterThan(500);
        for (const term of withPV.slice(0, 50)) {
            for (const pv of term.propertyValues) {
                expect(pv.property).toBeTruthy();
                expect(pv.value).toBeTruthy();
            }
        }
    });

    it('streaming produces identical results', async () => {
        const doc = parseObo(getText());
        const stanzas = await collectStanzas(parseOboStream(singleChunk(getText())));
        const streamTerms = stanzas
            .filter((s): s is {type: 'term'; term: OboTerm} => s.type === 'term')
            .map((s) => s.term);
        expect(streamTerms).toEqual(doc.terms);
    });
});
