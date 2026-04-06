import type { OboHeader, OboTagValue } from '../types.js';
import {
  parseSubsetDef,
  parseSynonymTypeDef,
  parseIdSpace,
  parsePropertyValue,
} from './value-parser.js';

export function createEmptyHeader(): OboHeader {
  return {
    formatVersion: null,
    dataVersion: null,
    date: null,
    savedBy: null,
    ontology: null,
    defaultNamespace: null,
    remarks: [],
    imports: [],
    subsetDefs: [],
    synonymTypeDefs: [],
    idSpaces: [],
    treatXrefsAsEquivalent: [],
    treatXrefsAsIsA: [],
    treatXrefsAsGenusDifferentia: [],
    treatXrefsAsReverseGenusDifferentia: [],
    treatXrefsAsRelationship: [],
    owlAxioms: [],
    propertyValues: [],
    unparsedTags: [],
  };
}

export function buildHeader(tags: OboTagValue[]): OboHeader {
  const header = createEmptyHeader();

  for (const { tag, value } of tags) {
    switch (tag) {
      case 'format-version':
        header.formatVersion = value;
        break;
      case 'data-version':
        header.dataVersion = value;
        break;
      case 'date':
        header.date = value;
        break;
      case 'saved-by':
        header.savedBy = value;
        break;
      case 'ontology':
        header.ontology = value;
        break;
      case 'default-namespace':
        header.defaultNamespace = value;
        break;
      case 'remark':
        header.remarks.push(value);
        break;
      case 'import':
        header.imports.push(value);
        break;
      case 'subsetdef':
        header.subsetDefs.push(parseSubsetDef(value));
        break;
      case 'synonymtypedef':
        header.synonymTypeDefs.push(parseSynonymTypeDef(value));
        break;
      case 'idspace':
        header.idSpaces.push(parseIdSpace(value));
        break;
      case 'treat-xrefs-as-equivalent':
        header.treatXrefsAsEquivalent.push(value);
        break;
      case 'treat-xrefs-as-is_a':
        header.treatXrefsAsIsA.push(value);
        break;
      case 'treat-xrefs-as-genus-differentia': {
        const parts = value.trim().split(/\s+/);
        if (parts.length >= 3) {
          header.treatXrefsAsGenusDifferentia.push({
            idPrefix: parts[0],
            relation: parts[1],
            target: parts[2],
          });
        }
        break;
      }
      case 'treat-xrefs-as-reverse-genus-differentia': {
        const parts = value.trim().split(/\s+/);
        if (parts.length >= 3) {
          header.treatXrefsAsReverseGenusDifferentia.push({
            idPrefix: parts[0],
            relation: parts[1],
            target: parts[2],
          });
        }
        break;
      }
      case 'treat-xrefs-as-relationship': {
        const parts = value.trim().split(/\s+/);
        if (parts.length >= 3) {
          header.treatXrefsAsRelationship.push({
            idPrefix: parts[0],
            relation: parts[1],
            target: parts[2],
          });
        }
        break;
      }
      case 'owl-axioms':
        header.owlAxioms.push(value);
        break;
      case 'property_value':
        header.propertyValues.push(parsePropertyValue(value));
        break;
      default:
        header.unparsedTags.push({ tag, value });
    }
  }

  return header;
}
