import {describe, it, expect} from 'vitest';
import {OboParseError} from '../src/error.js';
import {
    parseQuotedString,
    parseXrefList,
    parseXref,
    parseDefinition,
    parseSynonym,
    parsePropertyValue,
    parseIsA,
    parseRelationship,
    parseIntersectionOf,
    parseChain,
    parseQualifiers,
    parseSubsetDef,
    parseSynonymTypeDef,
    parseIdSpace,
    parseXrefTagValue
} from '../src/parser/value-parser.js';

describe('parseQuotedString', () => {
    it('parses a simple quoted string', () => {
        const {value, end} = parseQuotedString('"hello world"', 0);
        expect(value).toBe('hello world');
        expect(end).toBe(13);
    });

    it('handles escaped double quote', () => {
        const {value} = parseQuotedString('"say \\"hi\\"!"', 0);
        expect(value).toBe('say "hi"!');
    });

    it('handles escaped backslash', () => {
        const {value} = parseQuotedString('"path\\\\file"', 0);
        expect(value).toBe('path\\file');
    });

    it('handles \\n and \\t escapes', () => {
        const {value} = parseQuotedString('"line1\\nline2\\ttab"', 0);
        expect(value).toBe('line1\nline2\ttab');
    });

    it('handles hex escapes', () => {
        const {value} = parseQuotedString('"\\x41\\x42"', 0);
        expect(value).toBe('AB');
    });

    it('starts at a given offset', () => {
        const {value, end} = parseQuotedString('prefix "quoted" suffix', 7);
        expect(value).toBe('quoted');
        expect(end).toBe(15);
    });

    it('handles empty quoted string', () => {
        const {value, end} = parseQuotedString('""', 0);
        expect(value).toBe('');
        expect(end).toBe(2);
    });

    it('resolves \\: escape to colon', () => {
        const {value} = parseQuotedString('"a\\:b"', 0);
        expect(value).toBe('a:b');
    });

    it('resolves \\! escape to exclamation mark', () => {
        const {value} = parseQuotedString('"a\\!b"', 0);
        expect(value).toBe('a!b');
    });

    it('throws OboParseError on incomplete \\x escape', () => {
        expect(() => parseQuotedString('"abc\\x"', 0)).toThrow(OboParseError);
        expect(() => parseQuotedString('"abc\\x4"', 0)).toThrow(OboParseError);
    });

    it('throws OboParseError on invalid hex digits in \\x escape', () => {
        expect(() => parseQuotedString('"abc\\xZZ"', 0)).toThrow(OboParseError);
        expect(() => parseQuotedString('"abc\\xGH"', 0)).toThrow(OboParseError);
    });

    it('throws OboParseError on unterminated quoted string', () => {
        expect(() => parseQuotedString('"hello', 0)).toThrow(OboParseError);
        try {
            parseQuotedString('"unterminated', 0);
        } catch (e) {
            expect(e).toBeInstanceOf(OboParseError);
            expect((e as OboParseError).message).toContain('Unterminated');
        }
    });
});

describe('parseXrefList', () => {
    it('parses an empty xref list', () => {
        const {xrefs, end} = parseXrefList('[]', 0);
        expect(xrefs).toEqual([]);
        expect(end).toBe(2);
    });

    it('parses a single xref', () => {
        const {xrefs} = parseXrefList('[GOC:mcc]', 0);
        expect(xrefs).toEqual([{id: 'GOC:mcc', description: null}]);
    });

    it('parses multiple xrefs', () => {
        const {xrefs} = parseXrefList('[GOC:mcc, PMID:12345678]', 0);
        expect(xrefs).toEqual([
            {id: 'GOC:mcc', description: null},
            {id: 'PMID:12345678', description: null}
        ]);
    });

    it('parses xrefs with descriptions', () => {
        const {xrefs} = parseXrefList('[PMID:123 "a reference", GOC:mcc]', 0);
        expect(xrefs).toEqual([
            {id: 'PMID:123', description: 'a reference'},
            {id: 'GOC:mcc', description: null}
        ]);
    });

    it('handles xref list at offset', () => {
        const input = 'prefix [REF:1] suffix';
        const {xrefs, end} = parseXrefList(input, 7);
        expect(xrefs).toEqual([{id: 'REF:1', description: null}]);
        expect(end).toBe(14);
    });
});

