/**
 * @solana/connector/server - Authorization and policy evidence
 *
 * The route handlers never call a signer directly. Signing requires an
 * `Approved<…>` value, which only `runPolicy` produces, and `runPolicy`
 * requires an `Authorized<P>` value, which only `authenticate` produces.
 * A handler that skips either step does not compile.
 *
 * The brands are phantom `unique symbol` slots: they exist only in the type
 * system and are erased from the emitted JavaScript.
 */

import type { RemoteSigner } from './route-handlers';
import { timingSafeEqualString } from './constant-time';

// ============================================================================
// Public types
// ============================================================================

/**
 * Result of an authorization callback.
 *
 * - `true`: authorized; policy hooks see `principal: undefined`
 * - `{ principal }`: authorized as `principal`; policy hooks receive it
 * - `false`, `null`, `undefined`: rejected with 401
 */
export type AuthorizeResult<P> = boolean | { principal: P } | null | undefined;

/**
 * Authorization callback.
 *
 * Return `{ principal }` to identify the caller to policy hooks, or a plain
 * boolean to allow/reject without identity.
 */
export type AuthorizeCallback<P = unknown> = (request: Request) => AuthorizeResult<P> | Promise<AuthorizeResult<P>>;

/**
 * Operation a policy hook is evaluating
 */
export type SigningOperation = 'signTransaction' | 'signAllTransactions' | 'signAndSendTransaction' | 'signMessage';

/**
 * Context passed to policy hooks as the third argument
 */
export interface PolicyContext<P = unknown> {
    /** Principal returned by `authorize`, or `undefined` when it returned a boolean */
    readonly principal: P;
    /** The incoming request */
    readonly request: Request;
    /** Operation being evaluated */
    readonly operation: SigningOperation;
    /** Position within a `signAllTransactions` batch (absent otherwise) */
    readonly index?: number;
    /** Size of the `signAllTransactions` batch (absent otherwise) */
    readonly total?: number;
}

/**
 * Policy validation callbacks
 *
 * Hooks taking only `(bytes, request)` keep working; the `context` argument
 * is optional to consume.
 */
export interface PolicyHooks<P = unknown> {
    /** Validate a transaction before signing (return false to reject) */
    validateTransaction?: (
        transactionBytes: Uint8Array,
        request: Request,
        context: PolicyContext<P>,
    ) => Promise<boolean> | boolean;
    /** Validate a message before signing (return false to reject) */
    validateMessage?: (
        messageBytes: Uint8Array,
        request: Request,
        context: PolicyContext<P>,
    ) => Promise<boolean> | boolean;
}

// ============================================================================
// Evidence types (internal)
// ============================================================================

declare const AUTHORIZED: unique symbol;
declare const APPROVED: unique symbol;

/**
 * Evidence that `authorize` accepted `request`. Only `authenticate` produces it.
 */
export interface Authorized<P> {
    readonly [AUTHORIZED]: true;
    readonly principal: P;
    readonly request: Request;
}

/**
 * Evidence that the policy hooks approved `bytes` for `operation`.
 * Only `runPolicy` produces it.
 */
export interface Approved<K extends SigningOperation, T extends Uint8Array | Uint8Array[]> {
    readonly [APPROVED]: true;
    readonly operation: K;
    readonly bytes: T;
}

export type ApprovedTransaction = Approved<'signTransaction' | 'signAndSendTransaction', Uint8Array>;
export type ApprovedTransactions = Approved<'signAllTransactions', Uint8Array[]>;
export type ApprovedMessage = Approved<'signMessage', Uint8Array>;

export type PolicyOutcome<A> =
    { readonly ok: true; readonly approved: A } | { readonly ok: false; readonly reason: string };

export type PolicyInput =
    | { operation: 'signTransaction' | 'signAndSendTransaction'; bytes: Uint8Array }
    | { operation: 'signAllTransactions'; bytes: Uint8Array[] }
    | { operation: 'signMessage'; bytes: Uint8Array };

// ============================================================================
// Producers
// ============================================================================

/**
 * Run the authorization callback. The only producer of `Authorized<P>`.
 *
 * @returns evidence on success, `null` when the caller must respond 401
 */
