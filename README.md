# @floracodex/obo-parser

A spec-complete [OBO 1.4 format](https://owlcollab.github.io/oboformat/doc/obo-syntax.html) parser for TypeScript and JavaScript. Parses [OBO Foundry](https://obofoundry.org/) ontology files into fully typed objects with zero runtime dependencies.

Built for real-world ontologies: Gene Ontology, Plant Ontology, PATO, ENVO, ChEBI, Uberon, and any other OBO-format file.

## Features

- **Two APIs** &mdash; synchronous `parseObo(string)` for small files, async `parseOboStream(stream)` for large ontologies
- **Full OBO 1.4 coverage** &mdash; all stanza types, all tags, qualifier blocks, escape sequences, multi-line values
- **Fully typed** &mdash; every OBO construct has a corresponding TypeScript interface with JSDoc
- **Zero runtime dependencies**
- **ESM and CommonJS** dual-package output

## Install

```bash
npm install @floracodex/obo-parser
```

Requires Node.js 20 or later.

## Quick start

### Parse a string

```ts
import { parseObo } from '@floracodex/obo-parser';
import { readFileSync } from 'fs';

const doc = parseObo(readFileSync('po.obo', 'utf-8'));

console.log(doc.header.ontology);     // "po"
console.log(doc.terms.length);        // ~2,000

for (const term of doc.terms) {
    if (term.isObsolete) continue;

    console.log(term.id, term.name);
    for (const parent of term.isA) {
        console.log(`  is_a: ${parent.target}`);
    }
}
```

### Stream a large file

```ts
import { parseOboStream } from '@floracodex/obo-parser';
import { createReadStream } from 'fs';

for await (const item of parseOboStream(createReadStream('go.obo'))) {
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
        case 'instance':
            console.log('Instance:', item.instance.id);
            break;
    }
}
```

The streaming parser accepts any `AsyncIterable<string | Uint8Array>` or `ReadableStream`. Stanzas are yielded one at a time as they are parsed, keeping memory usage constant regardless of file size. The first item yielded is always the header.

## API

### `parseObo(text: string): OboDocument`

Parse an OBO-format string synchronously. Handles UTF-8 BOM stripping automatically.

```ts
interface OboDocument {
    header: OboHeader;
    terms: OboTerm[];
    typedefs: OboTypedef[];
    instances: OboInstance[];
}
```

### `parseOboStream(input: StreamInput): AsyncGenerator<OboStanza>`

Parse an OBO stream, yielding stanzas incrementally.

```ts
type StreamInput = AsyncIterable<string | Uint8Array> | ReadableStream<string | Uint8Array>;

type OboStanza =
    | { type: 'header';   header: OboHeader }
    | { type: 'term';     term: OboTerm }
    | { type: 'typedef';  typedef: OboTypedef }
    | { type: 'instance'; instance: OboInstance };
```

Input encoding is assumed to be UTF-8.

### `OboParseError`

Thrown on malformed input (unterminated strings, invalid synonym scopes, malformed relationship values, etc.).

```ts
import { OboParseError } from '@floracodex/obo-parser';

try {
    parseObo(content);
} catch (err) {
    if (err instanceof OboParseError) {
        console.error(err.message);   // Human-readable description
        console.error(err.tag);       // Tag being parsed (e.g., "synonym"), or null
        console.error(err.rawValue);  // The raw value that failed, or null
    }
}
```

## Types

Every OBO construct has a corresponding exported TypeScript interface:

| Type | Description |
|------|-------------|
| `OboDocument` | Complete parsed document (header + all stanzas) |
| `OboHeader` | Header metadata (format version, ontology, subsets, imports, treat-xrefs macros, etc.) |
| `OboTerm` | `[Term]` stanza &mdash; id, name, definition, synonyms, is_a, relationships, etc. |
| `OboTypedef` | `[Typedef]` stanza &mdash; relation properties (transitivity, symmetry, domain/range, etc.) |
| `OboInstance` | `[Instance]` stanza &mdash; individual instances of classes |
| `OboCommonStanza` | Base interface shared by Term, Typedef, and Instance |
| `OboStanza` | Discriminated union yielded by the streaming API |
| `OboDefinition` | Definition text + xref list |
| `OboSynonym` | Synonym text, scope (`EXACT`/`BROAD`/`NARROW`/`RELATED`), type, xrefs |
| `OboXref` | Cross-reference (id + optional description) |
| `OboIsA` | Target reference with optional qualifier block |
| `OboRelationship` | Named relationship (predicate + target + qualifiers) |
| `OboIntersection` | Intersection component (optional predicate + target + qualifiers) |
| `OboPropertyValue` | Property-value annotation (property + value + optional XSD datatype) |
| `OboQualifier` | Key-value pair from `{key="value"}` qualifier blocks |
| `OboParseError` | Error with tag and raw value context |

## Spec coverage

### Stanza types

All three OBO 1.4 stanza types are fully supported: `[Term]`, `[Typedef]`, `[Instance]`.

Unknown stanza types are silently skipped. Unrecognized tags within a known stanza are preserved in `unparsedTags` so no data is lost.

### Header tags

`format-version`, `data-version`, `date`, `saved-by`, `auto-generated-by`, `ontology`, `default-namespace`, `remark`, `import`, `subsetdef`, `synonymtypedef`, `idspace`, `treat-xrefs-as-equivalent`, `treat-xrefs-as-is_a`, `treat-xrefs-as-has-subclass`, `treat-xrefs-as-genus-differentia`, `treat-xrefs-as-reverse-genus-differentia`, `treat-xrefs-as-relationship`, `owl-axioms`, `property_value`.

### Term tags

`id`, `name`, `namespace`, `def`, `comment`, `alt_id`, `is_anonymous`, `builtin`, `synonym`, `xref`, `subset`, `property_value`, `is_a`, `relationship`, `intersection_of`, `union_of`, `equivalent_to`, `disjoint_from`, `is_obsolete`, `replaced_by`, `consider`, `created_by`, `creation_date`.

### Typedef tags

All Term tags plus: `domain`, `range`, `is_transitive`, `is_symmetric`, `is_reflexive`, `is_anti_symmetric`, `is_functional`, `is_inverse_functional`, `is_cyclic`, `inverse_of`, `holds_over_chain`, `equivalent_to_chain`, `transitive_over`, `disjoint_over`, `expand_expression_to`, `expand_assertion_to`, `is_metadata_tag`, `is_class_level`.

### Instance tags

`id`, `name`, `instance_of`, `property_value`, `relationship`, plus all common metadata tags.

### Other format features

- **Escape sequences** in quoted strings: `\"`, `\\`, `\n`, `\t`, `\:`, `\!`, `\xHH`
- **Qualifier blocks**: `{key="value", key2="value2"}` on `is_a`, `relationship`, `intersection_of`, `union_of`, `equivalent_to`, `disjoint_from`
- **Continuation lines**: leading whitespace joins to the previous tag value
- **Trailing comments**: `! comment` stripped outside quoted strings
- **Full-line comments**: lines starting with `!` are skipped
- **UTF-8 BOM**: automatically stripped (string API)

## Lenient parsing behavior

The parser follows the OBO 1.4 specification strictly for recognized tags, but is lenient in a few areas to handle real-world files:

- **Continuation lines** are supported (leading whitespace joins to the previous line), though the 1.4 spec does not formally define this. Many tools emit them.
- **Bare qualifier values** (unquoted, e.g., `{key=value}`) are accepted. The spec requires quoted values (`{key="value"}`), but some tools omit quotes.
- **Malformed header macros** (`treat-xrefs-as-*` with insufficient tokens) are preserved in `unparsedTags` rather than throwing, so callers can inspect and report them.
- **Empty stanzas** (a stanza header with no tags) are skipped by both the string and streaming APIs.

## License

MIT