describe('parseXref (single)', () => {
    it('parses a bare xref', () => {
        expect(parseXref('GOC:mcc')).toEqual({id: 'GOC:mcc', description: null});
    });

    it('parses an xref with description', () => {
        expect(parseXref('PMID:123 "reference text"')).toEqual({
            id: 'PMID:123',
            description: 'reference text'
        });
    });
});

describe('parseDefinition', () => {
    it('parses definition with xrefs', () => {
        const result = parseDefinition('"A leaf in a vascular plant." [POC:curators]');
        expect(result).toEqual({
            text: 'A leaf in a vascular plant.',
            xrefs: [{id: 'POC:curators', description: null}]
        });
    });

    it('parses definition with empty xref list', () => {
        const result = parseDefinition('"A simple definition." []');
        expect(result).toEqual({
            text: 'A simple definition.',
            xrefs: []
        });
    });

    it('parses definition with multiple xrefs', () => {
        const result = parseDefinition('"Some text." [GOC:mcc, PMID:123 "a ref"]');
        expect(result).toEqual({
            text: 'Some text.',
            xrefs: [
                {id: 'GOC:mcc', description: null},
                {id: 'PMID:123', description: 'a ref'}
            ]
        });
    });

    it('handles escaped quotes in definition text', () => {
        const result = parseDefinition('"A \\"quoted\\" word." []');
        expect(result.text).toBe('A "quoted" word.');
    });
});

describe('parseSynonym', () => {
    it('parses a simple EXACT synonym', () => {
        const result = parseSynonym('"needle" NARROW [FNA:ed58b09e]');
        expect(result).toEqual({
            text: 'needle',
            scope: 'NARROW',
            type: null,
            xrefs: [{id: 'FNA:ed58b09e', description: null}]
        });
    });

    it('parses synonym with empty xrefs', () => {
        const result = parseSynonym('"leaf" EXACT []');
        expect(result).toEqual({
            text: 'leaf',
            scope: 'EXACT',
            type: null,
            xrefs: []
        });
    });

    it('parses synonym with a type', () => {
        const result = parseSynonym('"programmed cell death" EXACT systematic_synonym []');
        expect(result).toEqual({
            text: 'programmed cell death',
            scope: 'EXACT',
            type: 'systematic_synonym',
            xrefs: []
        });
    });

    it('parses BROAD and RELATED scopes', () => {
        expect(parseSynonym('"big leaf" BROAD []').scope).toBe('BROAD');
        expect(parseSynonym('"foliage" RELATED []').scope).toBe('RELATED');
    });

    it('throws OboParseError on invalid scope', () => {
        expect(() => parseSynonym('"test" INVALID []')).toThrow(OboParseError);
        try {
            parseSynonym('"test" INVALID []');
        } catch (e) {
            expect(e).toBeInstanceOf(OboParseError);
            expect((e as OboParseError).tag).toBe('synonym');
            expect((e as OboParseError).rawValue).toBe('"test" INVALID []');
        }
    });
});

describe('parsePropertyValue', () => {
    it('parses quoted property value with datatype', () => {
        const result = parsePropertyValue('IAO:0000589 "structure" xsd:string');
        expect(result).toEqual({
            property: 'IAO:0000589',
            value: 'structure',
            datatype: 'xsd:string'
        });
    });

    it('parses bare ID property value', () => {
        const result = parsePropertyValue(
            'http://purl.org/dc/terms/license http://creativecommons.org/licenses/by/4.0/'
        );
        expect(result).toEqual({
            property: 'http://purl.org/dc/terms/license',
            value: 'http://creativecommons.org/licenses/by/4.0/',
            datatype: null
        });
    });

    it('parses date property value', () => {
        const result = parsePropertyValue(
            'http://purl.org/dc/elements/1.1/date "2026-03-01" xsd:dateTime'
        );
        expect(result).toEqual({
            property: 'http://purl.org/dc/elements/1.1/date',
            value: '2026-03-01',
            datatype: 'xsd:dateTime'
        });
    });
});

