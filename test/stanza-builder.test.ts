import { describe, it, expect } from 'vitest';
import { buildHeader } from '../src/parser/header-builder.js';
import { buildTerm, buildTypedef, buildInstance } from '../src/parser/stanza-builder.js';

describe('buildHeader', () => {
  it('builds header from tag-value pairs', () => {
    const header = buildHeader([
      { tag: 'format-version', value: '1.2' },
      { tag: 'data-version', value: 'releases/2026-03-01' },
      { tag: 'ontology', value: 'po' },
      { tag: 'default-namespace', value: 'plant_ontology' },
      { tag: 'saved-by', value: 'curator' },
      { tag: 'date', value: '01:03:2026 12:00' },
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
      { tag: 'remark', value: 'First remark' },
      { tag: 'remark', value: 'Second remark' },
    ]);
    expect(header.remarks).toEqual(['First remark', 'Second remark']);
  });

  it('parses subsetdefs', () => {
    const header = buildHeader([
      { tag: 'subsetdef', value: 'slim_plant "Plant anatomy slim"' },
    ]);
    expect(header.subsetDefs).toEqual([
      { id: 'slim_plant', description: 'Plant anatomy slim' },
    ]);
  });

  it('parses synonymtypedefs', () => {
    const header = buildHeader([
      { tag: 'synonymtypedef', value: 'systematic "Systematic synonym" EXACT' },
    ]);
    expect(header.synonymTypeDefs).toEqual([
      { id: 'systematic', description: 'Systematic synonym', scope: 'EXACT' },
    ]);
  });

  it('collects imports', () => {
    const header = buildHeader([
      { tag: 'import', value: 'http://purl.obolibrary.org/obo/ro.obo' },
    ]);
    expect(header.imports).toEqual(['http://purl.obolibrary.org/obo/ro.obo']);
  });

  it('puts unrecognized tags in unparsedTags', () => {
    const header = buildHeader([
      { tag: 'custom-tag', value: 'some value' },
    ]);
    expect(header.unparsedTags).toEqual([{ tag: 'custom-tag', value: 'some value' }]);
  });

  it('parses treat-xrefs-as macros', () => {
    const header = buildHeader([
      { tag: 'treat-xrefs-as-equivalent', value: 'CL' },
      { tag: 'treat-xrefs-as-is_a', value: 'GO' },
      { tag: 'treat-xrefs-as-genus-differentia', value: 'CL part_of GO:0005623' },
    ]);
    expect(header.treatXrefsAsEquivalent).toEqual(['CL']);
    expect(header.treatXrefsAsIsA).toEqual(['GO']);
    expect(header.treatXrefsAsGenusDifferentia).toEqual([
      { idPrefix: 'CL', relation: 'part_of', target: 'GO:0005623' },
    ]);
  });
});

