import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Mark keychain packages as external - they're dynamically imported
    // and resolved at runtime when installed (optional server dependencies)
    serverExternalPackages: [
        '@solana/keychain',
        '@solana/keychain-core',
        '@solana/keychain-cdp',
        '@solana/keychain-crossmint',
        '@solana/keychain-dfns',
        '@solana/keychain-fireblocks',
        '@solana/keychain-gcp-kms',
        '@solana/keychain-memory',
        '@solana/keychain-openfort',
        '@solana/keychain-para',
        '@solana/keychain-privy',
        '@solana/keychain-turnkey',
        '@solana/keychain-vault',
        '@solana/keychain-aws-kms',
    ],
};

export default nextConfig;