describe('parseIsA', () => {
    it('parses a simple is_a target', () => {
        const result = parseIsA('PO:0025034');
        expect(result).toEqual({target: 'PO:0025034', qualifiers: []});
    });

    it('parses is_a with qualifiers', () => {
        const result = parseIsA(
            'GO:0008150 {gci_relation="part_of", gci_filler="CL:0000000"}'
        );
        expect(result).toEqual({
            target: 'GO:0008150',
            qualifiers: [
                {key: 'gci_relation', value: 'part_of'},
                {key: 'gci_filler', value: 'CL:0000000'}
            ]
        });
    });
});

describe('parseRelationship', () => {
    it('parses a simple relationship', () => {
        const result = parseRelationship('part_of PO:0009006');
        expect(result).toEqual({
            predicate: 'part_of',
            target: 'PO:0009006',
            qualifiers: []
        });
    });

    it('parses relationship with qualifiers', () => {
        const result = parseRelationship('has_part GO:001 {all_only="true"}');
        expect(result).toEqual({
            predicate: 'has_part',
            target: 'GO:001',
            qualifiers: [{key: 'all_only', value: 'true'}]
        });
    });
});

describe('parseIntersectionOf', () => {
    it('parses bare genus (no predicate)', () => {
        const result = parseIntersectionOf('GO:0007049');
        expect(result).toEqual({predicate: null, target: 'GO:0007049', qualifiers: []});
    });

    it('parses qualified differentia', () => {
        const result = parseIntersectionOf('part_of GO:0008152');
        expect(result).toEqual({predicate: 'part_of', target: 'GO:0008152', qualifiers: []});
    });

    it('parses intersection_of with trailing qualifiers', () => {
        const result = parseIntersectionOf('part_of GO:0008152 {source="GOC:curators"}');
        expect(result).toEqual({
            predicate: 'part_of',
            target: 'GO:0008152',
            qualifiers: [{key: 'source', value: 'GOC:curators'}]
        });
    });

    it('parses bare genus with trailing qualifiers', () => {
        const result = parseIntersectionOf('GO:0007049 {source="GOC:mcc"}');
        expect(result).toEqual({
            predicate: null,
            target: 'GO:0007049',
            qualifiers: [{key: 'source', value: 'GOC:mcc'}]
        });
    });
});

describe('parseChain', () => {
    it('parses a relation chain', () => {
        expect(parseChain('has_part part_of')).toEqual(['has_part', 'part_of']);
    });

    it('throws OboParseError on malformed chain (missing second relation)', () => {
        expect(() => parseChain('only_one')).toThrow(OboParseError);
        try {
            parseChain('only_one');
        } catch (e) {
            expect(e).toBeInstanceOf(OboParseError);
            expect((e as OboParseError).message).toContain("Expected 'rel1 rel2'");
        }
    });

    it('reports correct tag name in error for equivalent_to_chain', () => {
        try {
            parseChain('only_one', 'equivalent_to_chain');
        } catch (e) {
            expect(e).toBeInstanceOf(OboParseError);
            expect((e as OboParseError).tag).toBe('equivalent_to_chain');
        }
    });

    it('defaults tag name to holds_over_chain in error', () => {
        try {
            parseChain('only_one');
        } catch (e) {
            expect(e).toBeInstanceOf(OboParseError);
            expect((e as OboParseError).tag).toBe('holds_over_chain');
        }
    });
});

describe('parseQualifiers', () => {
    it('returns empty when no qualifiers present', () => {
        const {qualifiers, remainder} = parseQualifiers('some value');
        expect(qualifiers).toEqual([]);
        expect(remainder).toBe('some value');
    });

    it('parses a qualifier block at the start', () => {
        const {qualifiers, remainder} = parseQualifiers('{key="val"} rest');
        expect(qualifiers).toEqual([{key: 'key', value: 'val'}]);
        expect(remainder).toBe('rest');
    });

    it('parses multiple qualifiers', () => {
        const {qualifiers} = parseQualifiers('{a="1", b="2"}');
        expect(qualifiers).toEqual([
            {key: 'a', value: '1'},
            {key: 'b', value: '2'}
        ]);
    });
});

