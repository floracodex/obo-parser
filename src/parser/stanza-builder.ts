import type {OboTerm, OboTypedef, OboInstance, OboIsA, OboTagValue} from '../types.js';
import {
    parseDefinition,
    parseSynonym,
    parseXrefTagValue,
    parsePropertyValue,
    parseIsA,
    parseRelationship,
    parseIntersectionOf,
    parseChain
} from './value-parser.js';

// ---------------------------------------------------------------------------
// Shared tag handling
// ---------------------------------------------------------------------------

interface CommonFields {
    id: string;
    name: string | null;
    namespace: string | null;
    definition: OboTerm['definition'];
    comment: string | null;
    altIds: string[];
    isAnonymous: boolean;
    synonyms: OboTerm['synonyms'];
    xrefs: OboTerm['xrefs'];
    subsets: string[];
    propertyValues: OboTerm['propertyValues'];
    isObsolete: boolean;
    replacedBy: string[];
    consider: string[];
    createdBy: string | null;
    creationDate: string | null;
    unparsedTags: OboTagValue[];
}

function createCommonFields(): CommonFields {
    return {
        id: '',
        name: null,
        namespace: null,
        definition: null,
        comment: null,
        altIds: [],
        isAnonymous: false,
        synonyms: [],
        xrefs: [],
        subsets: [],
        propertyValues: [],
        isObsolete: false,
        replacedBy: [],
        consider: [],
        createdBy: null,
        creationDate: null,
        unparsedTags: []
    };
}

/**
 * Apply a common tag to the fields object. Returns true if handled.
 */
function applyCommonTag(fields: CommonFields, tag: string, value: string): boolean {
    switch (tag) {
        case 'id':
            fields.id = value;
            return true;
        case 'name':
            fields.name = value;
            return true;
        case 'namespace':
            fields.namespace = value;
            return true;
        case 'def':
            fields.definition = parseDefinition(value);
            return true;
        case 'comment':
            fields.comment = value;
            return true;
        case 'alt_id':
            fields.altIds.push(value);
            return true;
        case 'is_anonymous':
            fields.isAnonymous = value === 'true';
            return true;
        case 'synonym':
            fields.synonyms.push(parseSynonym(value));
            return true;
        case 'xref':
            fields.xrefs.push(parseXrefTagValue(value));
            return true;
        case 'subset':
            fields.subsets.push(value);
            return true;
        case 'property_value':
            fields.propertyValues.push(parsePropertyValue(value));
            return true;
        case 'is_obsolete':
            fields.isObsolete = value === 'true';
            return true;
        case 'replaced_by':
            fields.replacedBy.push(value);
            return true;
        case 'consider':
            fields.consider.push(value);
            return true;
        case 'created_by':
            fields.createdBy = value;
            return true;
        case 'creation_date':
            fields.creationDate = value;
            return true;
        default:
            return false;
    }
}

// ---------------------------------------------------------------------------
// Term builder
// ---------------------------------------------------------------------------

export function buildTerm(tags: OboTagValue[]): OboTerm {
    const common = createCommonFields();
    const term: Omit<OboTerm, keyof CommonFields> = {
        isA: [],
        relationships: [],
        intersectionOf: [],
        unionOf: [],
        equivalentTo: [],
        disjointFrom: []
    };

    for (const {tag, value} of tags) {
        if (applyCommonTag(common, tag, value)) { continue; }

        switch (tag) {
            case 'is_a':
                term.isA.push(parseIsA(value));
                break;
            case 'relationship':
                term.relationships.push(parseRelationship(value));
                break;
            case 'intersection_of':
                term.intersectionOf.push(parseIntersectionOf(value));
                break;
            case 'union_of':
                term.unionOf.push(parseIsA(value));
                break;
            case 'equivalent_to':
                term.equivalentTo.push(parseIsA(value));
                break;
            case 'disjoint_from':
                term.disjointFrom.push(parseIsA(value));
                break;
            default:
                common.unparsedTags.push({tag, value});
        }
    }

    return {...common, ...term};
}

// ---------------------------------------------------------------------------
// Typedef builder
// ---------------------------------------------------------------------------

