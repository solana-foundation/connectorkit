/**
 * @connector-kit/connector - Wallet Authenticity Verifier
 *
 * Verifies that detected wallets are authentic and not malicious browser extensions
 * Uses dynamic heuristic-based approach instead of hard-coded wallet lists
 * Helps protect users from phishing attacks and fake wallet injections
 */

import type { DirectWallet } from './wallet-detector';
import { createLogger } from '../utils/secure-logger';

const logger = createLogger('WalletAuthenticity');

/**
 * Result of wallet authenticity verification
 */
export interface WalletVerificationResult {
    /** Whether the wallet passed verification */
    authentic: boolean;
    /** Confidence level (0-1) in the verification */
    confidence: number;
    /** Reason for the result */
    reason: string;
    /** Warnings about the wallet */
    warnings: string[];
    /** Security score breakdown */
    securityScore: {
        walletStandardCompliance: number;
        methodIntegrity: number;
        chainSupport: number;
        maliciousPatterns: number;
        identityConsistency: number;
    };
}

/**
 * WalletAuthenticityVerifier - Verifies wallet extensions are genuine
 *
 * Uses dynamic heuristics instead of hard-coded wallet lists:
 * 1. Wallet Standard compliance checks
 * 2. Method integrity validation
 * 3. Chain support verification
 * 4. Malicious pattern detection
 * 5. Identity consistency checks
 *
 * This approach is future-proof and works with any wallet, including new ones.
 *
 * @example
 * ```ts
 * const result = WalletAuthenticityVerifier.verify(walletObject, 'phantom');
 *
 * if (!result.authentic) {
 *   console.warn('Potentially fake wallet detected:', result.reason);
 *   return;
 * }
 *
 * if (result.warnings.length > 0) {
 *   console.warn('Wallet verification warnings:', result.warnings);
 * }
 * ```
 */
export class WalletAuthenticityVerifier {
    /**
     * Verify a wallet's authenticity using dynamic heuristics
     *
     * @param wallet - The wallet object to verify
     * @param walletName - Expected wallet name
     * @returns Verification result with confidence score
     */
    static verify(wallet: DirectWallet, walletName: string): WalletVerificationResult {
        const warnings: string[] = [];
        const name = walletName.toLowerCase();

        logger.debug('Verifying wallet with dynamic heuristics', { name });

        // Initialize security score components
        const securityScore = {
            walletStandardCompliance: 0,
            methodIntegrity: 0,
            chainSupport: 0,
            maliciousPatterns: 1, // Start at 1, deduct for issues
            identityConsistency: 0,
        };

        // 1. Check Wallet Standard compliance (0-1)
        const walletStandardScore = this.checkWalletStandardCompliance(wallet);
        securityScore.walletStandardCompliance = walletStandardScore.score;
        warnings.push(...walletStandardScore.warnings);

        // 2. Validate method integrity (0-1)
        const methodIntegrityScore = this.checkMethodIntegrity(wallet);
        securityScore.methodIntegrity = methodIntegrityScore.score;
        warnings.push(...methodIntegrityScore.warnings);

        // 3. Verify chain support (0-1)
        const chainSupportScore = this.checkChainSupport(wallet);
        securityScore.chainSupport = chainSupportScore.score;
        warnings.push(...chainSupportScore.warnings);

        // 4. Detect malicious patterns (0-1)
        const maliciousPatterns = this.detectMaliciousPatterns(wallet, name);
        securityScore.maliciousPatterns = maliciousPatterns.score;
        warnings.push(...maliciousPatterns.warnings);

        // 5. Check identity consistency (0-1)
        const identityScore = this.checkIdentityConsistency(wallet, name);
        securityScore.identityConsistency = identityScore.score;
        warnings.push(...identityScore.warnings);

        // Calculate overall confidence (weighted average)
        const weights = {
            walletStandardCompliance: 0.25,
            methodIntegrity: 0.20,
            chainSupport: 0.15,
            maliciousPatterns: 0.30, // Highest weight - security critical
            identityConsistency: 0.10,
        };

        const confidence =
            securityScore.walletStandardCompliance * weights.walletStandardCompliance +
            securityScore.methodIntegrity * weights.methodIntegrity +
            securityScore.chainSupport * weights.chainSupport +
            securityScore.maliciousPatterns * weights.maliciousPatterns +
            securityScore.identityConsistency * weights.identityConsistency;

        // Determine authenticity threshold
        const AUTHENTICITY_THRESHOLD = 0.6; // 60% confidence required
        const authentic = confidence >= AUTHENTICITY_THRESHOLD && securityScore.maliciousPatterns > 0.5;

        const reason = authentic
            ? 'Wallet passed all security checks'
            : `Wallet failed security checks (confidence: ${Math.round(confidence * 100)}%)`;

        logger.debug('Wallet verification complete', {
            name,
            authentic,
            confidence: Math.round(confidence * 100) / 100,
            warnings: warnings.length,
        });

        return {
            authentic,
            confidence,
            reason,
            warnings,
            securityScore,
        };
    }

