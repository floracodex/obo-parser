/**
 * Error thrown when the parser encounters invalid or malformed OBO content.
 */
export class OboParseError extends Error {
    /** The tag being parsed when the error occurred, if applicable. */
    readonly tag: string | null;

    /** The raw value string that failed to parse, if applicable. */
    readonly rawValue: string | null;

    constructor(message: string, tag?: string, rawValue?: string) {
        super(message);
        this.name = 'OboParseError';
        this.tag = tag ?? null;
        this.rawValue = rawValue ?? null;
    }
}
