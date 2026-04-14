import {describe, it, expect} from 'vitest';
import {readFileSync} from 'fs';
import {join} from 'path';
import {parseObo} from '../src/parse.js';
import {OboParseError} from '../src/error.js';

function fixture(name: string): string {
    return readFileSync(join(__dirname, 'fixtures', name), 'utf-8');
}

describe('parseObo', () => {
    describe('minimal.obo', () => {
        it('parses header', () => {
            const doc = parseObo(fixture('minimal.obo'));
            expect(doc.header.formatVersion).toBe('1.2');
            expect(doc.header.ontology).toBe('test');
        });

        it('parses two terms', () => {
            const doc = parseObo(fixture('minimal.obo'));
            expect(doc.terms).toHaveLength(2);
            expect(doc.terms[0].id).toBe('TEST:0001');
            expect(doc.terms[0].name).toBe('root term');
            expect(doc.terms[1].id).toBe('TEST:0002');
            expect(doc.terms[1].name).toBe('child term');
            expect(doc.terms[1].isA).toEqual([{target: 'TEST:0001', qualifiers: []}]);
        });

        it('has no typedefs or instances', () => {
            const doc = parseObo(fixture('minimal.obo'));
            expect(doc.typedefs).toHaveLength(0);
            expect(doc.instances).toHaveLength(0);
        });
    });

    describe('full-header.obo', () => {
        it('parses all header fields', () => {
            const doc = parseObo(fixture('full-header.obo'));
            const h = doc.header;
            expect(h.formatVersion).toBe('1.2');
            expect(h.dataVersion).toBe('releases/2026-03-01');
            expect(h.date).toBe('01:03:2026 12:00');
            expect(h.savedBy).toBe('curator');
            expect(h.ontology).toBe('po');
            expect(h.defaultNamespace).toBe('plant_ontology');
            expect(h.remarks).toEqual(['This is a test ontology', 'Second remark']);
            expect(h.imports).toEqual(['http://purl.obolibrary.org/obo/ro.obo']);
            expect(h.subsetDefs).toEqual([{id: 'slim_plant', description: 'Plant slim'}]);
            expect(h.synonymTypeDefs).toEqual([
                {id: 'systematic_synonym', description: 'Systematic synonym', scope: 'EXACT'}
            ]);
            expect(h.idSpaces).toEqual([
                {
                    prefix: 'PO',
                    uri: 'urn:lsid:bioontology.org:PO:',
                    description: 'Plant Ontology'
                }
            ]);
            expect(h.treatXrefsAsEquivalent).toEqual(['CL']);
            expect(h.treatXrefsAsIsA).toEqual(['GO']);
            expect(h.owlAxioms).toHaveLength(1);
            expect(h.propertyValues).toHaveLength(1);
        });
    });

    describe('escapes.obo', () => {
        it('handles escaped quotes in definitions', () => {
            const doc = parseObo(fixture('escapes.obo'));
            const term = doc.terms[0];
            expect(term.definition!.text).toBe(
                'A definition with "quoted text" and a backslash \\ inside.'
            );
        });

        it('handles escaped quotes in synonyms', () => {
            const doc = parseObo(fixture('escapes.obo'));
            const term = doc.terms[0];
            expect(term.synonyms[0].text).toBe('term with "quotes"');
        });

        it('strips trailing ! comment from unquoted values', () => {
            const doc = parseObo(fixture('escapes.obo'));
            const term = doc.terms[0];
            // Per OBO spec, ! outside quotes is always a comment delimiter
            expect(term.comment).toBe('A comment with');
        });
    });

    describe('obsolete.obo', () => {
        it('parses obsolete terms', () => {
            const doc = parseObo(fixture('obsolete.obo'));
            expect(doc.terms).toHaveLength(2);

            const obsolete = doc.terms[1];
            expect(obsolete.id).toBe('TEST:OLD001');
            expect(obsolete.isObsolete).toBe(true);
            expect(obsolete.replacedBy).toEqual(['TEST:0001']);
            expect(obsolete.consider).toEqual(['TEST:0002', 'TEST:0003']);
        });
    });

    describe('typedef.obo', () => {
        it('parses typedef stanzas', () => {
            const doc = parseObo(fixture('typedef.obo'));
            expect(doc.typedefs).toHaveLength(2);

            const partOf = doc.typedefs[0];
            expect(partOf.id).toBe('part_of');
            expect(partOf.name).toBe('part of');
            expect(partOf.isTransitive).toBe(true);
            expect(partOf.isReflexive).toBe(true);
            expect(partOf.inverseOf).toBe('has_part');
            expect(partOf.domain).toBe('BFO:0000001');
            expect(partOf.range).toBe('BFO:0000001');
            expect(partOf.holdsOverChain).toEqual([['has_part', 'part_of']]);
            expect(partOf.synonyms).toHaveLength(1);
            expect(partOf.xrefs).toEqual([{id: 'RO:0000050', description: null}]);

            const hasPart = doc.typedefs[1];
            expect(hasPart.id).toBe('has_part');
            expect(hasPart.isClassLevel).toBe(true);
            expect(hasPart.isMetadataTag).toBe(false);
        });
    });

    describe('instance.obo', () => {
        it('parses instance stanzas', () => {
            const doc = parseObo(fixture('instance.obo'));
            expect(doc.terms).toHaveLength(1);
            expect(doc.instances).toHaveLength(1);

            const inst = doc.instances[0];
            expect(inst.id).toBe('INST:001');
            expect(inst.name).toBe('an example instance');
            expect(inst.instanceOf).toEqual(['TEST:0001']);
            expect(inst.propertyValues).toEqual([
                {property: 'IAO:0000589', value: 'structure', datatype: 'xsd:string'}
            ]);
            expect(inst.relationships).toEqual([
                {predicate: 'part_of', target: 'INST:002', qualifiers: []}
            ]);
        });
    });

    describe('qualifiers.obo', () => {
        it('parses qualifier blocks on is_a and relationship', () => {
            const doc = parseObo(fixture('qualifiers.obo'));
            const term = doc.terms[0];

            expect(term.isA[0].qualifiers).toEqual([
                {key: 'gci_relation', value: 'part_of'},
                {key: 'gci_filler', value: 'CL:0000000'}
            ]);

            expect(term.relationships[0].qualifiers).toEqual([
                {key: 'all_only', value: 'true'}
            ]);
        });
    });

    describe('multiline.obo', () => {
        it('joins continuation lines in definitions', () => {
            const doc = parseObo(fixture('multiline.obo'));
            const term = doc.terms[0];
            expect(term.definition!.text).toBe(
                'A very long definition that spans multiple lines and should be joined into a single string.'
            );
        });
    });

    describe('edge cases', () => {
        it('handles empty string', () => {
            const doc = parseObo('');
            expect(doc.header.formatVersion).toBeNull();
            expect(doc.terms).toHaveLength(0);
            expect(doc.typedefs).toHaveLength(0);
            expect(doc.instances).toHaveLength(0);
        });

        it('handles header-only file', () => {
            const doc = parseObo('format-version: 1.2\nontology: test\n');
            expect(doc.header.formatVersion).toBe('1.2');
            expect(doc.terms).toHaveLength(0);
        });

        it('handles file with only terms (no explicit header)', () => {
            const doc = parseObo('[Term]\nid: TEST:0001\nname: test\n');
            expect(doc.header.formatVersion).toBeNull();
            expect(doc.terms).toHaveLength(1);
        });

        it('skips empty stanzas (no tags)', () => {
            const obo = [
                'format-version: 1.2',
                '',
                '[Term]',
                '',
                '[Term]',
                'id: TEST:0001',
                'name: real term'
            ].join('\n');
            const doc = parseObo(obo);
            expect(doc.terms).toHaveLength(1);
            expect(doc.terms[0].id).toBe('TEST:0001');
        });

        it('does not misparse } in a trailing comment as a qualifier block', () => {
            const obo = [
                'format-version: 1.2',
                '',
                '[Term]',
                'id: TEST:0001',
                'is_a: TEST:0002 ! some comment with }'
            ].join('\n');
            const doc = parseObo(obo);
            expect(doc.terms[0].isA).toEqual([{target: 'TEST:0002', qualifiers: []}]);
        });

        it('strips UTF-8 BOM from input', () => {
            const doc = parseObo('\uFEFFformat-version: 1.2\nontology: test\n');
            expect(doc.header.formatVersion).toBe('1.2');
            expect(doc.header.ontology).toBe('test');
        });

        it('silently skips unknown stanza types', () => {
            const obo = [
                'format-version: 1.2',
                '',
                '[Term]',
                'id: TEST:0001',
                'name: first',
                '',
                '[Annotation]',
                'id: ANN:001',
                '',
                '[Term]',
                'id: TEST:0002',
                'name: second'
            ].join('\n');
            const doc = parseObo(obo);
            expect(doc.terms).toHaveLength(2);
            expect(doc.terms[0].id).toBe('TEST:0001');
            expect(doc.terms[1].id).toBe('TEST:0002');
        });
    });

    describe('error propagation', () => {
        it('throws OboParseError for invalid synonym scope', () => {
            const obo = [
                'format-version: 1.2',
                '',
                '[Term]',
                'id: TEST:0001',
                'synonym: "test" BADSCOPE []'
            ].join('\n');
            expect(() => parseObo(obo)).toThrow(OboParseError);
        });

        it('throws OboParseError for unterminated definition', () => {
            const obo = [
                'format-version: 1.2',
                '',
                '[Term]',
                'id: TEST:0001',
                'def: "unterminated definition []'
            ].join('\n');
            expect(() => parseObo(obo)).toThrow(OboParseError);
        });

        it('throws OboParseError for malformed relationship', () => {
            const obo = [
                'format-version: 1.2',
                '',
                '[Term]',
                'id: TEST:0001',
                'relationship: malformed_no_space'
            ].join('\n');
            expect(() => parseObo(obo)).toThrow(OboParseError);
        });
    });

    describe('header completeness', () => {
        it('parses auto-generated-by', () => {
            const doc = parseObo('format-version: 1.2\nauto-generated-by: OWLTools\n');
            expect(doc.header.autoGeneratedBy).toBe('OWLTools');
        });

        it('parses treat-xrefs-as-has-subclass', () => {
            const doc = parseObo('format-version: 1.2\ntreat-xrefs-as-has-subclass: AAO\n');
            expect(doc.header.treatXrefsAsHasSubclass).toEqual(['AAO']);
        });
    });
});
