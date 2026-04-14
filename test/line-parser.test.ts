import {describe, it, expect} from 'vitest';
import {parseLines, stripTrailingComment} from '../src/parser/line-parser.js';

describe('stripTrailingComment', () => {
    it('strips a trailing comment', () => {
        expect(stripTrailingComment('PO:0009025 ! vascular leaf')).toBe('PO:0009025');
    });

    it('returns the value unchanged when there is no comment', () => {
        expect(stripTrailingComment('PO:0009025')).toBe('PO:0009025');
    });

    it('does not strip ! inside a quoted string', () => {
        expect(stripTrailingComment('"A leaf with ! inside" [REF:1]')).toBe(
            '"A leaf with ! inside" [REF:1]'
        );
    });

    it('strips comment after a quoted string', () => {
        expect(stripTrailingComment('"some text" [REF:1] ! a comment')).toBe(
            '"some text" [REF:1]'
        );
    });

    it('handles escaped quotes inside a quoted string', () => {
        expect(stripTrailingComment('"text with \\" escaped" ! comment')).toBe(
            '"text with \\" escaped"'
        );
    });

    it('handles empty string', () => {
        expect(stripTrailingComment('')).toBe('');
    });
});

describe('parseLines', () => {
    it('parses a simple tag-value line', () => {
        const result = parseLines('id: PO:0009025');
        expect(result).toEqual([{type: 'tag', tag: 'id', value: 'PO:0009025'}]);
    });

    it('parses multiple tag-value lines', () => {
        const result = parseLines('id: PO:0009025\nname: vascular leaf');
        expect(result).toEqual([
            {type: 'tag', tag: 'id', value: 'PO:0009025'},
            {type: 'tag', tag: 'name', value: 'vascular leaf'}
        ]);
    });

    it('strips trailing comments from tag values', () => {
        const result = parseLines('is_a: PO:0025034 ! leaf');
        expect(result).toEqual([{type: 'tag', tag: 'is_a', value: 'PO:0025034'}]);
    });

    it('detects stanza headers', () => {
        const result = parseLines('[Term]\nid: PO:0009025\n\n[Typedef]\nid: part_of');
        expect(result).toEqual([
            {type: 'stanza-header', stanzaType: 'Term'},
            {type: 'tag', tag: 'id', value: 'PO:0009025'},
            {type: 'blank'},
            {type: 'stanza-header', stanzaType: 'Typedef'},
            {type: 'tag', tag: 'id', value: 'part_of'}
        ]);
    });

    it('detects blank lines', () => {
        const result = parseLines('id: test\n\nname: foo');
        expect(result).toEqual([
            {type: 'tag', tag: 'id', value: 'test'},
            {type: 'blank'},
            {type: 'tag', tag: 'name', value: 'foo'}
        ]);
    });

    it('skips full-line comments', () => {
        const result = parseLines('! This is a comment\nid: PO:0009025');
        expect(result).toEqual([{type: 'tag', tag: 'id', value: 'PO:0009025'}]);
    });

    it('joins continuation lines', () => {
        const result = parseLines(
            'def: "A very long definition\n  that continues here" [REF:1]'
        );
        expect(result).toEqual([
            {
                type: 'tag',
                tag: 'def',
                value: '"A very long definition that continues here" [REF:1]'
            }
        ]);
    });

    it('handles multiple continuation lines', () => {
        const result = parseLines('def: "Line one\n  line two\n  line three" []');
        expect(result).toEqual([
            {type: 'tag', tag: 'def', value: '"Line one line two line three" []'}
        ]);
    });

    it('handles values with colons (only first colon splits)', () => {
        const result = parseLines('xref: http://example.com/foo:bar');
        expect(result).toEqual([
            {type: 'tag', tag: 'xref', value: 'http://example.com/foo:bar'}
        ]);
    });

    it('handles header tags before any stanza', () => {
        const input = [
            'format-version: 1.2',
            'ontology: po',
            '',
            '[Term]',
            'id: PO:0009025'
        ].join('\n');
        const result = parseLines(input);
        expect(result).toEqual([
            {type: 'tag', tag: 'format-version', value: '1.2'},
            {type: 'tag', tag: 'ontology', value: 'po'},
            {type: 'blank'},
            {type: 'stanza-header', stanzaType: 'Term'},
            {type: 'tag', tag: 'id', value: 'PO:0009025'}
        ]);
    });

    it('handles Windows-style line endings (CRLF)', () => {
        const result = parseLines('id: test\r\nname: foo\r\n');
        expect(result).toEqual([
            {type: 'tag', tag: 'id', value: 'test'},
            {type: 'tag', tag: 'name', value: 'foo'},
            {type: 'blank'}
        ]);
    });

    it('handles Instance stanza headers', () => {
        const result = parseLines('[Instance]\nid: inst001');
        expect(result).toEqual([
            {type: 'stanza-header', stanzaType: 'Instance'},
            {type: 'tag', tag: 'id', value: 'inst001'}
        ]);
    });

    it('handles tag with empty value', () => {
        const result = parseLines('comment: ');
        expect(result).toEqual([{type: 'tag', tag: 'comment', value: ''}]);
    });

    it('skips unrecognized lines (no colon, not a stanza header)', () => {
        const result = parseLines('id: TEST:0001\ngarbage line without colon\nname: foo');
        expect(result).toEqual([
            {type: 'tag', tag: 'id', value: 'TEST:0001'},
            {type: 'tag', tag: 'name', value: 'foo'}
        ]);
    });

    it('flushes pending tag before skipping unrecognized line', () => {
        const result = parseLines('id: TEST:0001\nno-colon-line\nname: foo');
        // The pending 'id' tag should be flushed before the unrecognized line
        expect(result[0]).toEqual({type: 'tag', tag: 'id', value: 'TEST:0001'});
        expect(result[1]).toEqual({type: 'tag', tag: 'name', value: 'foo'});
    });
});
