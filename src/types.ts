// ---------------------------------------------------------------------------
// Value types
// ---------------------------------------------------------------------------

/** A cross-reference to an external identifier, optionally with a description. */
export interface OboXref {
    /** The cross-reference identifier (e.g., `"GOC:mcc"`, `"PMID:12345678"`). */
    id: string;
    /** An optional human-readable description of the cross-reference. */
    description: string | null;
}

/** A definition consisting of text and a list of supporting cross-references. */
export interface OboDefinition {
    /** The definition text. */
    text: string;
    /** Cross-references supporting this definition. */
    xrefs: OboXref[];
}

/** Valid synonym scope values as defined by the OBO 1.4 specification. */
export type OboSynonymScope = 'EXACT' | 'BROAD' | 'NARROW' | 'RELATED';

/** A synonym for a term, with scope, optional type, and supporting cross-references. */
export interface OboSynonym {
    /** The synonym text. */
    text: string;
    /** The scope of the synonym (EXACT, BROAD, NARROW, or RELATED). */
    scope: OboSynonymScope;
    /** An optional synonym type ID, referencing a `synonymtypedef` in the header. */
    type: string | null;
    /** Cross-references supporting this synonym. */
    xrefs: OboXref[];
}

/** A key-value qualifier attached to a tag-value pair via `{key="value"}` syntax. */
export interface OboQualifier {
    /** The qualifier key. */
    key: string;
    /** The qualifier value. */
    value: string;
}

/** An `is_a` relationship to a parent term, with optional qualifiers. */
export interface OboIsA {
    /** The accession of the parent term. */
    target: string;
    /** Qualifiers attached to this `is_a` assertion. */
    qualifiers: OboQualifier[];
}

/** A named relationship between terms (e.g., `part_of`, `has_part`). */
export interface OboRelationship {
    /** The relationship type identifier (e.g., `"part_of"`). */
    predicate: string;
    /** The accession of the target term. */
    target: string;
    /** Qualifiers attached to this relationship assertion. */
    qualifiers: OboQualifier[];
}

/** A component of an `intersection_of` logical definition. */
export interface OboIntersection {
    /** The relationship predicate, or `null` for the genus (bare accession). */
    predicate: string | null;
    /** The accession of the target term. */
    target: string;
    /** Qualifiers attached to this intersection component. */
    qualifiers: OboQualifier[];
}

/** A property-value annotation (e.g., `property_value: dc:date "2026-03-01" xsd:dateTime`). */
export interface OboPropertyValue {
    /** The property identifier. */
    property: string;
    /** The property value (unquoted). */
    value: string;
    /** The XSD datatype, or `null` for bare ID values. */
    datatype: string | null;
}

/** A raw tag-value pair, used for unrecognized or unparsed tags. */
export interface OboTagValue {
    /** The tag name. */
    tag: string;
    /** The raw value string. */
    value: string;
}

// ---------------------------------------------------------------------------
// Header types
// ---------------------------------------------------------------------------

/** A subset definition declared in the header via `subsetdef`. */
export interface OboSubsetDef {
    /** The subset identifier. */
    id: string;
    /** A human-readable description of the subset. */
    description: string;
}

/** A synonym type definition declared in the header via `synonymtypedef`. */
export interface OboSynonymTypeDef {
    /** The synonym type identifier. */
    id: string;
    /** A human-readable description of the synonym type. */
    description: string;
    /** An optional default scope for synonyms of this type. */
    scope: OboSynonymScope | null;
}

/** An ID-space mapping declared in the header via `idspace`. */
export interface OboIdSpace {
    /** The prefix used in the ontology (e.g., `"GO"`). */
    prefix: string;
    /** The URI that the prefix maps to. */
    uri: string;
    /** An optional human-readable description. */
    description: string | null;
}

/** A `treat-xrefs-as-genus-differentia` or `treat-xrefs-as-reverse-genus-differentia` macro. */
export interface OboTreatXrefMacro {
    /** The ID prefix this macro applies to. */
    idPrefix: string;
    /** The relationship type to generate. */
    relation: string;
    /** The target term for genus-differentia macros. */
    target: string;
}

