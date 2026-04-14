import {describe, it, expect} from 'vitest';
import {buildHeader} from '../src/parser/header-builder.js';
import {buildTerm, buildTypedef, buildInstance} from '../src/parser/stanza-builder.js';

describe('buildHeader', () => {
    it('builds header from tag-value pairs', () => {
        const header = buildHeader([
            {tag: 'format-version', value: '1.2'},
            {tag: 'data-version', value: 'releases/2026-03-01'},
            {tag: 'ontology', value: 'po'},
            {tag: 'default-namespace', value: 'plant_ontology'},
            {tag: 'saved-by', value: 'curator'},
            {tag: 'date', value: '01:03:2026 12:00'}
        ]);
        expect(header.formatVersion).toBe('1.2');
        expect(header.dataVersion).toBe('releases/2026-03-01');
        expect(header.ontology).toBe('po');
        expect(header.defaultNamespace).toBe('plant_ontology');
        expect(header.savedBy).toBe('curator');
        expect(header.date).toBe('01:03:2026 12:00');
    });

    it('collects multiple remarks', () => {
        const header = buildHeader([
            {tag: 'remark', value: 'First remark'},
            {tag: 'remark', value: 'Second remark'}
        ]);
        expect(header.remarks).toEqual(['First remark', 'Second remark']);
    });

    it('parses subsetdefs', () => {
        const header = buildHeader([
            {tag: 'subsetdef', value: 'slim_plant "Plant anatomy slim"'}
        ]);
        expect(header.subsetDefs).toEqual([
            {id: 'slim_plant', description: 'Plant anatomy slim'}
        ]);
    });

    it('parses synonymtypedefs', () => {
        const header = buildHeader([
            {tag: 'synonymtypedef', value: 'systematic "Systematic synonym" EXACT'}
        ]);
        expect(header.synonymTypeDefs).toEqual([
            {id: 'systematic', description: 'Systematic synonym', scope: 'EXACT'}
        ]);
    });

    it('collects imports', () => {
        const header = buildHeader([
            {tag: 'import', value: 'http://purl.obolibrary.org/obo/ro.obo'}
        ]);
        expect(header.imports).toEqual(['http://purl.obolibrary.org/obo/ro.obo']);
    });

    it('puts unrecognized tags in unparsedTags', () => {
        const header = buildHeader([{tag: 'custom-tag', value: 'some value'}]);
        expect(header.unparsedTags).toEqual([{tag: 'custom-tag', value: 'some value'}]);
    });

    it('parses treat-xrefs-as macros', () => {
        const header = buildHeader([
            {tag: 'treat-xrefs-as-equivalent', value: 'CL'},
            {tag: 'treat-xrefs-as-is_a', value: 'GO'},
            {tag: 'treat-xrefs-as-genus-differentia', value: 'CL part_of GO:0005623'}
        ]);
        expect(header.treatXrefsAsEquivalent).toEqual(['CL']);
        expect(header.treatXrefsAsIsA).toEqual(['GO']);
        expect(header.treatXrefsAsGenusDifferentia).toEqual([
            {idPrefix: 'CL', relation: 'part_of', target: 'GO:0005623'}
        ]);
    });

    it('parses treat-xrefs-as-reverse-genus-differentia', () => {
        const header = buildHeader([
            {tag: 'treat-xrefs-as-reverse-genus-differentia', value: 'AAO part_of UBERON:0001062'}
        ]);
        expect(header.treatXrefsAsReverseGenusDifferentia).toEqual([
            {idPrefix: 'AAO', relation: 'part_of', target: 'UBERON:0001062'}
        ]);
    });

    it('parses treat-xrefs-as-relationship with 2 tokens (per OBO spec)', () => {
        const header = buildHeader([
            {tag: 'treat-xrefs-as-relationship', value: 'MA homologous_to'}
        ]);
        expect(header.treatXrefsAsRelationship).toEqual([
            {idPrefix: 'MA', relation: 'homologous_to'}
        ]);
    });

    it('preserves malformed treat-xrefs-as macros in unparsedTags', () => {
        const header = buildHeader([
            {tag: 'treat-xrefs-as-genus-differentia', value: 'INCOMPLETE'},
            {tag: 'treat-xrefs-as-reverse-genus-differentia', value: 'ALSO_INCOMPLETE'},
            {tag: 'treat-xrefs-as-relationship', value: 'ONLY_ONE_TOKEN'}
        ]);
        expect(header.treatXrefsAsGenusDifferentia).toEqual([]);
        expect(header.treatXrefsAsReverseGenusDifferentia).toEqual([]);
        expect(header.treatXrefsAsRelationship).toEqual([]);
        expect(header.unparsedTags).toEqual([
            {tag: 'treat-xrefs-as-genus-differentia', value: 'INCOMPLETE'},
            {tag: 'treat-xrefs-as-reverse-genus-differentia', value: 'ALSO_INCOMPLETE'},
            {tag: 'treat-xrefs-as-relationship', value: 'ONLY_ONE_TOKEN'}
        ]);
    });

    it('handles owl-axioms and property_value in header', () => {
        const header = buildHeader([
            {tag: 'owl-axioms', value: 'Prefix(owl:=<http://www.w3.org/2002/07/owl#>)'},
            {tag: 'property_value', value: 'http://purl.org/dc/terms/license http://creativecommons.org/licenses/by/4.0/'}
        ]);
        expect(header.owlAxioms).toEqual(['Prefix(owl:=<http://www.w3.org/2002/07/owl#>)']);
        expect(header.propertyValues).toEqual([{
            property: 'http://purl.org/dc/terms/license',
            value: 'http://creativecommons.org/licenses/by/4.0/',
            datatype: null
        }]);
    });
});