    /**
     * Check Wallet Standard compliance
     * Returns score 0-1 based on how well the wallet implements the standard
     */
    private static checkWalletStandardCompliance(wallet: DirectWallet): { score: number; warnings: string[] } {
        const warnings: string[] = [];
        let score = 0;

        // Check for Wallet Standard features object
        if (wallet.features && typeof wallet.features === 'object') {
            score += 0.3;

            // Check for required Wallet Standard features
            const requiredFeatures = ['standard:connect', 'standard:disconnect', 'standard:events'];
            const presentFeatures = requiredFeatures.filter(feature => feature in wallet.features!);

            score += (presentFeatures.length / requiredFeatures.length) * 0.4;

            // Check for Solana-specific features (bonus points)
            const solanaFeatures = [
                'solana:signTransaction',
                'solana:signAndSendTransaction',
                'solana:signMessage',
                'solana:signAllTransactions',
            ];
            const presentSolanaFeatures = solanaFeatures.filter(feature => feature in (wallet.features || {}));

            score += (presentSolanaFeatures.length / solanaFeatures.length) * 0.3;

            if (presentFeatures.length < requiredFeatures.length) {
                warnings.push('Wallet missing some standard features');
            }
        } else {
            warnings.push('Wallet does not implement Wallet Standard');
        }

        return { score: Math.min(score, 1), warnings };
    }

    /**
     * Validate method integrity
     * Checks if methods appear to be genuine and not tampered with
     */
    private static checkMethodIntegrity(wallet: DirectWallet): { score: number; warnings: string[] } {
        const warnings: string[] = [];
        let score = 0;
        const walletObj = wallet as Record<string, unknown>;

        // Critical methods that should exist
        const criticalMethods = ['connect', 'disconnect'];
        const existingMethods = criticalMethods.filter(method => typeof walletObj[method] === 'function');

        if (existingMethods.length === 0) {
            warnings.push('Wallet missing critical methods');
            return { score: 0, warnings };
        }

        score += (existingMethods.length / criticalMethods.length) * 0.5;

        // Check method signatures (native functions are typically shorter)
        let suspiciousMethodCount = 0;
        for (const method of existingMethods) {
            const func = walletObj[method] as Function;
            const funcStr = func.toString();

            // Native functions or well-written async functions should be reasonable length
            // Extremely long functions (>1000 chars) could indicate injection
            if (funcStr.length > 1000) {
                suspiciousMethodCount++;
                warnings.push(`Method ${method} has unusually long implementation`);
            }

            // Check for suspicious keywords in function body
            const suspiciousKeywords = [
                'fetch(',
                'XMLHttpRequest',
                'sendToServer',
                'exfiltrate',
                'steal',
                'phish',
            ];

            for (const keyword of suspiciousKeywords) {
                if (funcStr.includes(keyword)) {
                    suspiciousMethodCount++;
                    warnings.push(`Method ${method} contains suspicious code pattern`);
                    break;
                }
            }
        }

        // Deduct score for suspicious methods
        const suspiciousRatio = suspiciousMethodCount / existingMethods.length;
        score += (1 - suspiciousRatio) * 0.5;

        return { score: Math.max(0, Math.min(score, 1)), warnings };
    }