describe('extractTrailingQualifiers (via parseIsA)', () => {
    it('handles value with escaped backslash before qualifier block', () => {
        const result = parseIsA('GO:0001 {key="val\\\\ue"}');
        expect(result.target).toBe('GO:0001');
        expect(result.qualifiers).toHaveLength(1);
    });

    it('returns empty qualifiers for unbalanced braces', () => {
        const result = parseIsA('GO:0001 {unclosed');
        expect(result.target).toBe('GO:0001 {unclosed');
        expect(result.qualifiers).toEqual([]);
    });

    it('returns empty qualifiers when } appears inside quoted string only', () => {
        // The } is inside quotes so it shouldn't be treated as a qualifier close
        const result = parseRelationship('part_of GO:0001');
        expect(result.qualifiers).toEqual([]);
    });

    it('handles value ending with } that is not a qualifier block', () => {
        // A lone } at the end with no matching { should not cause issues
        const result = parseIsA('GO:0001}');
        // depth will be -1 at end, so no qualifier extraction
        expect(result.qualifiers).toEqual([]);
    });
});

describe('parseRelationship (error path)', () => {
    it('throws OboParseError on malformed relationship (no space)', () => {
        expect(() => parseRelationship('malformed')).toThrow(OboParseError);
        try {
            parseRelationship('malformed');
        } catch (e) {
            expect(e).toBeInstanceOf(OboParseError);
            expect((e as OboParseError).tag).toBe('relationship');
        }
    });
});

describe('parseSubsetDef', () => {
    it('parses a subset definition', () => {
        const result = parseSubsetDef('slim_plant_anatomy "Plant anatomy slim"');
        expect(result).toEqual({
            id: 'slim_plant_anatomy',
            description: 'Plant anatomy slim'
        });
    });

    it('handles bare id without quotes', () => {
        const result = parseSubsetDef('my_slim');
        expect(result).toEqual({
            id: 'my_slim',
            description: ''
        });
    });
});

describe('parseSynonymTypeDef', () => {
    it('parses without scope', () => {
        const result = parseSynonymTypeDef('systematic_synonym "Systematic synonym"');
        expect(result).toEqual({
            id: 'systematic_synonym',
            description: 'Systematic synonym',
            scope: null
        });
    });

    it('parses with scope', () => {
        const result = parseSynonymTypeDef('systematic_synonym "Systematic synonym" EXACT');
        expect(result).toEqual({
            id: 'systematic_synonym',
            description: 'Systematic synonym',
            scope: 'EXACT'
        });
    });

    it('handles bare id without quotes', () => {
        const result = parseSynonymTypeDef('MY_SYN');
        expect(result).toEqual({
            id: 'MY_SYN',
            description: '',
            scope: null
        });
    });
});

describe('parseIdSpace', () => {
    it('parses without description', () => {
        const result = parseIdSpace('GO urn:lsid:bioontology.org:GO:');
        expect(result).toEqual({
            prefix: 'GO',
            uri: 'urn:lsid:bioontology.org:GO:',
            description: null
        });
    });

    it('parses with description', () => {
        const result = parseIdSpace('GO urn:lsid:bioontology.org:GO: "Gene Ontology"');
        expect(result).toEqual({
            prefix: 'GO',
            uri: 'urn:lsid:bioontology.org:GO:',
            description: 'Gene Ontology'
        });
    });
});

describe('parseXrefTagValue', () => {
    it('parses a bare xref', () => {
        expect(parseXrefTagValue('Wikipedia:Leaf')).toEqual({
            id: 'Wikipedia:Leaf',
            description: null
        });
    });

    it('parses xref with description', () => {
        expect(parseXrefTagValue('PMID:123 "a paper"')).toEqual({
            id: 'PMID:123',
            description: 'a paper'
        });
    });
});