/** A `treat-xrefs-as-relationship` macro declared in the header. */
export interface OboTreatXrefRelationship {
    /** The ID prefix this macro applies to. */
    idPrefix: string;
    /** The relationship type to generate. */
    relation: string;
}

/** The header section of an OBO document, containing ontology-level metadata. */
export interface OboHeader {
    /** The OBO format version (e.g., `"1.2"`, `"1.4"`). */
    formatVersion: string | null;
    /** The ontology data version (e.g., `"releases/2026-03-01"`). */
    dataVersion: string | null;
    /** The date the file was generated (DD:MM:YYYY hh:mm format). */
    date: string | null;
    /** The username of the person who saved this file. */
    savedBy: string | null;
    /** The primary ontology identifier (e.g., `"po"`, `"go"`). */
    ontology: string | null;
    /** The fallback namespace for frames without an explicit `namespace` tag. */
    defaultNamespace: string | null;
    /** Freeform remark lines. */
    remarks: string[];
    /** URIs of imported ontologies. */
    imports: string[];
    /** Subset definitions. */
    subsetDefs: OboSubsetDef[];
    /** Synonym type definitions. */
    synonymTypeDefs: OboSynonymTypeDef[];
    /** ID-space prefix-to-URI mappings. */
    idSpaces: OboIdSpace[];
    /** ID prefixes whose xrefs should be treated as equivalent classes. */
    treatXrefsAsEquivalent: string[];
    /** ID prefixes whose xrefs should be treated as `is_a` relationships. */
    treatXrefsAsIsA: string[];
    /** Genus-differentia macros for cross-references. */
    treatXrefsAsGenusDifferentia: OboTreatXrefMacro[];
    /** Reverse genus-differentia macros for cross-references. */
    treatXrefsAsReverseGenusDifferentia: OboTreatXrefMacro[];
    /** Relationship macros for cross-references. */
    treatXrefsAsRelationship: OboTreatXrefRelationship[];
    /** Raw OWL axiom strings embedded in the header. */
    owlAxioms: string[];
    /** Property-value annotations on the ontology itself. */
    propertyValues: OboPropertyValue[];
    /** Tags not recognized by the parser, preserved as raw tag-value pairs. */
    unparsedTags: OboTagValue[];
}

// ---------------------------------------------------------------------------
// Stanza types
// ---------------------------------------------------------------------------

/** Common fields shared by all stanza types (`[Term]`, `[Typedef]`, `[Instance]`). */
export interface OboCommonStanza {
    /** The unique identifier (e.g., `"PO:0009025"`, `"part_of"`). */
    id: string;
    /** The human-readable name. */
    name: string | null;
    /** The namespace this entity belongs to. */
    namespace: string | null;
    /** The definition with supporting cross-references. */
    definition: OboDefinition | null;
    /** A freeform comment. */
    comment: string | null;
    /** Alternative (historical) identifiers. */
    altIds: string[];
    /** Whether this entity is anonymous (has no stable identifier). */
    isAnonymous: boolean;
    /** Synonyms. */
    synonyms: OboSynonym[];
    /** Cross-references to external databases. */
    xrefs: OboXref[];
    /** Subsets this entity belongs to. */
    subsets: string[];
    /** Property-value annotations. */
    propertyValues: OboPropertyValue[];
    /** Whether this entity is marked as obsolete. */
    isObsolete: boolean;
    /** Identifiers of entities that replace this obsolete entity. */
    replacedBy: string[];
    /** Identifiers of entities to consider as alternatives for this obsolete entity. */
    consider: string[];
    /** The user who created this entity. */
    createdBy: string | null;
    /** ISO-8601 timestamp of when this entity was created. */
    creationDate: string | null;
    /** Tags not recognized by the parser, preserved as raw tag-value pairs. */
    unparsedTags: OboTagValue[];
}

