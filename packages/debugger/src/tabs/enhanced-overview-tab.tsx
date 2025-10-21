/**
 * @solana/connector-debugger - Enhanced Overview Tab Component
 *
 * Combines Overview + Signer + Wallet information into a single comprehensive dashboard
 */

'use client';

import { useState, useMemo } from 'react';
import type { ConnectorState, ConnectorHealth, TransactionSignerCapabilities } from '@solana/connector';
import type { ConnectorClient } from '@solana/connector/headless';
import { Section, Divider, EmptyState, Button, CollapsibleSection } from '../ui-components';
import { StorageIcon, NetworkIcon, LockIcon, HealthIcon, WalletIcon } from '../icons';

interface EnhancedOverviewTabProps {
    state: ConnectorState;
    health: ConnectorHealth | null;
    address: string | null;
    formatted: string;
    copied: boolean;
    copy: () => Promise<boolean>;
    cluster: ConnectorState['cluster'];
    rpcUrl: string;
    ready: boolean;
    capabilities: TransactionSignerCapabilities;
    client: ConnectorClient;
}

// Type extension for client with storage access
interface ConnectorClientWithStorage extends ConnectorClient {
    walletStorage?: { get: () => string | undefined; set: (v: string | undefined) => void };
    clusterStorage?: { get: () => string | undefined; set: (v: string) => void };
}

