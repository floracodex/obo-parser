# @floracodex/obo-parser

A spec-complete [OBO 1.4 format](https://owlcollab.github.io/oboformat/doc/obo-syntax.html) parser for TypeScript/JavaScript. Parses [OBO Foundry](https://obofoundry.org/) ontology files (Plant Ontology, Gene Ontology, Trait Ontology, PATO, ENVO, and others) into fully typed objects.

- **Streaming and string APIs** — parse large ontologies without buffering the whole file, or parse small files synchronously
- **Complete OBO 1.4 coverage** — all stanza types (`[Term]`, `[Typedef]`, `[Instance]`), all tags, qualifier blocks, xref lists, synonym scopes, multi-line values, escape sequences
- **Full TypeScript types** — every OBO construct has a corresponding interface with JSDoc documentation
- **Zero runtime dependencies**
- **Node.js + browser compatible** (string API works everywhere; streaming API needs async iterables)

## Install

```bash
npm install @floracodex/obo-parser
```

## Usage

### String API

Parse an entire OBO file from a string:

```typescript
import { parseObo } from '@floracodex/obo-parser';
import { readFileSync } from 'fs';

const doc = parseObo(readFileSync('./po.obo', 'utf-8'));

console.log(doc.header.ontology); // "po"
console.log(doc.terms.length); // ~2000

for (const term of doc.terms) {
  console.log(term.id, term.name); // "PO:0009025" "vascular leaf"

  for (const parent of term.isA) {
    console.log(`  is_a: ${parent.target}`);
  }

  for (const rel of term.relationships) {
    console.log(`  ${rel.predicate}: ${rel.target}`);
  }
}
```

### Streaming API

Parse stanza by stanza from a stream — useful for large ontologies or network sources:

```typescript
import { parseOboStream } from '@floracodex/obo-parser';
import { createReadStream } from 'fs';

for await (const item of parseOboStream(createReadStream('./envo.obo'))) {
  switch (item.type) {
    case 'header':
      console.log('Ontology:', item.header.ontology);
      break;
    case 'term':
      console.log(item.term.id, item.term.name);
      break;
    case 'typedef':
      console.log('Relation:', item.typedef.id);
      break;
  }
}
```

The streaming API accepts any `AsyncIterable<string | Uint8Array>` or `ReadableStream`.

## API

### `parseObo(text: string): OboDocument`

Synchronously parse an OBO format string into a typed document.

```typescript
interface OboDocument {
  header: OboHeader;
  terms: OboTerm[];
  typedefs: OboTypedef[];
  instances: OboInstance[];
}
```

### `parseOboStream(input): AsyncGenerator<OboStanza>`

Parse an OBO stream, yielding stanzas one at a time. The first yielded item is always the header.

```typescript
type OboStanza =
  | { type: 'header'; header: OboHeader }
  | { type: 'term'; term: OboTerm }
  | { type: 'typedef'; typedef: OboTypedef }
  | { type: 'instance'; instance: OboInstance };
```

### `OboParseError`

All parse errors throw `OboParseError`, which extends `Error` with additional context:

```typescript
import { OboParseError } from '@floracodex/obo-parser';

try {
  parseObo(malformedContent);
} catch (e) {
  if (e instanceof OboParseError) {
    console.error(e.message); // Human-readable error message
    console.error(e.tag); // The tag being parsed (e.g., "synonym"), or null
    console.error(e.rawValue); // The raw value that failed to parse, or null
  }
}
```

## Types

All types are exported from the package:

| Type               | Description                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `OboDocument`      | Full parsed document (header + all stanzas)                                               |
| `OboHeader`        | Header metadata (format version, ontology, subsets, imports, etc.)                        |
| `OboTerm`          | `[Term]` stanza — id, name, definition, synonyms, is_a, relationships, etc.               |
| `OboTypedef`       | `[Typedef]` stanza — relationship properties (transitivity, symmetry, domain/range, etc.) |
| `OboInstance`      | `[Instance]` stanza — individual instances of classes                                     |
| `OboStanza`        | Discriminated union yielded by the streaming API                                          |
| `OboDefinition`    | Definition text + xref list                                                               |
| `OboSynonym`       | Synonym text, scope (EXACT/BROAD/NARROW/RELATED), type, xrefs                             |
| `OboXref`          | Cross-reference (id + optional description)                                               |
| `OboIsA`           | is_a relationship (target + optional qualifiers)                                          |
| `OboRelationship`  | Named relationship (predicate + target + optional qualifiers)                             |
| `OboIntersection`  | intersection_of component (optional predicate + target)                                   |
| `OboPropertyValue` | Property-value annotation (property + value + optional datatype)                          |
| `OboQualifier`     | Qualifier key-value pair from `{key="value"}` blocks                                      |
| `OboParseError`    | Error class thrown on malformed input, with tag and raw value context                     |

## Format coverage

This parser handles the full OBO 1.4 specification:

- Header tags: `format-version`, `data-version`, `date`, `saved-by`, `ontology`, `default-namespace`, `remark`, `import`, `subsetdef`, `synonymtypedef`, `idspace`, `treat-xrefs-as-*`, `owl-axioms`, `property_value`
- Term tags: `id`, `name`, `namespace`, `def`, `comment`, `alt_id`, `is_anonymous`, `synonym`, `xref`, `subset`, `property_value`, `is_obsolete`, `replaced_by`, `consider`, `created_by`, `creation_date`, `is_a`, `relationship`, `intersection_of`, `union_of`, `equivalent_to`, `disjoint_from`
- Typedef tags: all Term tags plus `domain`, `range`, `is_transitive`, `is_symmetric`, `is_reflexive`, `is_anti_symmetric`, `is_functional`, `is_inverse_functional`, `is_cyclic`, `inverse_of`, `holds_over_chain`, `equivalent_to_chain`, `transitive_over`, `disjoint_over`, `expand_expression_to`, `expand_assertion_to`, `is_metadata_tag`, `is_class_level`
- Instance tags: `id`, `name`, `instance_of`, `property_value`, `relationship`, plus common metadata tags
- Qualifier blocks (`{key="value"}`)
- Escape sequences in quoted strings (`\"`, `\\`, `\n`, `\t`, `\xHH`)
- Multi-line values (continuation lines)
- Trailing `! comments`
- Unrecognized tags preserved in `unparsedTags`

## License

MIT
