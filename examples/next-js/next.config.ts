import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // Mark keychain packages as external - they're dynamically imported
    // and resolved via pnpm overrides to local packages
    serverExternalPackages: [
        '@solana/keychain',
        '@solana/keychain-core',
        '@solana/keychain-fireblocks',
        '@solana/keychain-privy',
        '@solana/keychain-turnkey',
        '@solana/keychain-vault',
        '@solana/keychain-aws-kms',
    ],
};

export default nextConfig;
