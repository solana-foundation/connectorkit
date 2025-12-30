import type { Wallet } from '../../types/wallets';

/**
 * Wallet icon overrides
 *
 * Goal: Replace inconsistent Wallet Standard icons with a uniform set.
 *
 * Notes:
 * - Keep these SVGs **SVGO-optimized**. Large inline SVG strings will increase bundle size.
 * - Prefer a single-line, minified SVG (no whitespace) before pasting here.
 * - If these ever grow beyond a handful, we should move to a separate optional package + dynamic import.
 */

// Placeholder uniform icons (swap these with your actual SVGO-minified SVGs).
// Wallet Standard's `WalletIcon` type expects base64 data URIs.
// Keeping placeholders tiny prevents bundle size regressions while we wire the feature.
const PHANTOM_ICON: Wallet['icon'] =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIxMiIgZmlsbD0iIzk3ODZFNCIvPjxnIGNsaXAtcGF0aD0idXJsKCNjbGlwMF80NF82MTApIj48cGF0aCBkPSJNNS43NjU1IDE1Ljc5N0M1Ljc2NTUgMTcuMjIyIDYuNDk4NzkgMTcuNTUgNy4yNjE0MSAxNy41NUM4Ljg3NDYzIDE3LjU1IDEwLjA4NyAxNi4wODQxIDEwLjgxMDUgMTQuOTI1NkMxMC43MjI1IDE1LjE4MTkgMTAuNjczNiAxNS40MzgyIDEwLjY3MzYgMTUuNjg0MkMxMC42NzM2IDE2LjM2MDkgMTEuMDQ1MiAxNi44NDI3IDExLjc3ODUgMTYuODQyN0MxMi43ODU1IDE2Ljg0MjcgMTMuODYxIDE1LjkyIDE0LjQxODMgMTQuOTI1NkMxNC4zNzkyIDE1LjA2OTIgMTQuMzU5NiAxNS4yMDI0IDE0LjM1OTYgMTUuMzI1NEMxNC4zNTk2IDE1Ljc5NyAxNC42MTM4IDE2LjA5NDMgMTUuMTMyIDE2LjA5NDNDMTYuNzY0OCAxNi4wOTQzIDE4LjQwNzQgMTMuMDcwMSAxOC40MDc0IDEwLjQyNTJDMTguNDA3NCA4LjM2NDU5IDE3LjQxMDEgNi41NTAwNSAxNC45MDcxIDYuNTUwMDVDMTAuNTA3NCA2LjU1MDA1IDUuNzY1NSAxMi4xNjc5IDUuNzY1NSAxNS43OTdaTTEzLjM5MTcgMTAuMTk5NkMxMy4zOTE3IDkuNjg3MDUgMTMuNjY1NCA5LjMyODI1IDE0LjA2NjMgOS4zMjgyNUMxNC40NTc0IDkuMzI4MjUgMTQuNzMxMiA5LjY4NzA1IDE0LjczMTIgMTAuMTk5NkMxNC43MzEyIDEwLjcxMjIgMTQuNDU3NCAxMS4wODEzIDE0LjA2NjMgMTEuMDgxM0MxMy42NjU0IDExLjA4MTMgMTMuMzkxNyAxMC43MTIyIDEzLjM5MTcgMTAuMTk5NlpNMTUuNDg0IDEwLjE5OTZDMTUuNDg0IDkuNjg3MDUgMTUuNzU3OCA5LjMyODI1IDE2LjE1ODYgOS4zMjgyNUMxNi41NDk3IDkuMzI4MjUgMTYuODIzNSA5LjY4NzA1IDE2LjgyMzUgMTAuMTk5NkMxNi44MjM1IDEwLjcxMjIgMTYuNTQ5NyAxMS4wODEzIDE2LjE1ODYgMTEuMDgxM0MxNS43NTc4IDExLjA4MTMgMTUuNDg0IDEwLjcxMjIgMTUuNDg0IDEwLjE5OTZaIiBmaWxsPSIjRkVGREY4Ii8+PC9nPjxkZWZzPjxjbGlwUGF0aCBpZD0iY2xpcDBfNDRfNjEwIj48cmVjdCB3aWR0aD0iMTIuNzYiIGhlaWdodD0iMTEiIGZpbGw9IndoaXRlIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1LjcwNjQyIDYuNTQ5OTMpIi8+PC9jbGlwUGF0aD48L2RlZnM+PC9zdmc+';
const SOLFLARE_ICON: Wallet['icon'] =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIxMiIgZmlsbD0iI0ZGRUY0NiIvPjxwYXRoIGQ9Ik0xMi4xMjg1IDEyLjUyNjZMMTIuOTU1NiAxMS43Mjc2TDE0LjQ5NzYgMTIuMjMyM0MxNS41MDcgMTIuNTY4NyAxNi4wMTE3IDEzLjE4NTUgMTYuMDExNyAxNC4wNTQ3QzE2LjAxMTcgMTQuNzEzNiAxNS43NTkzIDE1LjE0ODIgMTUuMjU0NyAxNS43MDg5TDE1LjEwMDUgMTUuODc3MUwxNS4xNTY1IDE1LjQ4NDZDMTUuMzgwOCAxNC4wNTQ3IDE0Ljk2MDMgMTMuNDM3OSAxMy41NzI0IDEyLjk4OTJMMTIuMTI4NSAxMi41MjY2Wk0xMC4wNTM3IDcuNjM0MTRMMTQuMjU5MyA5LjAzNkwxMy4zNDgxIDkuOTA1MTdMMTEuMTYxMiA5LjE3NjE5QzEwLjQwNDIgOC45MjM4NSAxMC4xNTE4IDguNTE3MzEgMTAuMDUzNyA3LjY2MjE3VjcuNjM0MTRaTTkuODAxMzUgMTQuNzU1NkwxMC43NTQ2IDEzLjg0NDRMMTIuNTQ5MSAxNC40MzMyQzEzLjQ4ODMgMTQuNzQxNiAxMy44MTA3IDE1LjE0ODIgMTMuNzEyNiAxNi4xNzE1TDkuODAxMzUgMTQuNzU1NlpNOC41OTU3NyAxMC42OTAyQzguNTk1NzcgMTAuNDIzOSA4LjczNTk1IDEwLjE3MTUgOC45NzQyNyA5Ljk2MTIyQzkuMjI2NjEgMTAuMzI1NyA5LjY2MTE4IDEwLjY0ODEgMTAuMzQ4MSAxMC44NzI1TDExLjgzNDEgMTEuMzYzMUwxMS4wMDcgMTIuMTYyMkw5LjU0OTAzIDExLjY4NTVDOC44NzYxNCAxMS40NjEyIDguNTk1NzcgMTEuMTI0OCA4LjU5NTc3IDEwLjY5MDJaTTEyLjk5NzYgMTguMDVDMTYuMDgxNyAxNi4wMDMzIDE3LjczNTkgMTQuNjE1NCAxNy43MzU5IDEyLjkwNTJDMTcuNzM1OSAxMS43Njk2IDE3LjA2MyAxMS4xMzg4IDE1LjU3NzEgMTAuNjQ4MUwxNC40NTU2IDEwLjI2OTZMMTcuNTI1NyA3LjMyNTcyTDE2LjkwODggNi42NjY4NEwxNS45OTc2IDcuNDY1OUwxMS42OTM5IDYuMDUwMDJDMTAuMzYyMSA2LjQ4NDYgOC42Nzk4OCA3Ljc2MDMgOC42Nzk4OCA5LjAzNkM4LjY3OTg4IDkuMTc2MTggOC42OTM5IDkuMzE2MzcgOC43MzU5NSA5LjQ3MDU5QzcuNjI4NDcgMTAuMTAxNCA3LjE3OTg4IDEwLjY5MDIgNy4xNzk4OCAxMS40MTkxQzcuMTc5ODggMTIuMTA2MSA3LjU0NDM2IDEyLjc5MyA4LjcwNzkyIDEzLjE3MTVMOS42MzMxNCAxMy40Nzk5TDYuNDM2ODkgMTYuNTVMNy4wNTM3MSAxNy4yMDg5TDguMDQ5MDQgMTYuMjk3N0wxMi45OTc2IDE4LjA1WiIgZmlsbD0iIzAyMDUwQSIvPjwvc3ZnPg==';
const BACKPACK_ICON: Wallet['icon'] =
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHJ4PSIxMiIgZmlsbD0iI0UzM0UzRiIvPjxwYXRoIGQ9Ik0xNS41MTg2IDEzLjkyNzJDMTUuOTgxMSAxMy45MjcyIDE2LjIxMjcgMTMuOTI3MSAxNi4zNTY0IDE0LjA3MDhDMTYuNTAwMiAxNC4yMTQ1IDE2LjUgMTQuNDQ2MiAxNi41IDE0LjkwODdWMTUuNTY0QzE2LjUgMTYuNDg5MyAxNi41MDAyIDE2Ljk1MjIgMTYuMjEyOSAxNy4yMzk3QzE1LjkyNTMgMTcuNTI3MyAxNS40NjE4IDE3LjUyNzggMTQuNTM2MSAxNy41Mjc4SDkuNDYzODdDOC41Mzg0MiAxNy41Mjc4IDguMDc1NjcgMTcuNTI3MSA3Ljc4ODA5IDE3LjIzOTdDNy41MDA1NCAxNi45NTIyIDcuNSAxNi40ODk0IDcuNSAxNS41NjRWMTQuOTA4N0M3LjUgMTQuNDQ2MiA3LjQ5OTgyIDE0LjIxNDUgNy42NDM1NSAxNC4wNzA4QzcuNzg3MyAxMy45MjcxIDguMDE4OTEgMTMuOTI3MiA4LjQ4MTQ1IDEzLjkyNzJIMTUuNTE4NlpNMTIgNi4zNTg4OUMxNi41NjUzIDYuMzU4ODkgMTYuNSA5LjQwMjM4IDE2LjUgMTAuODU4OVYxMi40OTU2QzE2LjQ5OTkgMTIuNzY2NyAxNi4yNzk5IDEyLjk4NjggMTYuMDA4OCAxMi45ODY4SDcuOTkxMjFDNy43MjAxMiAxMi45ODY4IDcuNTAwMDYgMTIuNzY2NyA3LjUgMTIuNDk1NkM3LjUgMTIuNDk1NiA3LjUgMTIuMzE1MyA3LjUgMTAuODU4OUM3LjQ5OTk5IDkuNDAyMzkgNy40MzQ3OCA2LjM1ODkzIDEyIDYuMzU4ODlaTTEyIDcuNTE5MDRDMTEuMjMxOSA3LjUxOTEgMTAuNjA5NCA4LjE0MTU1IDEwLjYwOTQgOC45MDk2N0MxMC42MDk0IDkuNjc3NzggMTEuMjMxOSAxMC4zMDAyIDEyIDEwLjMwMDNDMTIuNzY4MiAxMC4zMDAzIDEzLjM5MDYgOS42Nzc4MiAxMy4zOTA2IDguOTA5NjdDMTMuMzkwNiA4LjE0MTUxIDEyLjc2ODIgNy41MTkwNCAxMiA3LjUxOTA0Wk0xMS45OTkgNC40NzIxN0MxMi45ODQxIDQuNDcyMjIgMTMuODQ2MiA0LjgxNjczIDE0LjA3NDIgNS4zNzc0NEMxNC4xMDg1IDUuNDczODcgMTQuMTI1OCA1LjUyMjIyIDE0LjA5NTcgNS41NTgxMUMxNC4wNjUyIDUuNTk0MDIgMTQuMDA1OCA1LjU4MzQyIDEzLjg4NzcgNS41NjIwMUMxMy41ODIyIDUuNTA2NjUgMTMuMTQ5MyA1LjQ2ODc3IDEyLjc2ODYgNS40NTc1MkMxMi41MjU4IDUuNDQ0NDggMTIuMjY5NSA1LjQzNzk5IDEyIDUuNDM3OTlDMTEuNzMwNSA1LjQzNzk5IDExLjQ3NDIgNS40NDQ0OCAxMS4yMzE0IDUuNDU3NTJDMTAuODQ5IDUuNDY4NzcgMTAuNDE0OSA1LjUwNjU4IDEwLjEwODQgNS41NjAwNkM5Ljk5MzM1IDUuNTgwMTMgOS45MzU2NSA1LjU5MDQ3IDkuOTA1MjcgNS41NTUxOEM5Ljg3NDk3IDUuNTE5MzUgOS44OTEyOCA1LjQ3MTQ0IDkuOTI0OCA1LjM3NjQ2QzEwLjE1MSA0LjgxNzQ4IDExLjAxNDIgNC40NzIxNyAxMS45OTkgNC40NzIxN1oiIGZpbGw9IndoaXRlIi8+PC9zdmc+';

