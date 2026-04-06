export type {
  OboXref,
  OboDefinition,
  OboSynonymScope,
  OboSynonym,
  OboQualifier,
  OboIsA,
  OboRelationship,
  OboIntersection,
  OboPropertyValue,
  OboTagValue,
  OboSubsetDef,
  OboSynonymTypeDef,
  OboIdSpace,
  OboTreatXrefMacro,
  OboHeader,
  OboTerm,
  OboTypedef,
  OboInstance,
  OboDocument,
  OboStanza,
} from './types.js';

export { parseObo } from './parse.js';
export { parseOboStream } from './stream.js';
export type { StreamInput } from './stream.js';