describe('buildTerm', () => {
  it('builds a minimal term', () => {
    const term = buildTerm([
      { tag: 'id', value: 'PO:0009025' },
      { tag: 'name', value: 'vascular leaf' },
    ]);
    expect(term.id).toBe('PO:0009025');
    expect(term.name).toBe('vascular leaf');
    expect(term.isObsolete).toBe(false);
    expect(term.isA).toEqual([]);
  });

  it('builds a full term with all fields', () => {
    const term = buildTerm([
      { tag: 'id', value: 'PO:0009025' },
      { tag: 'name', value: 'vascular leaf' },
      { tag: 'namespace', value: 'plant_anatomy' },
      { tag: 'def', value: '"A leaf in a vascular plant." [POC:curators]' },
      { tag: 'comment', value: 'This is a comment' },
      { tag: 'alt_id', value: 'PO:0000001' },
      { tag: 'alt_id', value: 'PO:0000002' },
      { tag: 'synonym', value: '"needle" NARROW [FNA:1]' },
      { tag: 'synonym', value: '"leaf" EXACT []' },
      { tag: 'xref', value: 'Wikipedia:Leaf' },
      { tag: 'subset', value: 'slim_plant_anatomy' },
      { tag: 'is_a', value: 'PO:0025034' },
      { tag: 'relationship', value: 'part_of PO:0009006' },
      { tag: 'created_by', value: 'curator' },
      { tag: 'creation_date', value: '2009-06-01T00:00:00Z' },
    ]);

    expect(term.id).toBe('PO:0009025');
    expect(term.namespace).toBe('plant_anatomy');
    expect(term.definition).toEqual({
      text: 'A leaf in a vascular plant.',
      xrefs: [{ id: 'POC:curators', description: null }],
    });
    expect(term.comment).toBe('This is a comment');
    expect(term.altIds).toEqual(['PO:0000001', 'PO:0000002']);
    expect(term.synonyms).toHaveLength(2);
    expect(term.synonyms[0].text).toBe('needle');
    expect(term.synonyms[0].scope).toBe('NARROW');
    expect(term.xrefs).toEqual([{ id: 'Wikipedia:Leaf', description: null }]);
    expect(term.subsets).toEqual(['slim_plant_anatomy']);
    expect(term.isA).toEqual([{ target: 'PO:0025034', qualifiers: [] }]);
    expect(term.relationships).toEqual([
      { predicate: 'part_of', target: 'PO:0009006', qualifiers: [] },
    ]);
    expect(term.createdBy).toBe('curator');
    expect(term.creationDate).toBe('2009-06-01T00:00:00Z');
  });

  it('handles obsolete terms', () => {
    const term = buildTerm([
      { tag: 'id', value: 'PO:OLD001' },
      { tag: 'is_obsolete', value: 'true' },
      { tag: 'replaced_by', value: 'PO:NEW001' },
      { tag: 'consider', value: 'PO:ALT001' },
      { tag: 'consider', value: 'PO:ALT002' },
    ]);
    expect(term.isObsolete).toBe(true);
    expect(term.replacedBy).toEqual(['PO:NEW001']);
    expect(term.consider).toEqual(['PO:ALT001', 'PO:ALT002']);
  });

  it('handles intersection_of and union_of', () => {
    const term = buildTerm([
      { tag: 'id', value: 'GO:0006915' },
      { tag: 'intersection_of', value: 'GO:0007049' },
      { tag: 'intersection_of', value: 'part_of GO:0008152' },
      { tag: 'union_of', value: 'GO:0001' },
      { tag: 'union_of', value: 'GO:0002' },
    ]);
    expect(term.intersectionOf).toEqual([
      { predicate: null, target: 'GO:0007049' },
      { predicate: 'part_of', target: 'GO:0008152' },
    ]);
    expect(term.unionOf).toEqual(['GO:0001', 'GO:0002']);
  });

  it('puts unrecognized tags in unparsedTags', () => {
    const term = buildTerm([
      { tag: 'id', value: 'PO:001' },
      { tag: 'custom_tag', value: 'custom value' },
    ]);
    expect(term.unparsedTags).toEqual([{ tag: 'custom_tag', value: 'custom value' }]);
  });
});

describe('buildTypedef', () => {
  it('builds a typedef with relationship properties', () => {
    const typedef = buildTypedef([
      { tag: 'id', value: 'part_of' },
      { tag: 'name', value: 'part of' },
      { tag: 'is_transitive', value: 'true' },
      { tag: 'is_reflexive', value: 'true' },
      { tag: 'inverse_of', value: 'has_part' },
      { tag: 'domain', value: 'BFO:0000001' },
      { tag: 'range', value: 'BFO:0000001' },
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
      { tag: 'id', value: 'test_rel' },
      { tag: 'is_symmetric', value: 'true' },
      { tag: 'is_anti_symmetric', value: 'true' },
      { tag: 'is_functional', value: 'true' },
      { tag: 'is_inverse_functional', value: 'true' },
      { tag: 'is_cyclic', value: 'true' },
      { tag: 'is_metadata_tag', value: 'true' },
      { tag: 'is_class_level', value: 'true' },
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
      { tag: 'id', value: 'regulates' },
      { tag: 'holds_over_chain', value: 'has_part part_of' },
    ]);
    expect(typedef.holdsOverChain).toEqual([['has_part', 'part_of']]);
  });

  it('handles common fields (synonyms, xrefs)', () => {
    const typedef = buildTypedef([
      { tag: 'id', value: 'part_of' },
      { tag: 'synonym', value: '"part of" EXACT []' },
      { tag: 'xref', value: 'RO:0000050' },
    ]);
    expect(typedef.synonyms).toHaveLength(1);
    expect(typedef.xrefs).toEqual([{ id: 'RO:0000050', description: null }]);
  });
});

describe('buildInstance', () => {
  it('builds an instance', () => {
    const instance = buildInstance([
      { tag: 'id', value: 'INST:001' },
      { tag: 'name', value: 'Example instance' },
      { tag: 'instance_of', value: 'CL:0000001' },
      { tag: 'relationship', value: 'part_of INST:002' },
    ]);
    expect(instance.id).toBe('INST:001');
    expect(instance.name).toBe('Example instance');
    expect(instance.instanceOf).toEqual(['CL:0000001']);
    expect(instance.relationships).toEqual([
      { predicate: 'part_of', target: 'INST:002', qualifiers: [] },
    ]);
  });
});