const WALLET_ICON_OVERRIDES: Record<string, Wallet['icon']> = {
    Phantom: PHANTOM_ICON,
    Solflare: SOLFLARE_ICON,
    Backpack: BACKPACK_ICON,
};

const ICON_PROXY_CACHE = new WeakMap<Wallet, Wallet>();

export function getWalletIconOverride(walletName: string): Wallet['icon'] | undefined {
    return WALLET_ICON_OVERRIDES[walletName];
}

function createIconProxy(wallet: Wallet, icon: Wallet['icon']): Wallet {
    const cached = ICON_PROXY_CACHE.get(wallet);
    if (cached) return cached;

    const proxy = new Proxy(wallet as unknown as Record<string, unknown>, {
        get(target, prop) {
            if (prop === 'icon') return icon;
            // Important: use `target` as the receiver so prototype getters that rely on private fields
            // (or expect `this` to be the original instance) keep working.
            const value = Reflect.get(target, prop, target);
            if (typeof value === 'function') {
                // Preserve method semantics for class-based wallets that use `this`/private fields.
                return value.bind(target);
            }
            return value;
        },
    }) as unknown as Wallet;

    ICON_PROXY_CACHE.set(wallet, proxy);
    return proxy;
}

/**
 * Apply a uniform icon override in-place when possible.
 *
 * We prefer mutation here because some Wallet Standard implementations update the wallet object
 * (e.g. `wallet.accounts`) over time. Creating a shallow copy can break that linkage.
 */
export function applyWalletIconOverride(wallet: Wallet): Wallet {
    const override = getWalletIconOverride(wallet.name);
    if (!override || wallet.icon === override) return wallet;

    // If we can mutate, do so to preserve identity with the Wallet Standard registry object.
    // Some wallets may use prototype-based getters and/or prevent extensions; in that case we
    // fall back to a Proxy wrapper that preserves all other fields/methods.
    if (Object.isExtensible(wallet)) {
        try {
            // WalletIcon is a string at runtime; Wallet Standard objects are typically plain and mutable.
            (wallet as unknown as { icon?: Wallet['icon'] }).icon = override;
            return wallet;
        } catch {
            // continue to proxy fallback
        }
    }

    return createIconProxy(wallet, override);
}