export async function authenticate<P>(
    authorize: AuthorizeCallback<P>,
    request: Request,
): Promise<Authorized<P> | null> {
    const result = await authorize(request);

    if (result === true) {
        return { principal: undefined as P, request } as Authorized<P>;
    }

    if (typeof result === 'object' && result !== null && 'principal' in result) {
        return { principal: result.principal, request } as Authorized<P>;
    }

    return null;
}

/**
 * Run the policy hooks for an operation. The only producer of `Approved<…>`.
 *
 * Requires `Authorized<P>` so authorization cannot be skipped. Hook exceptions
 * are not caught; they propagate to the handler's outer error handling.
 */
export async function runPolicy<P, const I extends PolicyInput>(
    auth: Authorized<P>,
    hooks: PolicyHooks<P> | undefined,
    input: I,
): Promise<PolicyOutcome<Approved<I['operation'], I['bytes']>>> {
    const approve = (): PolicyOutcome<Approved<I['operation'], I['bytes']>> => ({
        ok: true,
        approved: { operation: input.operation, bytes: input.bytes } as Approved<I['operation'], I['bytes']>,
    });

    const context = (extra?: { index: number; total: number }): PolicyContext<P> => ({
        principal: auth.principal,
        request: auth.request,
        operation: input.operation,
        ...extra,
    });

    switch (input.operation) {
        case 'signMessage': {
            if (hooks?.validateMessage) {
                const allowed = await hooks.validateMessage(input.bytes, auth.request, context());
                if (!allowed) {
                    return { ok: false, reason: 'Message rejected by policy' };
                }
            }
            return approve();
        }

        case 'signAllTransactions': {
            if (hooks?.validateTransaction) {
                const total = input.bytes.length;
                for (let index = 0; index < total; index++) {
                    const allowed = await hooks.validateTransaction(
                        input.bytes[index],
                        auth.request,
                        context({ index, total }),
                    );
                    if (!allowed) {
                        return { ok: false, reason: 'Transaction rejected by policy' };
                    }
                }
            }
            return approve();
        }

        case 'signTransaction':
        case 'signAndSendTransaction': {
            if (hooks?.validateTransaction) {
                const allowed = await hooks.validateTransaction(input.bytes, auth.request, context());
                if (!allowed) {
                    return { ok: false, reason: 'Transaction rejected by policy' };
                }
            }
            return approve();
        }
    }
}

// ============================================================================
// Guarded signer
// ============================================================================

/**
 * A signer whose methods accept only policy-approved evidence.
 *
 * Members are function-typed properties (not methods) so a raw `RemoteSigner`
 * is not structurally assignable in either direction.
 */
export interface GuardedSigner {
    readonly address: string;
    readonly signTransaction: (approved: ApprovedTransaction) => Promise<Uint8Array>;
    readonly signAllTransactions: (approved: ApprovedTransactions) => Promise<Uint8Array[]>;
    readonly signMessage: (approved: ApprovedMessage) => Promise<Uint8Array>;
    readonly isAvailable: () => Promise<boolean>;
}

/**
 * Wrap a provider signer so it can only be driven with `Approved<…>` evidence.
 */
export function guardSigner(signer: RemoteSigner): GuardedSigner {
    return {
        get address() {
            return signer.address;
        },
        signTransaction: approved => signer.signTransaction(approved.bytes),
        signAllTransactions: approved => signer.signAllTransactions(approved.bytes),
        signMessage: approved => signer.signMessage(approved.bytes),
        isAvailable: () => signer.isAvailable(),
    };
}

// ============================================================================
// Default authorization
// ============================================================================

function getEnv(name: string): string | undefined {
    return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
}

/**
 * Default authorization: compare the Authorization header against the
 * CONNECTOR_SIGNER_TOKEN env var using a constant-time comparison.
 */
export function defaultAuthorize(request: Request): boolean {
    const token = getEnv('CONNECTOR_SIGNER_TOKEN');
    if (!token) {
        // No token configured = reject all (safe default)
        console.warn('[connector/server] CONNECTOR_SIGNER_TOKEN not set - rejecting all requests');
        return false;
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return false;
    }

    // Support "Bearer <token>" format
    const parts = authHeader.split(' ');
    const providedToken = parts.length === 2 && parts[0].toLowerCase() === 'bearer' ? parts[1] : authHeader;

    return timingSafeEqualString(providedToken, token);
}
