import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseOboStream } from '../src/stream.js';
import { parseObo } from '../src/parse.js';
import type { OboStanza } from '../src/types.js';

function fixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf-8');
}

async function collectStanzas(input: AsyncGenerator<OboStanza>): Promise<OboStanza[]> {
  const results: OboStanza[] = [];
  for await (const stanza of input) {
    results.push(stanza);
  }
  return results;
}

/** Create an async iterable from a string, yielding it as a single chunk. */
async function* singleChunk(text: string): AsyncGenerator<string> {
  yield text;
}

/** Create an async iterable that yields a string character-by-character (worst-case chunking). */
async function* charByChar(text: string): AsyncGenerator<string> {
  for (const ch of text) {
    yield ch;
  }
}

/** Create an async iterable that yields a string in chunks of `size` characters. */
async function* chunked(text: string, size: number): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

describe('parseOboStream', () => {
  describe('basic parsing', () => {
    it('yields a header as the first stanza', async () => {
      const text = fixture('minimal.obo');
      const stanzas = await collectStanzas(parseOboStream(singleChunk(text)));
      expect(stanzas[0].type).toBe('header');
      if (stanzas[0].type === 'header') {
        expect(stanzas[0].header.formatVersion).toBe('1.2');
        expect(stanzas[0].header.ontology).toBe('test');
      }
    });

    it('yields term stanzas', async () => {
      const text = fixture('minimal.obo');
      const stanzas = await collectStanzas(parseOboStream(singleChunk(text)));
      const terms = stanzas.filter((s) => s.type === 'term');
      expect(terms).toHaveLength(2);
      if (terms[0].type === 'term') {
        expect(terms[0].term.id).toBe('TEST:0001');
      }
      if (terms[1].type === 'term') {
        expect(terms[1].term.id).toBe('TEST:0002');
        expect(terms[1].term.isA).toEqual([{ target: 'TEST:0001', qualifiers: [] }]);
      }
    });

    it('yields typedef stanzas', async () => {
      const text = fixture('typedef.obo');
      const stanzas = await collectStanzas(parseOboStream(singleChunk(text)));
      const typedefs = stanzas.filter((s) => s.type === 'typedef');
      expect(typedefs).toHaveLength(2);
    });

    it('yields instance stanzas', async () => {
      const text = fixture('instance.obo');
      const stanzas = await collectStanzas(parseOboStream(singleChunk(text)));
      const instances = stanzas.filter((s) => s.type === 'instance');
      expect(instances).toHaveLength(1);
    });
  });

  describe('chunked input', () => {
    it('handles character-by-character input', async () => {
      const text = fixture('minimal.obo');
      const stanzas = await collectStanzas(parseOboStream(charByChar(text)));
      expect(stanzas).toHaveLength(3); // header + 2 terms
    });

    it('handles small chunk sizes', async () => {
      const text = fixture('minimal.obo');
      const stanzas = await collectStanzas(parseOboStream(chunked(text, 7)));
      expect(stanzas).toHaveLength(3);
    });

    it('handles mid-line chunk boundaries', async () => {
      const text = fixture('typedef.obo');
      const stanzas = await collectStanzas(parseOboStream(chunked(text, 13)));
      const typedefs = stanzas.filter((s) => s.type === 'typedef');
      expect(typedefs).toHaveLength(2);
      if (typedefs[0].type === 'typedef') {
        expect(typedefs[0].typedef.id).toBe('part_of');
        expect(typedefs[0].typedef.isTransitive).toBe(true);
      }
    });
  });

  describe('parity with parseObo', () => {
    const fixtureNames = [
      'minimal.obo',
      'full-header.obo',
      'escapes.obo',
      'obsolete.obo',
      'typedef.obo',
      'instance.obo',
      'qualifiers.obo',
      'multiline.obo',
    ];

    for (const name of fixtureNames) {
      it(`produces equivalent results for ${name}`, async () => {
        const text = fixture(name);

        // Parse with string API
        const doc = parseObo(text);

        // Parse with streaming API
        const stanzas = await collectStanzas(parseOboStream(singleChunk(text)));

        // Compare header
        const headerStanza = stanzas.find((s) => s.type === 'header');
        expect(headerStanza).toBeDefined();
        if (headerStanza?.type === 'header') {
          expect(headerStanza.header).toEqual(doc.header);
        }

        // Compare terms
        const streamTerms = stanzas
          .filter((s) => s.type === 'term')
          .map((s) => (s as { type: 'term'; term: any }).term);
        expect(streamTerms).toEqual(doc.terms);

        // Compare typedefs
        const streamTypedefs = stanzas
          .filter((s) => s.type === 'typedef')
          .map((s) => (s as { type: 'typedef'; typedef: any }).typedef);
        expect(streamTypedefs).toEqual(doc.typedefs);

        // Compare instances
        const streamInstances = stanzas
          .filter((s) => s.type === 'instance')
          .map((s) => (s as { type: 'instance'; instance: any }).instance);
        expect(streamInstances).toEqual(doc.instances);
      });
    }
  });

  describe('edge cases', () => {
    it('handles empty input', async () => {
      const stanzas = await collectStanzas(parseOboStream(singleChunk('')));
      expect(stanzas).toHaveLength(1); // Just the header
      expect(stanzas[0].type).toBe('header');
    });

    it('handles Uint8Array chunks', async () => {
      const text = fixture('minimal.obo');
      const encoder = new TextEncoder();

      async function* uint8Chunks(): AsyncGenerator<Uint8Array> {
        yield encoder.encode(text);
      }

      const stanzas = await collectStanzas(parseOboStream(uint8Chunks()));
      expect(stanzas).toHaveLength(3);
    });
  });
});
