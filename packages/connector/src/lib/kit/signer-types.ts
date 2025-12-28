/**
 * @solana/connector - Kit Signer Types
 *
 * Re-exports of Kit signer types from @solana/signers and related packages.
 * These types enable framework-agnostic Kit integration.
 */

// Import from actual @solana/signers package
import type {
    MessageModifyingSigner,
    TransactionSendingSigner,
    SignableMessage,
    MessageModifyingSignerConfig,
    TransactionSendingSignerConfig,
    SignatureDictionary,
} from '@solana/signers';

import type { Address } from '@solana/addresses';
import type { SignatureBytes } from '@solana/keys';
import type { Transaction } from '@solana/transactions';

// Re-export for convenience
export type {
    MessageModifyingSigner,
    TransactionSendingSigner,
    SignableMessage,
    MessageModifyingSignerConfig,
    TransactionSendingSignerConfig,
    Address,
    SignatureBytes,
    Transaction,
    SignatureDictionary,
};

// Re-export utility function
export { createSignableMessage } from '@solana/signers';