export function buildTypedef(tags: OboTagValue[]): OboTypedef {
    const common = createCommonFields();
    const extra = {
        isA: [] as OboTypedef['isA'],
        relationships: [] as OboTypedef['relationships'],
        intersectionOf: [] as OboTypedef['intersectionOf'],
        unionOf: [] as OboIsA[],
        equivalentTo: [] as OboIsA[],
        disjointFrom: [] as OboIsA[],
        domain: null as string | null,
        range: null as string | null,
        isTransitive: false,
        isSymmetric: false,
        isReflexive: false,
        isAntiSymmetric: false,
        isFunctional: false,
        isInverseFunctional: false,
        isCyclic: false,
        inverseOf: null as string | null,
        holdsOverChain: [] as [string, string][],
        equivalentToChain: [] as [string, string][],
        transitiveOver: [] as string[],
        disjointOver: [] as string[],
        expandExpressionTo: null as string | null,
        expandAssertionTo: null as string | null,
        isMetadataTag: false,
        isClassLevel: false
    };

    for (const {tag, value} of tags) {
        if (applyCommonTag(common, tag, value)) { continue; }

        switch (tag) {
            case 'is_a':
                extra.isA.push(parseIsA(value));
                break;
            case 'relationship':
                extra.relationships.push(parseRelationship(value));
                break;
            case 'intersection_of':
                extra.intersectionOf.push(parseIntersectionOf(value));
                break;
            case 'union_of':
                extra.unionOf.push(parseIsA(value));
                break;
            case 'equivalent_to':
                extra.equivalentTo.push(parseIsA(value));
                break;
            case 'disjoint_from':
                extra.disjointFrom.push(parseIsA(value));
                break;
            case 'domain':
                extra.domain = value.trim();
                break;
            case 'range':
                extra.range = value.trim();
                break;
            case 'is_transitive':
                extra.isTransitive = value === 'true';
                break;
            case 'is_symmetric':
                extra.isSymmetric = value === 'true';
                break;
            case 'is_reflexive':
                extra.isReflexive = value === 'true';
                break;
            case 'is_anti_symmetric':
                extra.isAntiSymmetric = value === 'true';
                break;
            case 'is_functional':
                extra.isFunctional = value === 'true';
                break;
            case 'is_inverse_functional':
                extra.isInverseFunctional = value === 'true';
                break;
            case 'is_cyclic':
                extra.isCyclic = value === 'true';
                break;
            case 'inverse_of':
                extra.inverseOf = value.trim();
                break;
            case 'holds_over_chain':
                extra.holdsOverChain.push(parseChain(value));
                break;
            case 'equivalent_to_chain':
                extra.equivalentToChain.push(parseChain(value, 'equivalent_to_chain'));
                break;
            case 'transitive_over':
                extra.transitiveOver.push(value.trim());
                break;
            case 'disjoint_over':
                extra.disjointOver.push(value.trim());
                break;
            case 'expand_expression_to':
                extra.expandExpressionTo = value;
                break;
            case 'expand_assertion_to':
                extra.expandAssertionTo = value;
                break;
            case 'is_metadata_tag':
                extra.isMetadataTag = value === 'true';
                break;
            case 'is_class_level':
                extra.isClassLevel = value === 'true';
                break;
            default:
                common.unparsedTags.push({tag, value});
        }
    }

    return {...common, ...extra};
}

// ---------------------------------------------------------------------------
// Instance builder
// ---------------------------------------------------------------------------

export function buildInstance(tags: OboTagValue[]): OboInstance {
    const common = createCommonFields();
    const extra = {
        instanceOf: [] as string[],
        relationships: [] as OboInstance['relationships']
    };

    for (const {tag, value} of tags) {
        if (applyCommonTag(common, tag, value)) { continue; }

        switch (tag) {
            case 'instance_of':
                extra.instanceOf.push(value.trim());
                break;
            case 'relationship':
                extra.relationships.push(parseRelationship(value));
                break;
            default:
                common.unparsedTags.push({tag, value});
        }
    }

    return {...common, ...extra};
}
