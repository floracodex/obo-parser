# CLAUDE.md

## What this project is

A TypeScript/JavaScript parser for the [OBO 1.4 flat file format](https://owlcollab.github.io/oboformat/doc/obo-syntax.html), published as `@floracodex/obo-parser` on npm. This is the only OBO parser in the JS/TS ecosystem — there is no alternative on npm. The closest equivalents in other languages are `pronto` (Python) and `fastobo` (Rust).

The library is used by Flora Codex to parse OBO Foundry ontology files (Plant Ontology, Gene Ontology, PATO, etc.) for use in web-based botanical data tools.

## Architecture

The parser is structured in layers:

1. **Line parsing** (`src/parser/line-parser.ts`) — Splits raw text into logical lines, handling continuation lines (leading whitespace), full-line comments (`!`), trailing comments, and stanza headers (`[Term]`). The `LineAccumulator` class is stateful and shared by both the string and streaming APIs to avoid duplicating line-level logic.

2. **Value parsing** (`src/parser/value-parser.ts`) — Pure functions that parse individual tag values: quoted strings with escape sequences, xref lists, qualifier blocks, definitions, synonyms, property values, etc. This is the largest file because OBO value syntax is surprisingly complex.

3. **Stanza building** (`src/parser/stanza-builder.ts`) — Converts arrays of raw tag-value pairs into typed `OboTerm`, `OboTypedef`, and `OboInstance` objects. Uses a shared `CommonFields` pattern for the 17 fields common to all stanza types.

4. **Header building** (`src/parser/header-builder.ts`) — Same pattern for the header section.

5. **String API** (`src/parse.ts`) — `parseObo(text)` returns a complete `OboDocument`.

6. **Streaming API** (`src/stream.ts`) — `parseOboStream(input)` is an async generator yielding `OboStanza` items one at a time. Handles chunk splitting, CRLF, TextDecoder for Uint8Array input.

## Key design decisions

- **Zero runtime dependencies.** This is intentional. A parser library should not pull in a dependency tree.
- **Both string and streaming APIs.** The string API is simpler for small files. The streaming API is necessary for large ontologies (GO is 569K lines). Both must produce identical results — this is enforced by parity tests.
- **Lenient where the spec is ambiguous, strict where it's clear.** Continuation lines and bare qualifier values are accepted (real tools emit them). Invalid synonym scopes and unterminated quotes throw `OboParseError`.
- **`unparsedTags` as an escape hatch.** Unknown tags are preserved, not dropped. This means the parser is forward-compatible with future spec additions and custom tags.
- **`OboIsA` is reused for `unionOf`, `equivalentTo`, `disjointFrom`.** These all have the same shape (`{target, qualifiers}`). The type name is imperfect but avoids proliferating near-identical types.
- **`OboTreatXrefRelationship` is a separate type from `OboTreatXrefMacro`** because the OBO spec defines `treat-xrefs-as-relationship` with 2 tokens (prefix + relation) while genus-differentia macros require 3 tokens (prefix + relation + target).

## Code style

This project follows the App.FloraCodex backend ESLint configuration:
- 4-space indentation for TypeScript (2-space default for other files)
- Single quotes, semicolons, no trailing commas
- `@stylistic/eslint-plugin` for formatting (not prettier)
- `recommendedTypeChecked` rules from typescript-eslint
- Strict in source, relaxed in tests (`noUncheckedIndexedAccess` off, `require-await` off)

## Testing

- Unit tests cover every parser function individually.
- Integration tests parse real-world ontologies (GO, PO, PATO, UO) when the `.obo` files are present locally. These are gitignored and not available in CI — the tests skip gracefully via `describeIfFile`. Download them with curl from `purl.obolibrary.org` if you need to run them.
- The integration tests verify **zero unparsed tags** across all stanzas and **full parity** between string and streaming APIs.

## Versioning and publishing

- Semantic versioning with `v` prefix on tags (e.g., `v1.0.0`). This matches the convention across all FloraCodex open source repos.
- Publishing is triggered by creating a GitHub release. The `npm-publish.yml` workflow builds, tests, and publishes to npm using trusted publishing (OIDC — no NPM_TOKEN secret needed after initial setup).
- First publish must be done manually (`npm login` + `npm publish --access public`) to create the package on npm, then trusted publishing is configured on npmjs.com.

## Things to know

- The OBO format looks simple (it's just `tag: value` lines) but the value syntax is complex: quoted strings with 7 escape sequences, xref lists with nested brackets, qualifier blocks with quoted values, comma-separated lists inside brackets, and continuation lines.
- The OBO 1.4 spec is at https://owlcollab.github.io/oboformat/doc/obo-syntax.html — refer to it for any tag behavior questions.
- Real-world OBO files deviate from the spec in minor ways (bare qualifier values, continuation lines, missing closing quotes in older files). The parser handles these gracefully.
- `test/integration/*.obo` files are gitignored. To run integration tests locally, download ontologies from purl.obolibrary.org (e.g., `curl -o test/integration/go.obo https://purl.obolibrary.org/obo/go/go-basic.obo`).
