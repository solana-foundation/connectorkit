import {
    compileOffchainMessageV1Envelope,
    createKeyPairFromPrivateKeyBytes,
    getAddressDecoder,
    getAddressFromPublicKey,
    getTransactionDecoder,
    getTransactionEncoder,
    partiallySignTransaction,
    signBytes,
} from '@solana/kit';
import {
    SolanaSignMessage,
    SolanaSignOffchainMessage,
    SolanaSignTransaction,
    type SolanaSignMessageInput,
    type SolanaSignMessageOutput,
    type SolanaSignOffchainMessageInput,
    type SolanaSignOffchainMessageOutput,
    type SolanaSignTransactionInput,
    type SolanaSignTransactionOutput,
} from '@solana/wallet-standard-features';
import type { IdentifierArray, Wallet, WalletAccount, WalletIcon } from '@wallet-standard/base';
import {
    StandardConnect,
    StandardDisconnect,
    StandardEvents,
    type StandardEventsListeners,
    type StandardEventsOnMethod,
} from '@wallet-standard/features';
import { registerWallet } from '@wallet-standard/wallet';

const STORAGE_KEY = 'connectorkit-playground:burner-secret';

const CHAINS: IdentifierArray = ['solana:mainnet', 'solana:devnet', 'solana:testnet'];

const ACCOUNT_FEATURES: IdentifierArray = [SolanaSignTransaction, SolanaSignMessage, SolanaSignOffchainMessage];

const ICON: WalletIcon = `data:image/svg+xml;base64,${btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#f97316"/><path d="M16 6c2.5 4.2 6 5.9 6 10a6 6 0 1 1-12 0c0-4.1 3.5-5.8 6-10Z" fill="#fff7ed"/></svg>',
)}`;

/**
 * Reads the persisted 32-byte private seed, minting and storing a fresh one the
 * first time. The seed lives in localStorage in the clear — this wallet exists
 * so playground features (like off-chain message signing) can be exercised
 * without a compatible browser extension, and it must never hold anything of value.
 */
function loadOrCreateSeed(): Uint8Array {
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const bytes = Uint8Array.from(JSON.parse(stored) as number[]);
            if (bytes.length === 32) {
                return bytes;
            }
        }
    } catch {
        // Storage may be unavailable (private browsing, partitioned iframes) or the
        // entry unreadable; fall through and mint a seed, persisting it if we can.
    }
    const seed = crypto.getRandomValues(new Uint8Array(32));
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seed)));
    } catch {
        // Ephemeral seed: the burner still works for this page load.
    }
    return seed;
}

function loadKeyPair(): Promise<CryptoKeyPair> {
    return createKeyPairFromPrivateKeyBytes(loadOrCreateSeed());
}

class BurnerWalletAccount implements WalletAccount {
    readonly address: string;
    readonly chains = CHAINS;
    readonly features = ACCOUNT_FEATURES;
    readonly label = 'Burner account';
    readonly publicKey: Uint8Array;

    constructor(address: string, publicKey: Uint8Array) {
        this.address = address;
        this.publicKey = publicKey;
    }
}

/**
 * A wallet-standard wallet whose key is a throwaway keypair in localStorage.
 *
 * Registering a real wallet-standard wallet keeps every flow on one code path:
 * the connector discovers it like any extension, and features that few
 * extensions ship yet — `solana:signOffchainMessage` in particular — can be
 * tested end to end.
 */
class BurnerWallet implements Wallet {
    readonly version = '1.0.0' as const;
    readonly name = 'Unsafe Burner Wallet';
    readonly icon = ICON;
    readonly chains = CHAINS;

    #account: BurnerWalletAccount | null = null;
    #keyPair: CryptoKeyPair | null = null;
    #listeners: StandardEventsListeners['change'][] = [];

    get accounts(): readonly WalletAccount[] {
        return this.#account ? [this.#account] : [];
    }

