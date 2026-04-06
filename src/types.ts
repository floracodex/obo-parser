// ---------------------------------------------------------------------------
// Value types
// ---------------------------------------------------------------------------

export interface OboXref {
  id: string;
  description: string | null;
}

export interface OboDefinition {
  text: string;
  xrefs: OboXref[];
}

export type OboSynonymScope = 'EXACT' | 'BROAD' | 'NARROW' | 'RELATED';

export interface OboSynonym {
  text: string;
  scope: OboSynonymScope;
  type: string | null;
  xrefs: OboXref[];
}

export interface OboQualifier {
  key: string;
  value: string;
}

export interface OboIsA {
  target: string;
  qualifiers: OboQualifier[];
}

export interface OboRelationship {
  predicate: string;
  target: string;
  qualifiers: OboQualifier[];
}

export interface OboIntersection {
  predicate: string | null;
  target: string;
}

export interface OboPropertyValue {
  property: string;
  value: string;
  datatype: string | null;
}

export interface OboTagValue {
  tag: string;
  value: string;
}

// ---------------------------------------------------------------------------
// Header types
// ---------------------------------------------------------------------------

export interface OboSubsetDef {
  id: string;
  description: string;
}

export interface OboSynonymTypeDef {
  id: string;
  description: string;
  scope: OboSynonymScope | null;
}

export interface OboIdSpace {
  prefix: string;
  uri: string;
  description: string | null;
}

export interface OboTreatXrefMacro {
  idPrefix: string;
  relation: string;
  target: string;
}

export interface OboHeader {
  formatVersion: string | null;
  dataVersion: string | null;
  date: string | null;
  savedBy: string | null;
  ontology: string | null;
  defaultNamespace: string | null;
  remarks: string[];
  imports: string[];
  subsetDefs: OboSubsetDef[];
  synonymTypeDefs: OboSynonymTypeDef[];
  idSpaces: OboIdSpace[];
  treatXrefsAsEquivalent: string[];
  treatXrefsAsIsA: string[];
  treatXrefsAsGenusDifferentia: OboTreatXrefMacro[];
  treatXrefsAsReverseGenusDifferentia: OboTreatXrefMacro[];
  treatXrefsAsRelationship: OboTreatXrefMacro[];
  owlAxioms: string[];
  propertyValues: OboPropertyValue[];
  unparsedTags: OboTagValue[];
}

// ---------------------------------------------------------------------------
// Stanza types
// ---------------------------------------------------------------------------

export interface OboTerm {
  id: string;
  name: string | null;
  namespace: string | null;
  definition: OboDefinition | null;
  comment: string | null;
  altIds: string[];
  isAnonymous: boolean;
  synonyms: OboSynonym[];
  xrefs: OboXref[];
  subsets: string[];
  propertyValues: OboPropertyValue[];
  isObsolete: boolean;
  replacedBy: string[];
  consider: string[];
  createdBy: string | null;
  creationDate: string | null;
  isA: OboIsA[];
  relationships: OboRelationship[];
  intersectionOf: OboIntersection[];
  unionOf: string[];
  equivalentTo: string[];
  disjointFrom: string[];
  unparsedTags: OboTagValue[];
}

export interface OboTypedef {
  id: string;
  name: string | null;
  namespace: string | null;
  definition: OboDefinition | null;
  comment: string | null;
  altIds: string[];
  isAnonymous: boolean;
  synonyms: OboSynonym[];
  xrefs: OboXref[];
  subsets: string[];
  propertyValues: OboPropertyValue[];
  isObsolete: boolean;
  replacedBy: string[];
  consider: string[];
  createdBy: string | null;
  creationDate: string | null;
  isA: OboIsA[];
  relationships: OboRelationship[];
  intersectionOf: OboIntersection[];
  unionOf: string[];
  equivalentTo: string[];
  disjointFrom: string[];
  unparsedTags: OboTagValue[];
  domain: string | null;
  range: string | null;
  isTransitive: boolean;
  isSymmetric: boolean;
  isReflexive: boolean;
  isAntiSymmetric: boolean;
  isFunctional: boolean;
  isInverseFunctional: boolean;
  isCyclic: boolean;
  inverseOf: string | null;
  holdsOverChain: [string, string][];
  equivalentToChain: [string, string][];
  transitiveOver: string[];
  disjointOver: string[];
  expandExpressionTo: string | null;
  expandAssertionTo: string | null;
  isMetadataTag: boolean;
  isClassLevel: boolean;
}

export interface OboInstance {
  id: string;
  name: string | null;
  namespace: string | null;
  definition: OboDefinition | null;
  comment: string | null;
  altIds: string[];
  isAnonymous: boolean;
  synonyms: OboSynonym[];
  xrefs: OboXref[];
  subsets: string[];
  propertyValues: OboPropertyValue[];
  isObsolete: boolean;
  replacedBy: string[];
  consider: string[];
  createdBy: string | null;
  creationDate: string | null;
  unparsedTags: OboTagValue[];
  instanceOf: string[];
  relationships: OboRelationship[];
}

// ---------------------------------------------------------------------------
// Document type
// ---------------------------------------------------------------------------

export interface OboDocument {
  header: OboHeader;
  terms: OboTerm[];
  typedefs: OboTypedef[];
  instances: OboInstance[];
}

// ---------------------------------------------------------------------------
// Streaming API discriminated union
// ---------------------------------------------------------------------------

export type OboStanza =
  | { type: 'header'; header: OboHeader }
  | { type: 'term'; term: OboTerm }
  | { type: 'typedef'; typedef: OboTypedef }
  | { type: 'instance'; instance: OboInstance };
