/**
 * Compile-time assertions for the transaction signer's validated-bytes brand.
 *
 * Type-checked by `pnpm type-check` (tsc --noEmit); not a vitest test and not
 * a tsup entry. Each `@ts-expect-error` line must fail to compile; if the
 * guarantee regresses the directive becomes unused and `tsc` reports it.
 */

import type { WalletAccount } from '../../types/wallets';
import type { SigningFeatures, ValidatedWireTransaction } from './transaction-signer';

declare const features: Required<SigningFeatures>;
declare const account: WalletAccount;
declare const raw: Uint8Array;
declare const validated: ValidatedWireTransaction;

// @ts-expect-error raw bytes have not been validated
const fabricated: ValidatedWireTransaction = new Uint8Array(5);
void fabricated;

// @ts-expect-error signTransaction only accepts validated bytes (array form)
void features['solana:signTransaction'].signTransaction({ account, transactions: [raw] });

// @ts-expect-error signTransaction only accepts validated bytes (singular form)
void features['solana:signTransaction'].signTransaction({ account, transaction: raw });

// @ts-expect-error signAllTransactions only accepts validated bytes
void features['solana:signAllTransactions'].signAllTransactions({ account, transactions: [raw] });

// @ts-expect-error signAndSendTransaction only accepts validated bytes
void features['solana:signAndSendTransaction'].signAndSendTransaction({ account, transactions: [raw] });

// Positive: validated bytes are accepted everywhere, and are still a Uint8Array
void features['solana:signTransaction'].signTransaction({ account, transactions: [validated], chain: 'solana:devnet' });
void features['solana:signAllTransactions'].signAllTransactions({ account, transactions: [validated] });
void features['solana:signAndSendTransaction'].signAndSendTransaction({
    account,
    transaction: validated,
    options: { skipPreflight: true },
});
const plain: Uint8Array = validated;
void plain;

// Positive: messages are not transactions and take raw bytes
void features['solana:signMessage'].signMessage({ account, message: raw });