    /**
     * Verify Solana chain support
     */
    private static checkChainSupport(wallet: DirectWallet): { score: number; warnings: string[] } {
        const warnings: string[] = [];
        let score = 0;

        // Check chains array
        if (Array.isArray(wallet.chains)) {
            const hasSolanaChain = wallet.chains.some(chain => {
                const chainStr = String(chain).toLowerCase();
                return chainStr.includes('solana');
            });

            if (hasSolanaChain) {
                score = 1.0;
            } else {
                warnings.push('Wallet does not explicitly support Solana chain');
                score = 0.3; // Some partial credit - might still work
            }
        } else if (wallet.chains === undefined) {
            // Some legacy wallets don't have chains property
            warnings.push('Wallet does not declare supported chains');
            score = 0.5; // Benefit of the doubt for older wallets
        }

        return { score, warnings };
    }

    /**
     * Detect common patterns used by malicious wallet extensions
     */
    private static detectMaliciousPatterns(
        wallet: DirectWallet,
        expectedName: string,
    ): { score: number; warnings: string[] } {
        const warnings: string[] = [];
        let score = 1.0; // Start at perfect, deduct for issues
        const walletObj = wallet as Record<string, unknown>;

        // 1. Check for multiple wallet identity flags (impersonation attempt)
        const identityFlags = Object.keys(walletObj).filter(
            key =>
                (key.startsWith('is') &&
                    (key.endsWith('Wallet') || key.endsWith('wallet') || /^is[A-Z]/.test(key))) &&
                walletObj[key] === true,
        );

        if (identityFlags.length > 2) {
            // More than 2 identity flags is suspicious
            score -= 0.3;
            warnings.push(`Multiple wallet identity flags detected: ${identityFlags.join(', ')}`);
        }

        // 2. Check for explicit malicious property names
        const explicitlyMaliciousProps = [
            'stealPrivateKey',
            'getPrivateKey',
            'exportPrivateKey',
            'sendToAttacker',
            'phishingUrl',
            'malware',
            'backdoor',
        ];

        for (const prop of explicitlyMaliciousProps) {
            if (prop.toLowerCase() in Object.keys(walletObj).map(k => k.toLowerCase())) {
                score = 0; // Instant fail
                warnings.push(`Explicitly malicious property detected: ${prop}`);
            }
        }

        // 3. Check URL properties for suspicious domains
        const urlProps = ['iconUrl', 'url', 'homepage', 'website'];
        for (const prop of urlProps) {
            const value = walletObj[prop];
            if (typeof value === 'string' && this.isSuspiciousUrl(value)) {
                score -= 0.2;
                warnings.push(`Suspicious URL in ${prop}: ${value}`);
            }
        }

        // 4. Check for proto pollution or __proto__ manipulation
        if ('__proto__' in walletObj || 'constructor' in walletObj) {
            // These are normal on all objects, but check if they're been tampered with
            const proto = Object.getPrototypeOf(walletObj);
            if (proto !== Object.prototype && proto !== null) {
                score -= 0.1;
                warnings.push('Wallet has unusual prototype chain');
            }
        }

        // 5. Check for excessive property count (bloated objects can indicate injection)
        const propCount = Object.keys(walletObj).length;
        if (propCount > 100) {
            score -= 0.1;
            warnings.push(`Wallet has unusually many properties (${propCount})`);
        }

        return { score: Math.max(0, score), warnings };
    }