describe('buildTerm', () => {
    it('builds a minimal term', () => {
        const term = buildTerm([
            {tag: 'id', value: 'PO:0009025'},
            {tag: 'name', value: 'vascular leaf'}
        ]);
        expect(term.id).toBe('PO:0009025');
        expect(term.name).toBe('vascular leaf');
        expect(term.isObsolete).toBe(false);
        expect(term.isA).toEqual([]);
    });

    it('builds a full term with all fields', () => {
        const term = buildTerm([
            {tag: 'id', value: 'PO:0009025'},
            {tag: 'name', value: 'vascular leaf'},
            {tag: 'namespace', value: 'plant_anatomy'},
            {tag: 'def', value: '"A leaf in a vascular plant." [POC:curators]'},
            {tag: 'comment', value: 'This is a comment'},
            {tag: 'alt_id', value: 'PO:0000001'},
            {tag: 'alt_id', value: 'PO:0000002'},
            {tag: 'synonym', value: '"needle" NARROW [FNA:1]'},
            {tag: 'synonym', value: '"leaf" EXACT []'},
            {tag: 'xref', value: 'Wikipedia:Leaf'},
            {tag: 'subset', value: 'slim_plant_anatomy'},
            {tag: 'is_a', value: 'PO:0025034'},
            {tag: 'relationship', value: 'part_of PO:0009006'},
            {tag: 'created_by', value: 'curator'},
            {tag: 'creation_date', value: '2009-06-01T00:00:00Z'}
        ]);

        expect(term.id).toBe('PO:0009025');
        expect(term.namespace).toBe('plant_anatomy');
        expect(term.definition).toEqual({
            text: 'A leaf in a vascular plant.',
            xrefs: [{id: 'POC:curators', description: null}]
        });
        expect(term.comment).toBe('This is a comment');
        expect(term.altIds).toEqual(['PO:0000001', 'PO:0000002']);
        expect(term.synonyms).toHaveLength(2);
        expect(term.synonyms[0].text).toBe('needle');
        expect(term.synonyms[0].scope).toBe('NARROW');
        expect(term.xrefs).toEqual([{id: 'Wikipedia:Leaf', description: null}]);
        expect(term.subsets).toEqual(['slim_plant_anatomy']);
        expect(term.isA).toEqual([{target: 'PO:0025034', qualifiers: []}]);
        expect(term.relationships).toEqual([
            {predicate: 'part_of', target: 'PO:0009006', qualifiers: []}
        ]);
        expect(term.createdBy).toBe('curator');
        expect(term.creationDate).toBe('2009-06-01T00:00:00Z');
    });

    it('handles obsolete terms', () => {
        const term = buildTerm([
            {tag: 'id', value: 'PO:OLD001'},
            {tag: 'is_obsolete', value: 'true'},
            {tag: 'replaced_by', value: 'PO:NEW001'},
            {tag: 'consider', value: 'PO:ALT001'},
            {tag: 'consider', value: 'PO:ALT002'}
        ]);
        expect(term.isObsolete).toBe(true);
        expect(term.replacedBy).toEqual(['PO:NEW001']);
        expect(term.consider).toEqual(['PO:ALT001', 'PO:ALT002']);
    });

    it('handles intersection_of and union_of', () => {
        const term = buildTerm([
            {tag: 'id', value: 'GO:0006915'},
            {tag: 'intersection_of', value: 'GO:0007049'},
            {tag: 'intersection_of', value: 'part_of GO:0008152'},
            {tag: 'union_of', value: 'GO:0001'},
            {tag: 'union_of', value: 'GO:0002'}
        ]);
        expect(term.intersectionOf).toEqual([
            {predicate: null, target: 'GO:0007049', qualifiers: []},
            {predicate: 'part_of', target: 'GO:0008152', qualifiers: []}
        ]);
        expect(term.unionOf).toEqual([
            {target: 'GO:0001', qualifiers: []},
            {target: 'GO:0002', qualifiers: []}
        ]);
    });

    it('handles builtin flag', () => {
        const term = buildTerm([
            {tag: 'id', value: 'OBO:0001'},
            {tag: 'builtin', value: 'true'}
        ]);
        expect(term.builtin).toBe(true);

        const term2 = buildTerm([{tag: 'id', value: 'TEST:0001'}]);
        expect(term2.builtin).toBe(false);
    });

    it('handles union_of, equivalent_to, and disjoint_from with qualifiers', () => {
        const term = buildTerm([
            {tag: 'id', value: 'GO:0006915'},
            {tag: 'union_of', value: 'GO:0001 {source="GOC:mcc"}'},
            {tag: 'equivalent_to', value: 'GO:0003 {is_inferred="true"}'},
            {tag: 'disjoint_from', value: 'GO:0004 {source="GOC:curators"}'}
        ]);
        expect(term.unionOf).toEqual([
            {target: 'GO:0001', qualifiers: [{key: 'source', value: 'GOC:mcc'}]}
        ]);
        expect(term.equivalentTo).toEqual([
            {target: 'GO:0003', qualifiers: [{key: 'is_inferred', value: 'true'}]}
        ]);
        expect(term.disjointFrom).toEqual([
            {target: 'GO:0004', qualifiers: [{key: 'source', value: 'GOC:curators'}]}
        ]);
    });

    it('puts unrecognized tags in unparsedTags', () => {
        const term = buildTerm([
            {tag: 'id', value: 'PO:001'},
            {tag: 'custom_tag', value: 'custom value'}
        ]);
        expect(term.unparsedTags).toEqual([{tag: 'custom_tag', value: 'custom value'}]);
    });
});

