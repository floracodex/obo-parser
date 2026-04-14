import type {OboStanza, OboTagValue} from './types.js';
import {LineAccumulator} from './parser/line-parser.js';
import {buildHeader} from './parser/header-builder.js';
import {buildTerm, buildTypedef, buildInstance} from './parser/stanza-builder.js';

/**
 * Input types accepted by the streaming parser.
 */
export type StreamInput =
  | AsyncIterable<string | Uint8Array>
  | ReadableStream<string | Uint8Array>;

/**
 * Parse an OBO file as a stream, yielding stanzas one at a time.
 *
 * The first yielded item is always `{ type: 'header', header }`.
 * Subsequent items are terms, typedefs, or instances as they are parsed.
 *
 * @param input - An async iterable or ReadableStream of string/Uint8Array chunks.
 */
export async function* parseOboStream(input: StreamInput): AsyncGenerator<OboStanza> {
    const lines = splitLines(toAsyncIterable(input));
    const accumulator = new LineAccumulator();

    let headerTags: OboTagValue[] | null = [];
    let currentStanzaType: string | null = null;
    let currentTags: OboTagValue[] = [];

    function* flushStanza(): Generator<OboStanza> {
        if (headerTags !== null) {
            yield {type: 'header', header: buildHeader(headerTags)};
            headerTags = null;
        } else if (currentStanzaType !== null && currentTags.length > 0) {
            yield* buildAndYieldStanza(currentStanzaType, currentTags);
        }
        currentTags = [];
    }

    for await (const raw of lines) {
        const logicalLines = accumulator.feed(raw);

        for (const line of logicalLines) {
            if (line.type === 'blank') {
                continue;
            }

            if (line.type === 'stanza-header') {
                yield* flushStanza();
                currentStanzaType = line.stanzaType;
                continue;
            }

            if (line.type === 'tag') {
                if (headerTags !== null) {
                    headerTags.push({tag: line.tag, value: line.value});
                } else {
                    currentTags.push({tag: line.tag, value: line.value});
                }
            }
        }
    }

    // Flush the accumulator's pending line
    const remaining = accumulator.flush();
    for (const line of remaining) {
        if (line.type === 'tag') {
            if (headerTags !== null) {
                headerTags.push({tag: line.tag, value: line.value});
            } else {
                currentTags.push({tag: line.tag, value: line.value});
            }
        }
    }

    // Flush final stanza
    yield* flushStanza();
}

function* buildAndYieldStanza(
    stanzaType: string,
    tags: OboTagValue[]
): Generator<OboStanza> {
    switch (stanzaType) {
        case 'Term':
            yield {type: 'term', term: buildTerm(tags)};
            break;
        case 'Typedef':
            yield {type: 'typedef', typedef: buildTypedef(tags)};
            break;
        case 'Instance':
            yield {type: 'instance', instance: buildInstance(tags)};
            break;
    }
}

/**
 * Convert a ReadableStream to an AsyncIterable if needed.
 */
function toAsyncIterable(input: StreamInput): AsyncIterable<string | Uint8Array> {
    // Both AsyncIterable and modern ReadableStream have Symbol.asyncIterator
    if (Symbol.asyncIterator in (input as object)) {
        return input as AsyncIterable<string | Uint8Array>;
    }

    // Fallback for older ReadableStream implementations without Symbol.asyncIterator
    const stream = input as ReadableStream<string | Uint8Array>;
    const reader = stream.getReader();
    return {
        [Symbol.asyncIterator]() {
            return {
                async next() {
                    const {done, value} = await reader.read();
                    if (done) { return {done: true as const, value: undefined}; }
                    return {done: false as const, value};
                },
                return() {
                    reader.releaseLock();
                    return Promise.resolve({done: true as const, value: undefined});
                }
            };
        }
    };
}

/**
 * Split an async iterable of chunks into individual lines.
 * Handles chunks that split in the middle of lines and both LF and CRLF.
 */
async function* splitLines(
    chunks: AsyncIterable<string | Uint8Array>
): AsyncGenerator<string> {
    const decoder = new TextDecoder();
    let buffer = '';

    for await (const chunk of chunks) {
        const text =
            typeof chunk === 'string' ? chunk : decoder.decode(chunk, {stream: true});
        buffer += text;

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            if (line.endsWith('\r')) {
                line = line.slice(0, -1);
            }
            yield line;
            buffer = buffer.slice(newlineIdx + 1);
        }
    }

    // Flush remaining content
    if (buffer.length > 0) {
        if (buffer.endsWith('\r')) {
            buffer = buffer.slice(0, -1);
        }
        yield buffer;
    }
}
