/**
 * @solana/connector/server - Constant-time comparison
 *
 * Runtime-neutral (no `node:crypto`): the server entry is built with
 * `platform: 'neutral'` and must work anywhere `TextEncoder` exists.
 */

/**
 * Compare two strings without short-circuiting on the first mismatch.
 *
 * Both inputs are UTF-8 encoded and XOR-accumulated over the longer length,
 * with the length difference folded in, so the running time depends only on
 * the longer input and not on where (or whether) the strings differ.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const aBytes = encoder.encode(a);
    const bBytes = encoder.encode(b);
    const length = Math.max(aBytes.length, bBytes.length);

    let diff = aBytes.length ^ bBytes.length;
    for (let i = 0; i < length; i++) {
        diff |= (i < aBytes.length ? aBytes[i] : 0) ^ (i < bBytes.length ? bBytes[i] : 0);
    }

    return diff === 0;
}