/** A parsed `[Term]` stanza representing an ontology class. */
export interface OboTerm extends OboCommonStanza {
    /** `is_a` (subsumption) relationships to parent terms. */
    isA: OboIsA[];
    /** Named relationships to other terms. */
    relationships: OboRelationship[];
    /** Components of a logical intersection definition. */
    intersectionOf: OboIntersection[];
    /** Accessions forming a union definition, with optional qualifiers. */
    unionOf: OboIsA[];
    /** Accessions of logically equivalent terms, with optional qualifiers. */
    equivalentTo: OboIsA[];
    /** Accessions of mutually exclusive terms, with optional qualifiers. */
    disjointFrom: OboIsA[];
}

/** A parsed `[Typedef]` stanza representing a relationship type. */
export interface OboTypedef extends OboCommonStanza {
    /** `is_a` relationships to parent relation types. */
    isA: OboIsA[];
    /** Named relationships to other relations. */
    relationships: OboRelationship[];
    /** Components of a logical intersection definition. */
    intersectionOf: OboIntersection[];
    /** Identifiers forming a union definition, with optional qualifiers. */
    unionOf: OboIsA[];
    /** Identifiers of logically equivalent relations, with optional qualifiers. */
    equivalentTo: OboIsA[];
    /** Identifiers of mutually exclusive relations, with optional qualifiers. */
    disjointFrom: OboIsA[];
    /** The class that serves as the domain (subject constraint) of this relation. */
    domain: string | null;
    /** The class that serves as the range (object constraint) of this relation. */
    range: string | null;
    /** Whether this relation is transitive. */
    isTransitive: boolean;
    /** Whether this relation is symmetric. */
    isSymmetric: boolean;
    /** Whether this relation is reflexive. */
    isReflexive: boolean;
    /** Whether this relation is anti-symmetric. */
    isAntiSymmetric: boolean;
    /** Whether this relation is functional. */
    isFunctional: boolean;
    /** Whether this relation is inverse-functional. */
    isInverseFunctional: boolean;
    /** Whether this relation is cyclic. */
    isCyclic: boolean;
    /** The identifier of the inverse relation. */
    inverseOf: string | null;
    /** Property composition chains (`[rel1, rel2]` tuples). */
    holdsOverChain: [string, string][];
    /** Equivalent property composition chains. */
    equivalentToChain: [string, string][];
    /** Relations this relation is transitive over. */
    transitiveOver: string[];
    /** Relations this relation is disjoint over. */
    disjointOver: string[];
    /** OWL expression expansion template. */
    expandExpressionTo: string | null;
    /** OWL assertion expansion template. */
    expandAssertionTo: string | null;
    /** Whether this relation is metadata-only (annotation property). */
    isMetadataTag: boolean;
    /** Whether this relation permits class-level value assertions. */
    isClassLevel: boolean;
}

/** A parsed `[Instance]` stanza representing an individual. */
export interface OboInstance extends OboCommonStanza {
    /** Class accessions this instance is a member of. */
    instanceOf: string[];
    /** Named relationships to other instances or terms. */
    relationships: OboRelationship[];
}

// ---------------------------------------------------------------------------
// Document type
// ---------------------------------------------------------------------------

/** A fully parsed OBO document containing the header and all stanzas. */
export interface OboDocument {
    /** The header section with ontology-level metadata. */
    header: OboHeader;
    /** All `[Term]` stanzas in document order. */
    terms: OboTerm[];
    /** All `[Typedef]` stanzas in document order. */
    typedefs: OboTypedef[];
    /** All `[Instance]` stanzas in document order. */
    instances: OboInstance[];
}

// ---------------------------------------------------------------------------
// Streaming API discriminated union
// ---------------------------------------------------------------------------

/** A discriminated union yielded by the streaming parser. */
export type OboStanza =
  | {type: 'header'; header: OboHeader}
  | {type: 'term'; term: OboTerm}
  | {type: 'typedef'; typedef: OboTypedef}
  | {type: 'instance'; instance: OboInstance};
