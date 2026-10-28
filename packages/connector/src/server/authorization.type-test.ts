/**
 * Compile-time assertions for the server authorization evidence types.
 *
 * This file is type-checked by `pnpm type-check` (tsc --noEmit) but is not a
 * vitest test and is not a tsup entry, so it never runs or ships. Each
 * `@ts-expect-error` line must fail to compile; if a guarantee regresses the
 * directive becomes unused and `tsc` reports it.
 */

import type { RemoteSigner } from './route-handlers';
import { createRemoteSignerRouteHandlers } from './route-handlers';
import { runPolicy } from './authorization';
import type {
    ApprovedMessage,
    ApprovedTransaction,
    ApprovedTransactions,
    Authorized,
    GuardedSigner,
    PolicyContext,
} from './authorization';

declare const raw: RemoteSigner;
declare const guarded: GuardedSigner;
declare const bytes: Uint8Array;
declare const request: Request;
declare const approvedMessage: ApprovedMessage;
declare const approvedTransaction: ApprovedTransaction;
declare const approvedTransactions: ApprovedTransactions;
declare const authorized: Authorized<unknown>;

// ---------------------------------------------------------------------------
// Signing requires policy-approved evidence
// ---------------------------------------------------------------------------

// @ts-expect-error raw bytes are not policy-approved evidence
void guarded.signTransaction(bytes);

// @ts-expect-error raw bytes are not policy-approved evidence
void guarded.signMessage(bytes);

// @ts-expect-error a raw array is not policy-approved evidence
void guarded.signAllTransactions([bytes]);

// @ts-expect-error evidence cannot be fabricated structurally (brand missing)
const fabricated: ApprovedTransaction = { operation: 'signTransaction', bytes };
void fabricated;

// @ts-expect-error message evidence cannot sign a transaction
void guarded.signTransaction(approvedMessage);

// @ts-expect-error single-transaction evidence cannot drive a batch
void guarded.signAllTransactions(approvedTransaction);

// @ts-expect-error a RemoteSigner is not a GuardedSigner
const unguarded: GuardedSigner = raw;
void unguarded;

// Positive: the right evidence for each operation compiles
void guarded.signTransaction(approvedTransaction);
void guarded.signAllTransactions(approvedTransactions);
void guarded.signMessage(approvedMessage);

// ---------------------------------------------------------------------------
// Policy requires authorization evidence
// ---------------------------------------------------------------------------

// @ts-expect-error runPolicy requires Authorized<P>; a bare Request is not enough
void runPolicy(request, undefined, { operation: 'signTransaction', bytes });

// @ts-expect-error a principal alone is not authorization evidence
void runPolicy({ principal: 'user', request }, undefined, { operation: 'signTransaction', bytes });

// Positive: the outcome carries evidence matching the requested operation
void (async () => {
    const outcome = await runPolicy(authorized, undefined, { operation: 'signAllTransactions', bytes: [bytes] });
    if (outcome.ok) {
        void guarded.signAllTransactions(outcome.approved);
        // @ts-expect-error batch evidence cannot sign a single transaction
        void guarded.signTransaction(outcome.approved);
    }
})();

// ---------------------------------------------------------------------------
// Principal inference through the factory
// ---------------------------------------------------------------------------

// Positive: principal inferred from authorize; the hook narrows before use
createRemoteSignerRouteHandlers({
    provider: { type: 'custom', signer: raw },
    authorize: async req => (req.headers.get('x-user') ? { principal: { userId: 'u' } } : false),
    policy: {
        validateTransaction: (_bytes, _request, context) =>
            context.principal !== undefined && context.principal.userId.length > 0,
    },
});

// Negative: the principal may be undefined (authorize can return `true`, and the
// default token check does), so it cannot be dereferenced without narrowing
createRemoteSignerRouteHandlers<{ userId: string }>({
    provider: { type: 'custom', signer: raw },
    authorize: () => true,
    policy: {
        // @ts-expect-error principal is possibly undefined
        validateTransaction: (_bytes, _request, context) => context.principal.userId.length > 0,
    },
});

// Negative: same with the default token check and an explicit principal type
createRemoteSignerRouteHandlers<{ userId: string }>({
    provider: { type: 'custom', signer: raw },
    policy: {
        // @ts-expect-error principal is possibly undefined
        validateMessage: (_bytes, _request, context) => context.principal.userId.length > 0,
    },
});

// Positive: legacy shapes still compile (boolean authorize, 2-arg hooks)
createRemoteSignerRouteHandlers({
    provider: { type: 'custom', signer: raw },
    authorize: () => true,
    policy: {
        validateTransaction: (_bytes, _request) => true,
        validateMessage: async (_bytes: Uint8Array, _request: Request) => true,
    },
});

// Positive: no authorize at all (default token check)
createRemoteSignerRouteHandlers({ provider: { type: 'custom', signer: raw } });

// Negative: an annotated context cannot smuggle a principal type past a boolean authorize
createRemoteSignerRouteHandlers({
    provider: { type: 'custom', signer: raw },
    authorize: () => true,
    policy: {
        // @ts-expect-error principal is unknown when authorize returns a boolean
        validateTransaction: (_bytes: Uint8Array, _request: Request, context: PolicyContext<{ userId: string }>) =>
            context.principal?.userId !== undefined,
    },
});
