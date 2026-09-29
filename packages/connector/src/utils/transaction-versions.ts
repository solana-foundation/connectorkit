/**
 * Transaction Version Negotiation
 *
 * Permissive readers for the wallet-standard `supportedTransactionVersions`
 * field. Wallet-standard types the field `'legacy' | 0 | 1` (v1 landed in
 * `@solana/wallet-standard-features` 1.5), but wallets in the wild may be
 * built against older or newer typings, so these helpers read the field
 * structurally and tolerate values the installed types don't know about.
 */

import type { Wallet } from '@wallet-standard/base';
import type { SolanaTransactionVersionLike } from '../types/transactions';

/**
 * A signing feature that can declare `supportedTransactionVersions`.
 *
 * `solana:signAndSendAllTransactions`, `solana:signAndSendTransaction` and
 * `solana:signTransaction` are the wallet-standard features that carry the
 * field. `solana:signAllTransactions` is not part of wallet-standard: it is
 * the connector's own batch-signing feature, registered by its WalletConnect
 * and remote wallets, which declare versions on it the same way.
 */
export type SolanaSignFeatureName =
    | 'solana:signAllTransactions'
    | 'solana:signAndSendAllTransactions'
    | 'solana:signAndSendTransaction'
    | 'solana:signTransaction';

const SIGN_FEATURES: readonly SolanaSignFeatureName[] = [
    'solana:signAllTransactions',
    'solana:signAndSendAllTransactions',
    'solana:signAndSendTransaction',
    'solana:signTransaction',
];

function readFeatureVersions(feature: unknown): readonly SolanaTransactionVersionLike[] | undefined {
    if (!feature || typeof feature !== 'object') return undefined;
    const versions = (feature as { supportedTransactionVersions?: unknown }).supportedTransactionVersions;
    if (!Array.isArray(versions)) return undefined;
    return versions.filter((v): v is SolanaTransactionVersionLike => v === 'legacy' || typeof v === 'number');
}

/**
 * Collect the transaction versions a wallet advertises for signing.
 *
 * Each signing operation declares its own support, and they can differ (e.g.
 * `solana:signAndSendTransaction` may accept v1 while `solana:signTransaction`
 * does not), so pass the feature you are about to invoke to read only its
 * declaration. Without a feature, the union across all sign features is
 * returned — useful for "does this wallet support the version at all", not
 * for gating a specific operation.
 *
 * @param wallet - The wallet whose features to inspect
 * @param feature - Restrict the read to a single signing feature's declaration
 * @returns The declared versions, or `undefined` when the relevant feature(s)
 *          declare no `supportedTransactionVersions` field at all.
 */
export function getWalletSupportedTransactionVersions(
    wallet: Pick<Wallet, 'features'>,
    feature?: SolanaSignFeatureName,
): readonly SolanaTransactionVersionLike[] | undefined {
    const features = wallet.features as Record<string, unknown>;

    if (feature) {
        return readFeatureVersions(features[feature]);
    }

    let declared = false;
    const union = new Set<SolanaTransactionVersionLike>();

    for (const featureName of SIGN_FEATURES) {
        const versions = readFeatureVersions(features[featureName]);
        if (!versions) continue;
        declared = true;
        for (const version of versions) union.add(version);
    }

    return declared ? [...union] : undefined;
}

/**
 * Whether a wallet can sign transactions of the given version.
 *
 * Pass the signing feature you intend to invoke: version support is declared
 * per operation, and gating on another operation's declaration can enable a
 * flow the wallet will reject. Without a feature, the check answers whether
 * *any* signing operation supports the version.
 *
 * Wallets (or features) that declare `supportedTransactionVersions` are taken
 * at their word. Those that don't are assumed to handle legacy and version 0
 * only — the universally supported baseline — so v1 (SIMD-0296) requires an
 * explicit declaration.
 *
 * @example
 * ```ts
 * if (walletSupportsTransactionVersion(wallet, 1, 'solana:signTransaction')) {
 *     // safe to send this wallet a v1 transaction for standalone signing
 * }
 * ```
 */
export function walletSupportsTransactionVersion(
    wallet: Pick<Wallet, 'features'>,
    version: SolanaTransactionVersionLike,
    feature?: SolanaSignFeatureName,
): boolean {
    const declared = getWalletSupportedTransactionVersions(wallet, feature);
    if (declared === undefined) {
        return version === 'legacy' || version === 0;
    }
    return declared.includes(version);
}
