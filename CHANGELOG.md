# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `parseObo()` — synchronous string API for parsing OBO format files
- `parseOboStream()` — async streaming API yielding stanzas one at a time
- Full OBO 1.4 format coverage: `[Term]`, `[Typedef]`, `[Instance]` stanzas
- All standard tags, qualifier blocks, escape sequences, multi-line values
- `OboParseError` error class with tag and raw value context
- Complete TypeScript type definitions with JSDoc documentation
- Zero runtime dependencies