    /**
     * Check if wallet identity is consistent with expected name
     */
    private static checkIdentityConsistency(wallet: DirectWallet, expectedName: string): {
        score: number;
        warnings: string[];
    } {
        const warnings: string[] = [];
        let score = 0;
        const walletObj = wallet as Record<string, unknown>;
        const name = expectedName.toLowerCase();

        // Build list of identity indicators
        const identityIndicators = [
            walletObj.name,
            walletObj.providerName,
            (walletObj.metadata as Record<string, unknown>)?.name,
            (walletObj._metadata as Record<string, unknown>)?.name,
        ].filter(Boolean) as string[];

        // Check if any identity indicator matches expected name
        let hasMatch = false;
        for (const indicator of identityIndicators) {
            if (typeof indicator === 'string' && indicator.toLowerCase().includes(name)) {
                hasMatch = true;
                score += 0.5;
                break;
            }
        }

        // Check for identity flag (e.g., isPhantom)
        const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
        const identityFlags = [
            `is${capitalizedName}`,
            `is${capitalizedName}Wallet`,
            `is${capitalizedName.toLowerCase()}`,
        ];

        for (const flag of identityFlags) {
            if (walletObj[flag] === true) {
                hasMatch = true;
                score += 0.5;
                break;
            }
        }

        if (!hasMatch) {
            warnings.push(`Wallet identity does not match expected name: ${expectedName}`);
        }

        return { score: Math.min(score, 1), warnings };
    }

    /**
     * Check if a URL looks suspicious
     */
    private static isSuspiciousUrl(url: string): boolean {
        try {
            const parsed = new URL(url);

            // Check for common phishing indicators
            const suspiciousPatterns = [
                'bit.ly',
                'tinyurl.com',
                'tiny.cc',
                'is.gd',
                'goo.gl',
                't.co',
                '.tk', // Free domain TLDs
                '.ml',
                '.ga',
                '.cf',
                '.gq',
            ];

            const hostname = parsed.hostname.toLowerCase();

            // Check for URL shorteners and free domains
            if (suspiciousPatterns.some(pattern => hostname.includes(pattern))) {
                return true;
            }

            // Check for IP addresses (wallets should use proper domains)
            if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
                return true;
            }

            // Check for excessive subdomains (common in phishing)
            const subdomains = hostname.split('.');
            if (subdomains.length > 4) {
                return true;
            }

            return false;
        } catch {
            // Invalid URL format
            return true;
        }
    }

    /**
     * Batch verify multiple wallets
     *
     * @param wallets - Array of wallet objects with their names
     * @returns Map of wallet names to verification results
     */
    static verifyBatch(wallets: Array<{ wallet: DirectWallet; name: string }>): Map<string, WalletVerificationResult> {
        const results = new Map<string, WalletVerificationResult>();

        for (const { wallet, name } of wallets) {
            results.set(name, this.verify(wallet, name));
        }

        return results;
    }

    /**
     * Get a human-readable security report for a wallet
     *
     * @param result - Verification result
     * @returns Formatted security report
     */
    static getSecurityReport(result: WalletVerificationResult): string {
        const lines: string[] = [];
        lines.push(`Security Assessment: ${result.authentic ? '✅ PASSED' : '❌ FAILED'}`);
        lines.push(`Overall Confidence: ${Math.round(result.confidence * 100)}%`);
        lines.push('');
        lines.push('Score Breakdown:');
        lines.push(`  - Wallet Standard Compliance: ${Math.round(result.securityScore.walletStandardCompliance * 100)}%`);
        lines.push(`  - Method Integrity: ${Math.round(result.securityScore.methodIntegrity * 100)}%`);
        lines.push(`  - Chain Support: ${Math.round(result.securityScore.chainSupport * 100)}%`);
        lines.push(`  - Malicious Patterns: ${Math.round(result.securityScore.maliciousPatterns * 100)}%`);
        lines.push(`  - Identity Consistency: ${Math.round(result.securityScore.identityConsistency * 100)}%`);

        if (result.warnings.length > 0) {
            lines.push('');
            lines.push('Warnings:');
            result.warnings.forEach(w => lines.push(`  ⚠️  ${w}`));
        }

        return lines.join('\n');
    }
}