export function EnhancedOverviewTab({
    state,
    health,
    address,
    formatted,
    copied,
    copy,
    cluster,
    rpcUrl,
    ready,
    capabilities,
    client,
}: EnhancedOverviewTabProps) {
    const wallet = state.selectedWallet;

    const walletWithIcon = wallet && state.wallets?.find(w => w.wallet.name === wallet.name);
    const walletIcon = walletWithIcon?.wallet.icon || wallet?.icon;

    const [lastClear, setLastClear] = useState<string | null>(null);

    const clientWithStorage = client as ConnectorClientWithStorage;

    const storedWallet = useMemo(() => {
        try {
            return clientWithStorage.walletStorage?.get() || null;
        } catch {
            return null;
        }
    }, [clientWithStorage, lastClear]);

    const storedCluster = useMemo(() => {
        try {
            return clientWithStorage.clusterStorage?.get() || null;
        } catch {
            return null;
        }
    }, [clientWithStorage, lastClear]);

    const handleClearWallet = () => {
        try {
            clientWithStorage.walletStorage?.set(undefined);
            setLastClear(Date.now().toString());
        } catch (error) {
            console.error('Failed to clear wallet storage:', error);
        }
    };

    const handleClearCluster = () => {
        try {
            clientWithStorage.clusterStorage?.set('solana:mainnet');
            setLastClear(Date.now().toString());
        } catch (error) {
            console.error('Failed to clear cluster storage:', error);
        }
    };

    const handleClearAll = () => {
        handleClearWallet();
        handleClearCluster();
    };

    const hasHealthIssues = !!(
        health &&
        (!health.initialized ||
            !health.walletStandardAvailable ||
            !health.storageAvailable ||
            (health.errors && health.errors.length > 0))
    );

    return (
        <div style={{ height: '100%', overflowY: 'auto' }}>
            {wallet && address ? (
                <>
                    <div style={{ marginBottom: 12 }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: 6,
                            }}
                        >
                            <div
                                style={{
                                    opacity: 0.7,
                                    fontSize: 10,
                                    textTransform: 'uppercase',
                                    letterSpacing: 0.5,
                                    fontWeight: 400,
                                }}
                            >
                                Connected Wallet
                            </div>
                            <div
                                style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    opacity: 0.9,
                                }}
                            >
                                {wallet.name}
                            </div>
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                marginBottom: 10,
                            }}
                        >
                            {walletIcon ? (
                                <img
                                    src={walletIcon}
                                    alt={wallet.name}
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 6,
                                        flexShrink: 0,
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 6,
                                        flexShrink: 0,
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        color: 'rgba(255, 255, 255, 0.6)',
                                    }}
                                >
                                    {wallet.name?.[0]?.toUpperCase() || '?'}
                                </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontFamily: 'monospace',
                                        wordBreak: 'break-all',
                                        padding: '8px 10px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        borderRadius: 6,
                                        fontSize: 10,
                                        fontWeight: 500,
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                    }}
                                    onClick={() => copy()}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    }}
                                    title="Click to copy address"
                                >
                                    <span style={{ flex: 1 }}>{formatted}</span>
                                    {copied ? (
                                        <svg
                                            width={14}
                                            height={14}
                                            viewBox="0 0 24 24"
                                            fill="#0f0"
                                            xmlns="http://www.w3.org/2000/svg"
                                            style={{ flexShrink: 0 }}
                                        >
                                            <g>
                                                <rect height="17.2363" opacity="0" width="17.1875" x="0" y="0"></rect>
                                                <path
                                                    d="M6.36719 17.2363C6.78711 17.2363 7.11914 17.0508 7.35352 16.6895L16.582 2.1582C16.7578 1.875 16.8262 1.66016 16.8262 1.43555C16.8262 0.898438 16.4746 0.546875 15.9375 0.546875C15.5469 0.546875 15.332 0.673828 15.0977 1.04492L6.32812 15.0195L1.77734 9.0625C1.5332 8.7207 1.28906 8.58398 0.9375 8.58398C0.380859 8.58398 0 8.96484 0 9.50195C0 9.72656 0.0976562 9.98047 0.283203 10.2148L5.35156 16.6699C5.64453 17.0508 5.94727 17.2363 6.36719 17.2363Z"
                                                    fillOpacity="0.85"
                                                ></path>
                                            </g>
                                        </svg>
                                    ) : (
                                        <svg
                                            width={14}
                                            height={14}
                                            viewBox="0 0 24 24"
                                            fill="rgba(255, 255, 255, 0.5)"
                                            xmlns="http://www.w3.org/2000/svg"
                                            style={{ flexShrink: 0 }}
                                        >
                                            <g>
                                                <rect height="21.2019" opacity="0" width="18.9705" x="0" y="0"></rect>
                                                <path
                                                    d="M15.9159 11.1918L8.73817 18.3695C6.87294 20.2445 4.36317 20.059 2.76161 18.4379C1.15028 16.8363 0.964737 14.3461 2.82997 12.4711L12.6249 2.68593C13.7479 1.56288 15.3983 1.40663 16.4725 2.47109C17.537 3.55507 17.3808 5.1957 16.2675 6.31874L6.69716 15.8891C6.21864 16.3871 5.63271 16.2406 5.30067 15.9086C4.96864 15.5668 4.83192 15.0004 5.31044 14.5023L11.9999 7.83241C12.2929 7.52968 12.3124 7.09999 12.0292 6.81679C11.746 6.54335 11.3163 6.56288 11.0233 6.85585L4.31435 13.5648C3.31825 14.5609 3.35732 16.0844 4.23622 16.9633C5.19325 17.9203 6.63857 17.9008 7.64442 16.8949L17.2538 7.28554C19.08 5.45937 19.0018 3.05702 17.41 1.46523C15.8573-0.0875075 13.4159-0.204695 11.5897 1.62148L1.74599 11.475C-0.666122 13.8871-0.480575 17.3344 1.69716 19.5121C3.87489 21.6801 7.32216 21.8656 9.73427 19.4633L16.9608 12.2367C17.244 11.9535 17.244 11.4359 16.9511 11.1723C16.6679 10.8695 16.2089 10.9086 15.9159 11.1918Z"
                                                    fillOpacity="0.85"
                                                ></path>
                                            </g>
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ fontSize: 10, lineHeight: 1.6, opacity: 0.7 }}>
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <span style={{ color: '#ffffff' }}>Cluster: {cluster?.label || 'Unknown'}</span>
                                {cluster?.label && (
                                    <span
                                        style={{
                                            padding: '1px 4px',
                                            backgroundColor: cluster.label.includes('Mainnet')
                                                ? 'rgba(0, 255, 0, 0.15)'
                                                : 'rgba(255, 165, 0, 0.15)',
                                            borderRadius: 3,
                                            fontSize: 9,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {ready ? (
                                            <span style={{ fontSize: 9, color: '#0f0' }}>✓ Ready</span>
                                        ) : (
                                            <span style={{ fontSize: 9, color: '#f00' }}>✗ Not Ready</span>
                                        )}
                                    </span>
                                )}
                            </div>
                            {wallet.version && <div>Version: {wallet.version}</div>}
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: 4,
                                }}
                            >
                                Capabilities:
                                <div>
                                    {ready && capabilities.canSign && (
                                        <span
                                            style={{
                                                color: '#0f0',
                                                padding: '1px 4px',
                                                marginLeft: 4,
                                                borderRadius: 3,
                                                fontSize: 9,
                                                fontWeight: 600,
                                                backgroundColor: ready
                                                    ? 'rgba(0, 255, 0, 0.15)'
                                                    : 'rgba(255, 165, 0, 0.15)',
                                            }}
                                        >
                                            ✓ Sign
                                        </span>
                                    )}
                                    {ready && capabilities.canSend && (
                                        <span
                                            style={{
                                                color: '#0f0',
                                                padding: '1px 4px',
                                                marginLeft: 4,
                                                borderRadius: 3,
                                                fontSize: 9,
                                                fontWeight: 600,
                                                backgroundColor: ready
                                                    ? 'rgba(0, 255, 0, 0.15)'
                                                    : 'rgba(255, 165, 0, 0.15)',
                                            }}
                                        >
                                            ✓ Send
                                        </span>
                                    )}
                                    {ready && capabilities.canSignMessage && (
                                        <span
                                            style={{
                                                color: '#0f0',
                                                padding: '1px 4px',
                                                marginLeft: 4,
                                                borderRadius: 3,
                                                fontSize: 9,
                                                fontWeight: 600,
                                                backgroundColor: ready
                                                    ? 'rgba(0, 255, 0, 0.15)'
                                                    : 'rgba(255, 165, 0, 0.15)',
                                            }}
                                        >
                                            ✓ Message
                                        </span>
                                    )}
                                    {!ready && <span style={{ opacity: 0.5, marginLeft: 4 }}>Not available</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Divider />
                </>
            ) : (
                <>
                    <Section title="Connected Wallet">
                        <EmptyState
                            icon={
                                <svg
                                    viewBox="0 0 101 87"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    height="88"
                                    width="88"
                                    strokeWidth="1px"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path
                                        d="M98.9495 52.4199C98.9495 53.7999 98.5395 55.1999 97.7295 56.5999C96.9095 58.0099 95.8995 59.0599 94.6895 59.7599L90.4395 62.2099C89.2295 62.9099 88.2194 63.0199 87.4094 62.5599C86.5894 62.0899 86.1895 61.1699 86.1895 59.7899C86.1895 58.4099 86.5894 57.0099 87.4094 55.5999C88.2194 54.1999 89.2295 53.1399 90.4395 52.4499L94.6895 49.9899C95.7795 49.3699 96.7095 49.2099 97.4795 49.5299L97.7295 49.6499C98.5395 50.1099 98.9495 51.0299 98.9495 52.4199Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M98.9495 32.8899C98.9495 34.2699 98.5395 35.6699 97.7295 37.0699C96.9095 38.4799 95.8995 39.5299 94.6895 40.2299L90.4395 42.6798C89.2295 43.3798 88.2194 43.4999 87.4094 43.0299C86.5894 42.5699 86.1895 41.6399 86.1895 40.2599C86.1895 38.8799 86.5894 37.4799 87.4094 36.0699C88.2194 34.6699 89.2295 33.6199 90.4395 32.9199L94.6895 30.4599C95.7795 29.8399 96.7095 29.6799 97.4795 29.9999L97.7295 30.1198C98.5395 30.5798 98.9495 31.5099 98.9495 32.8899Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M97.4788 30C96.7088 29.68 95.7787 29.84 94.6887 30.46L90.4387 32.92C89.2287 33.62 88.2187 34.67 87.4087 36.07C86.5887 37.48 86.1887 38.88 86.1887 40.26C86.1887 41.64 86.5887 42.57 87.4087 43.03L81.9287 40.29V37.83C81.9287 36.45 81.5187 35.53 80.7087 35.06L80.4587 34.94L72.9988 31.2L66.5488 27.98C66.7488 27.34 67.0387 26.71 67.4087 26.07C68.2187 24.67 69.2287 23.62 70.4387 22.92L74.6887 20.46C75.8987 19.77 76.9088 19.65 77.7288 20.12L97.4788 30Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M60.6589 23.26C60.6589 23.84 60.6391 24.42 60.5891 25C60.2791 29.17 58.8491 33.46 56.2991 37.86C53.6891 42.36 50.599 45.79 47.019 48.17C46.609 48.44 46.189 48.7 45.769 48.95L39.3889 52.63C37.0489 53.98 35.0489 56.1 33.3789 58.97C32.8989 59.8 32.4789 60.62 32.1489 61.44C32.0589 61.62 31.989 61.81 31.929 61.99C31.229 63.8 30.8789 65.57 30.8789 67.31C30.8789 69.99 31.7089 71.81 33.3789 72.76C35.0489 73.71 37.0489 73.51 39.3889 72.16L41.0791 71.18L43.1589 69.98L43.6389 69.7C44.7289 69.08 45.6589 68.92 46.4189 69.24L46.6689 69.36C47.0089 69.55 47.279 69.82 47.469 70.17C47.759 70.66 47.8989 71.32 47.8989 72.13C47.8989 72.2 47.8989 72.28 47.8989 72.35C47.8889 73.03 47.7591 73.72 47.5391 74.41C47.3391 75.04 47.049 75.68 46.679 76.31C45.869 77.72 44.8589 78.77 43.6489 79.47L39.3989 81.92C34.7189 84.62 30.7089 85.03 27.3789 83.13C24.0489 81.23 22.3789 77.59 22.3789 72.22C22.3789 71.53 22.409 70.85 22.459 70.15C22.739 66.55 23.769 62.87 25.519 59.09C26.069 57.92 26.6889 56.73 27.3789 55.54C27.6089 55.14 27.8491 54.75 28.0791 54.36C28.3191 53.98 28.5591 53.61 28.8091 53.25C29.4491 52.27 30.1191 51.34 30.8091 50.46C30.9891 50.23 31.1691 50.01 31.3491 49.8C32.3291 48.62 33.3489 47.53 34.4189 46.55C34.9389 46.06 35.479 45.61 36.019 45.18C36.689 44.65 37.3691 44.15 38.0791 43.68H38.0891C38.2491 43.57 38.4191 43.46 38.5891 43.36C38.8591 43.19 39.1289 43.03 39.3989 42.87L41.019 41.94L45.7791 39.18C47.5491 38.16 49.0591 36.58 50.2991 34.44C51.4491 32.45 52.0689 30.51 52.1389 28.61C52.1589 28.47 52.1589 28.32 52.1589 28.18C52.1589 26.14 51.5391 24.77 50.2991 24.06C49.0591 23.36 47.5491 23.52 45.7791 24.54L34.0591 31.31L30.8889 33.14C29.6789 33.83 28.6691 33.95 27.8591 33.48C27.0391 33.02 26.6389 32.09 26.6389 30.71C26.6389 29.92 26.7691 29.13 27.0391 28.33C27.2291 27.73 27.5091 27.13 27.8591 26.53C28.6591 25.14 29.6591 24.09 30.8491 23.39C30.8591 23.39 30.8789 23.38 30.8889 23.37L40.189 18L45.7791 14.78C49.5491 12.6 52.8191 12.11 55.5791 13.33L56.3091 13.7C59.2191 15.36 60.6689 18.55 60.6689 23.26H60.6589Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M52.1492 28.1799C52.1492 28.3199 52.1492 28.4699 52.1292 28.6099C52.0592 30.5099 51.4393 32.4499 50.2893 34.4399C49.0493 36.5799 47.5393 38.1599 45.7693 39.1799L41.0093 41.9299L39.3892 42.8699C39.1192 43.0299 38.8493 43.1899 38.5793 43.3599C38.4093 43.4599 38.2393 43.5699 38.0793 43.6799H38.0693C37.3593 44.1499 36.6793 44.6499 36.0093 45.1799C35.4693 45.6099 34.9292 46.0599 34.4092 46.5499C33.3392 47.5299 32.3194 48.6199 31.3394 49.7999C31.1594 50.0099 30.9793 50.2299 30.7993 50.4599C30.1093 51.3399 29.4393 52.2699 28.7993 53.2499C28.5493 53.6099 28.3093 53.9799 28.0693 54.3599C27.8393 54.7499 27.5991 55.1399 27.3691 55.5399C26.6791 56.7299 26.0593 57.9199 25.5093 59.0899C23.7593 62.8699 22.7292 66.5499 22.4492 70.1499C22.3992 70.8499 22.3691 71.5299 22.3691 72.2199C22.3691 77.5899 24.0391 81.2299 27.3691 83.1299L8.16919 73.5299L7.36914 73.1299C4.03914 71.2299 2.36914 67.5899 2.36914 62.2199C2.36914 56.8499 4.03914 51.2899 7.36914 45.5399C10.6991 39.7999 14.7092 35.5699 19.3892 32.8699L22.7493 30.9299L27.8494 33.4799C28.6594 33.9499 29.6692 33.8299 30.8792 33.1399L34.0493 31.3099L45.7693 24.5399C47.5393 23.5199 49.0493 23.3599 50.2893 24.0599C51.5293 24.7699 52.1492 26.1399 52.1492 28.1799Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M36.0093 45.1799C35.4593 45.6099 34.9292 46.07 34.4092 46.55C34.9292 46.06 35.4693 45.6099 36.0093 45.1799Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M55.5691 13.3299C52.8091 12.1099 49.539 12.5999 45.769 14.7799L40.179 17.9999L30.8789 23.3699C30.8789 23.3699 30.8491 23.3899 30.8391 23.3899C29.6491 24.0899 28.6491 25.1399 27.8491 26.5299C27.4991 27.1299 27.2191 27.7299 27.0291 28.3299C26.7591 29.1299 26.6289 29.9199 26.6289 30.7099C26.6289 32.0899 27.0291 33.0199 27.8491 33.4799L22.749 30.9299L8.09912 23.5999L7.84912 23.4799C7.02912 23.0199 6.62891 22.0899 6.62891 20.7099C6.62891 19.3299 7.02912 17.9299 7.84912 16.5299C8.65912 15.1199 9.66891 14.0699 10.8789 13.3699L25.769 4.77989C29.879 2.39989 33.3891 2.03987 36.2991 3.69987L55.5691 13.3299Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M81.9294 37.8299V67.1198C81.9294 68.5098 81.5195 69.8998 80.7095 71.3098C79.8895 72.7098 78.8794 73.7699 77.6794 74.4599L69.1694 79.3698C66.8294 80.7298 64.8294 80.9299 63.1594 79.9799C61.4894 79.0299 60.6594 77.2099 60.6594 74.5199L56.7595 76.7799L56.4094 76.9799C55.1994 77.6799 54.1894 77.7899 53.3694 77.3299C52.5594 76.8599 52.1494 75.9399 52.1494 74.5499V64.7899C52.1494 63.4099 52.5594 62.0099 53.3694 60.6099C54.1894 59.1999 55.1994 58.1499 56.4094 57.4499L60.6594 54.9999C60.6594 53.0899 61.0794 51.1299 61.9294 49.1299C62.2594 48.3099 62.6794 47.4899 63.1594 46.6599C64.8294 43.7799 66.8294 41.6699 69.1694 40.3199L75.1194 36.8899L77.6794 35.4099C78.7594 34.7799 79.6895 34.6299 80.4595 34.9399L80.7095 35.0599C81.5195 35.5299 81.9294 36.4499 81.9294 37.8299Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M80.4595 34.9399C79.6895 34.6299 78.7594 34.7799 77.6794 35.4099L75.1194 36.8899L69.1694 40.3199C66.8294 41.6699 64.8294 43.7799 63.1594 46.6599C62.6794 47.4899 62.2594 48.3099 61.9294 49.1299C61.0794 51.1299 60.6594 53.0899 60.6594 54.9999L47.0195 48.1699C50.5995 45.7899 53.6896 42.3599 56.2996 37.8599C58.8496 33.4599 60.2796 29.1699 60.5896 24.9999C60.6296 25.0199 60.6695 25.0399 60.7095 25.0599L66.5496 27.9799L72.9995 31.1999L80.4595 34.9399Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M60.6587 54.9999L56.4087 57.4499C55.1987 58.1499 54.1887 59.1999 53.3687 60.6099C52.5587 62.0099 52.1487 63.4099 52.1487 64.7899V74.5499C52.1487 75.9399 52.5587 76.8599 53.3687 77.3299L47.5288 74.4099C47.7488 73.7199 47.8787 73.0299 47.8887 72.3499C47.8887 72.2799 47.8887 72.1999 47.8887 72.1299C47.8887 71.3199 47.7487 70.6599 47.4587 70.1699C47.2687 69.8199 46.9987 69.5499 46.6587 69.3599L46.4087 69.2399L40.8188 66.4399L38.9487 65.4999L32.1387 62.0999V61.4399C32.4687 60.6199 32.8887 59.7999 33.3687 58.9699C35.0387 56.0999 37.0387 53.9799 39.3787 52.6299L45.7588 48.9499C46.1788 48.6999 46.5988 48.4399 47.0088 48.1699L60.6487 54.9999H60.6587Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M63.1597 79.9799L56.7598 76.7799L60.6597 74.5199C60.6597 77.2099 61.4897 79.0299 63.1597 79.9799Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M97.4797 49.5299C96.7097 49.2099 95.7797 49.3699 94.6897 49.9899L90.4397 52.4499C89.2297 53.1399 88.2197 54.1999 87.4097 55.5999C86.5897 57.0099 86.1897 58.3999 86.1897 59.7899C86.1897 61.1799 86.5897 62.0899 87.4097 62.5599L81.9297 59.8199V41.7499L97.4797 49.5299Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                    <path
                                        d="M46.4189 69.2399C45.6589 68.9199 44.7289 69.0799 43.6389 69.6999L43.1589 69.9799L41.0791 71.1799L39.3889 72.1599C37.0489 73.5099 35.0489 73.7099 33.3789 72.7599C31.7089 71.8099 30.8789 69.9899 30.8789 67.3099C30.8789 65.5699 31.229 63.7999 31.929 61.9899L32.1489 62.0999L38.959 65.4999L40.8291 66.4399L46.4189 69.2399Z"
                                        stroke="#E0E0E0"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            }
                            title="No Wallet Connected"
                            description="Connect a wallet to view connection details and wallet information"
                        />
                    </Section>
                    <Divider />
                </>
            )}

            <CollapsibleSection icon={<StorageIcon />} title="STORAGE" defaultExpanded={true}>
                <Section title="Persisted State">
                    <div style={{ fontSize: 11, lineHeight: 1.8 }}>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 4,
                            }}
                        >
                            <span style={{ opacity: 0.7 }}>Wallet:</span>
                            {storedWallet ? (
                                <span
                                    style={{
                                        color: '#0f0',
                                        fontFamily: 'monospace',
                                        fontSize: 10,
                                    }}
                                >
                                    "{storedWallet}" ✓
                                </span>
                            ) : (
                                <span style={{ opacity: 0.5, fontSize: 10 }}>None</span>
                            )}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: 4,
                            }}
                        >
                            <span style={{ opacity: 0.7 }}>Account:</span>
                            {state.selectedAccount ? (
                                <span
                                    style={{
                                        color: '#0f0',
                                        fontFamily: 'monospace',
                                        fontSize: 9,
                                    }}
                                >
                                    {state.selectedAccount.slice(0, 6)}...
                                    {state.selectedAccount.slice(-4)} ✓
                                </span>
                            ) : (
                                <span style={{ opacity: 0.5, fontSize: 10 }}>None</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ opacity: 0.7 }}>Cluster:</span>
                            {storedCluster ? (
                                <span
                                    style={{
                                        color: '#0f0',
                                        fontFamily: 'monospace',
                                        fontSize: 10,
                                    }}
                                >
                                    "{storedCluster}" ✓
                                </span>
                            ) : (
                                <span style={{ opacity: 0.5, fontSize: 10 }}>None</span>
                            )}
                        </div>
                    </div>
                </Section>

                <Divider />

                <Section title="Actions">
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Button onClick={handleClearWallet} small>
                            Clear Wallet
                        </Button>
                        <Button onClick={handleClearCluster} small>
                            Clear Cluster
                        </Button>
                        <Button onClick={handleClearAll} small>
                            Clear All
                        </Button>
                    </div>
                </Section>

                <div
                    style={{
                        fontSize: 9,
                        opacity: 0.5,
                        marginTop: 8,
                        padding: 6,
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderRadius: 4,
                    }}
                >
                    💡 Clearing storage resets auto-connect behavior
                </div>
            </CollapsibleSection>

            <CollapsibleSection
                icon={<NetworkIcon />}
                title="NETWORK"
                defaultExpanded={false}
                badge={
                    cluster?.label ? <span style={{ fontSize: 9, opacity: 0.6 }}>({cluster.label})</span> : undefined
                }
            >
                <div style={{ marginBottom: 6, fontWeight: 600, fontSize: 12 }}>{cluster?.label || 'None'}</div>
                <div
                    style={{
                        fontSize: 10,
                        opacity: 0.6,
                        wordBreak: 'break-all',
                        fontFamily: 'monospace',
                        lineHeight: 1.4,
                    }}
                >
                    {rpcUrl || 'No RPC URL'}
                </div>
            </CollapsibleSection>

            <CollapsibleSection
                icon={<LockIcon />}
                title="SIGNER STATUS"
                defaultExpanded={false}
                badge={
                    ready ? (
                        <span style={{ fontSize: 9, color: '#0f0' }}>✓ Ready</span>
                    ) : (
                        <span style={{ fontSize: 9, color: '#f00' }}>✗ Not Ready</span>
                    )
                }
            >
                <div style={{ fontSize: 11, marginBottom: 6 }}>
                    {ready ? (
                        <span style={{ color: '#0f0', fontWeight: 600 }}>✅ Ready to Sign</span>
                    ) : (
                        <span style={{ color: '#f00', fontWeight: 600 }}>❌ Not Available</span>
                    )}
                </div>
                {ready && (
                    <div
                        style={{
                            fontSize: 10,
                            lineHeight: 1.8,
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '4px 12px',
                            marginTop: 6,
                        }}
                    >
                        <div>{capabilities.canSign ? '✓' : '✗'} Sign Txs</div>
                        <div>{capabilities.canSend ? '✓' : '✗'} Send Txs</div>
                        <div>{capabilities.canSignMessage ? '✓' : '✗'} Sign Messages</div>
                        <div>{capabilities.supportsBatchSigning ? '✓' : '✗'} Batch Sign</div>
                    </div>
                )}
                {!ready && (
                    <div
                        style={{
                            fontSize: 9,
                            opacity: 0.6,
                            marginTop: 4,
                            fontStyle: 'italic',
                        }}
                    >
                        Connect a wallet to enable signing
                    </div>
                )}
            </CollapsibleSection>

            {health && (
                <CollapsibleSection
                    icon={<HealthIcon />}
                    title="HEALTH CHECK"
                    defaultExpanded={false}
                    warning={hasHealthIssues}
                    badge={
                        hasHealthIssues ? (
                            <span style={{ fontSize: 9, color: '#ffaa00' }}>⚠️</span>
                        ) : (
                            <span style={{ fontSize: 9, color: '#0f0' }}>✓</span>
                        )
                    }
                >
                    <div
                        style={{
                            fontSize: 10,
                            lineHeight: 1.8,
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            alignItems: 'center',
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                            }}
                        >
                            <span style={{ opacity: 0.7 }}>Initialized:</span>
                            <span
                                style={{
                                    color: health.initialized ? '#0f0' : '#f00',
                                    fontWeight: 600,
                                }}
                            >
                                {health.initialized ? '✓' : '✗'}
                            </span>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                            }}
                        >
                            <span style={{ opacity: 0.7 }}>Wallet Standard:</span>
                            <span
                                style={{
                                    color: health.walletStandardAvailable ? '#0f0' : '#f00',
                                    fontWeight: 600,
                                }}
                            >
                                {health.walletStandardAvailable ? '✓' : '✗'}
                            </span>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                width: '100%',
                            }}
                        >
                            <span style={{ opacity: 0.7 }}>Storage:</span>
                            <span
                                style={{
                                    color: health.storageAvailable ? '#0f0' : '#f00',
                                    fontWeight: 600,
                                }}
                            >
                                {health.storageAvailable ? '✓' : '✗'}
                            </span>
                        </div>
                    </div>

                    {health.errors && health.errors.length > 0 && (
                        <div
                            style={{
                                marginTop: 10,
                                padding: 8,
                                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                                borderRadius: 6,
                                border: '1px solid rgba(255, 0, 0, 0.3)',
                            }}
                        >
                            <div
                                style={{
                                    color: '#ff6b6b',
                                    fontWeight: 600,
                                    marginBottom: 4,
                                    fontSize: 10,
                                }}
                            >
                                ⚠️ Errors:
                            </div>
                            {health.errors.map((error: string, i: number) => (
                                <div key={i} style={{ marginBottom: 2, fontSize: 9, opacity: 0.9 }}>
                                    • {error}
                                </div>
                            ))}
                        </div>
                    )}
                </CollapsibleSection>
            )}

            {state.wallets.length > 0 && (
                <CollapsibleSection
                    icon={<WalletIcon />}
                    title="AVAILABLE WALLETS"
                    defaultExpanded={false}
                    badge={<span style={{ fontSize: 9, opacity: 0.6 }}>({state.wallets.length} detected)</span>}
                >
                    <div style={{ fontSize: 10, opacity: 0.7 }}>
                        {state.wallets.length} wallet{state.wallets.length !== 1 ? 's' : ''} detected in your browser
                    </div>
                </CollapsibleSection>
            )}
        </div>
    );
}