describe('buildTypedef', () => {
    it('builds a typedef with relationship properties', () => {
        const typedef = buildTypedef([
            {tag: 'id', value: 'part_of'},
            {tag: 'name', value: 'part of'},
            {tag: 'is_transitive', value: 'true'},
            {tag: 'is_reflexive', value: 'true'},
            {tag: 'inverse_of', value: 'has_part'},
            {tag: 'domain', value: 'BFO:0000001'},
            {tag: 'range', value: 'BFO:0000001'}
        ]);
        expect(typedef.id).toBe('part_of');
        expect(typedef.name).toBe('part of');
        expect(typedef.isTransitive).toBe(true);
        expect(typedef.isReflexive).toBe(true);
        expect(typedef.isSymmetric).toBe(false);
        expect(typedef.inverseOf).toBe('has_part');
        expect(typedef.domain).toBe('BFO:0000001');
        expect(typedef.range).toBe('BFO:0000001');
    });

    it('builds a typedef with all boolean flags', () => {
        const typedef = buildTypedef([
            {tag: 'id', value: 'test_rel'},
            {tag: 'is_symmetric', value: 'true'},
            {tag: 'is_anti_symmetric', value: 'true'},
            {tag: 'is_functional', value: 'true'},
            {tag: 'is_inverse_functional', value: 'true'},
            {tag: 'is_cyclic', value: 'true'},
            {tag: 'is_metadata_tag', value: 'true'},
            {tag: 'is_class_level', value: 'true'}
        ]);
        expect(typedef.isSymmetric).toBe(true);
        expect(typedef.isAntiSymmetric).toBe(true);
        expect(typedef.isFunctional).toBe(true);
        expect(typedef.isInverseFunctional).toBe(true);
        expect(typedef.isCyclic).toBe(true);
        expect(typedef.isMetadataTag).toBe(true);
        expect(typedef.isClassLevel).toBe(true);
    });

    it('handles holds_over_chain', () => {
        const typedef = buildTypedef([
            {tag: 'id', value: 'regulates'},
            {tag: 'holds_over_chain', value: 'has_part part_of'}
        ]);
        expect(typedef.holdsOverChain).toEqual([['has_part', 'part_of']]);
    });

    it('handles common fields (synonyms, xrefs)', () => {
        const typedef = buildTypedef([
            {tag: 'id', value: 'part_of'},
            {tag: 'synonym', value: '"part of" EXACT []'},
            {tag: 'xref', value: 'RO:0000050'}
        ]);
        expect(typedef.synonyms).toHaveLength(1);
        expect(typedef.xrefs).toEqual([{id: 'RO:0000050', description: null}]);
    });

    it('handles transitive_over, disjoint_over, expand templates', () => {
        const typedef = buildTypedef([
            {tag: 'id', value: 'regulates'},
            {tag: 'transitive_over', value: 'part_of'},
            {tag: 'disjoint_over', value: 'has_part'},
            {tag: 'expand_expression_to', value: '"BFO_0000051 some ?Y"'},
            {tag: 'expand_assertion_to', value: '"Class: ?X SubClassOf: BFO_0000051 some ?Y"'},
            {tag: 'equivalent_to_chain', value: 'has_part part_of'}
        ]);
        expect(typedef.transitiveOver).toEqual(['part_of']);
        expect(typedef.disjointOver).toEqual(['has_part']);
        expect(typedef.expandExpressionTo).toBe('"BFO_0000051 some ?Y"');
        expect(typedef.expandAssertionTo).toBe('"Class: ?X SubClassOf: BFO_0000051 some ?Y"');
        expect(typedef.equivalentToChain).toEqual([['has_part', 'part_of']]);
    });

    it('handles union_of, equivalent_to, disjoint_from on typedef', () => {
        const typedef = buildTypedef([
            {tag: 'id', value: 'test_rel'},
            {tag: 'union_of', value: 'rel1'},
            {tag: 'equivalent_to', value: 'rel2'},
            {tag: 'disjoint_from', value: 'rel3'}
        ]);
        expect(typedef.unionOf).toEqual([{target: 'rel1', qualifiers: []}]);
        expect(typedef.equivalentTo).toEqual([{target: 'rel2', qualifiers: []}]);
        expect(typedef.disjointFrom).toEqual([{target: 'rel3', qualifiers: []}]);
    });

    it('puts unrecognized typedef tags in unparsedTags', () => {
        const typedef = buildTypedef([
            {tag: 'id', value: 'part_of'},
            {tag: 'custom_property', value: 'some value'}
        ]);
        expect(typedef.unparsedTags).toEqual([{tag: 'custom_property', value: 'some value'}]);
    });
});

describe('buildInstance', () => {
    it('builds an instance', () => {
        const instance = buildInstance([
            {tag: 'id', value: 'INST:001'},
            {tag: 'name', value: 'Example instance'},
            {tag: 'instance_of', value: 'CL:0000001'},
            {tag: 'relationship', value: 'part_of INST:002'}
        ]);
        expect(instance.id).toBe('INST:001');
        expect(instance.name).toBe('Example instance');
        expect(instance.instanceOf).toEqual(['CL:0000001']);
        expect(instance.relationships).toEqual([
            {predicate: 'part_of', target: 'INST:002', qualifiers: []}
        ]);
    });

    it('puts unrecognized instance tags in unparsedTags', () => {
        const instance = buildInstance([
            {tag: 'id', value: 'INST:001'},
            {tag: 'custom_tag', value: 'custom value'}
        ]);
        expect(instance.unparsedTags).toEqual([{tag: 'custom_tag', value: 'custom value'}]);
    });
});