    #emitChange() {
        for (const listener of this.#listeners) {
            listener({ accounts: this.accounts });
        }
    }

    #on: StandardEventsOnMethod = (event, listener) => {
        if (event !== 'change') {
            return () => {};
        }
        this.#listeners.push(listener);
        return () => {
            this.#listeners = this.#listeners.filter(existing => existing !== listener);
        };
    };

    #connect = async (): Promise<{ accounts: readonly WalletAccount[] }> => {
        if (!this.#account) {
            this.#keyPair = await loadKeyPair();
            const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', this.#keyPair.publicKey));
            this.#account = new BurnerWalletAccount(await getAddressFromPublicKey(this.#keyPair.publicKey), publicKey);
            this.#emitChange();
        }
        return { accounts: this.accounts };
    };

    #disconnect = (): Promise<void> => {
        this.#account = null;
        this.#keyPair = null;
        this.#emitChange();
        return Promise.resolve();
    };

    #requireKeyPair(): CryptoKeyPair {
        if (!this.#keyPair) {
            throw new Error('Burner wallet is not connected');
        }
        return this.#keyPair;
    }

    #signTransaction = async (
        ...inputs: readonly SolanaSignTransactionInput[]
    ): Promise<readonly SolanaSignTransactionOutput[]> => {
        const keyPair = this.#requireKeyPair();
        const decoder = getTransactionDecoder();
        const encoder = getTransactionEncoder();
        return await Promise.all(
            inputs.map(async ({ transaction }) => {
                const signed = await partiallySignTransaction([keyPair], decoder.decode(transaction));
                return { signedTransaction: new Uint8Array(encoder.encode(signed)) };
            }),
        );
    };

    #signMessage = async (
        ...inputs: readonly SolanaSignMessageInput[]
    ): Promise<readonly SolanaSignMessageOutput[]> => {
        const keyPair = this.#requireKeyPair();
        return await Promise.all(
            inputs.map(async ({ message }) => ({
                signature: new Uint8Array(await signBytes(keyPair.privateKey, message)),
                signedMessage: message,
            })),
        );
    };

    #signOffchainMessage = async (
        ...inputs: readonly SolanaSignOffchainMessageInput[]
    ): Promise<readonly SolanaSignOffchainMessageOutput[]> => {
        const keyPair = this.#requireKeyPair();
        const ownAddress = this.#account?.address;
        if (!ownAddress) {
            throw new Error('Burner wallet is not connected');
        }
        const addressDecoder = getAddressDecoder();
        return await Promise.all(
            inputs.map(async ({ message, messageVersion, requiredSigners }) => {
                if (messageVersion !== 1) {
                    throw new Error(`Unsupported off-chain message version: ${messageVersion}`);
                }
                const requiredSignatories = requiredSigners.map(publicKey => ({
                    address: addressDecoder.decode(publicKey),
                }));
                if (!requiredSignatories.some(({ address }) => address === ownAddress)) {
                    throw new Error('requiredSigners must include the signing account');
                }
                const envelope = compileOffchainMessageV1Envelope({
                    content: message,
                    requiredSignatories,
                    version: 1,
                });
                const signature = new Uint8Array(await signBytes(keyPair.privateKey, envelope.content));
                return { signedOffchainMessage: envelope.content, signature };
            }),
        );
    };

    // Declared after the handlers above so class-field initialization order holds.
    // A stable object (rather than a getter) keeps `wallet.features` identity-comparable.
    readonly features = {
        [SolanaSignMessage]: { signMessage: this.#signMessage, version: '1.0.0' as const },
        [SolanaSignOffchainMessage]: {
            signOffchainMessage: this.#signOffchainMessage,
            supportedMessageVersions: [1] as const,
            version: '1.0.0' as const,
        },
        [SolanaSignTransaction]: {
            signTransaction: this.#signTransaction,
            supportedTransactionVersions: ['legacy', 0] as const,
            version: '1.0.0' as const,
        },
        [StandardConnect]: { connect: this.#connect, version: '1.0.0' as const },
        [StandardDisconnect]: { disconnect: this.#disconnect, version: '1.0.0' as const },
        [StandardEvents]: { on: this.#on, version: '1.0.0' as const },
    };
}

let registered = false;

/**
 * Registers the burner wallet with wallet-standard so it shows up alongside any
 * installed extensions. Idempotent, because React strict mode mounts effects
 * twice in development.
 */
export function registerBurnerWallet(): void {
    if (registered || typeof window === 'undefined') {
        return;
    }
    registered = true;
    registerWallet(new BurnerWallet());
}

/** Forgets the persisted burner key, so the next connection mints a new one. */
export function resetBurnerWallet(): void {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.removeItem(STORAGE_KEY);
    } catch {
        // Storage unavailable; nothing to forget.
    }
}
