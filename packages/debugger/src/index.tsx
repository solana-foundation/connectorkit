/**
 * @solana/connector-debugger - Enhanced Debug Panel Component
 *
 * Comprehensive development-only debug panel with:
 * - Tabbed interface for organization
 * - Comprehensive overview with wallet, signer, network, health, and storage state
 * - Real-time transaction tracking with explorer links
 * - Real-time event stream with filtering
 *
 * Only rendered in development mode - automatically excluded in production builds.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { ConnectorEvent } from '@solana/connector';
import {
    useConnector,
    useConnectorClient,
    useAccount,
    useCluster,
    useTransactionSigner,
} from '@solana/connector/react';

import type { DebugPanelProps, TabId, TabConfig } from './types';
import { BugIcon, CloseIcon, OverviewIcon, TransactionsIcon, EventsIcon } from './icons';
import { TabButton } from './ui-components';
import { EnhancedOverviewTab, LiveTab, TransactionsTab, EventsTab, OptimizationTab } from './tabs';

// Tab configuration - 5 tabs for comprehensive debugging
const TABS: TabConfig[] = [
    { id: 'overview', icon: <OverviewIcon />, label: 'Overview' },
    // { id: 'live', icon: <span style={{ fontSize: 14 }}>🔴</span>, label: 'Live' },
    { id: 'transactions', icon: <TransactionsIcon />, label: 'Transactions' },
    // { id: 'optimization', icon: <span style={{ fontSize: 14 }}>💡</span>, label: 'Optimization' },
    { id: 'events', icon: <EventsIcon />, label: 'Events' },
];

// Position styles mapping
const POSITION_STYLES: Record<string, React.CSSProperties> = {
    'top-left': { top: 16, left: 16 },
    'top-right': { top: 16, right: 16 },
    'bottom-left': { bottom: 16, left: 16 },
    'bottom-right': { bottom: 16, right: 16 },
};

/**
 * Enhanced development debug panel for connector
 *
 * **Features** (3 focused tabs):
 * - 📊 Overview: Comprehensive status dashboard (connection, signer, account, network, wallet, health, storage)
 * - 📝 Transactions: Real-time transaction tracking with explorer links
 * - 📡 Events: Real-time event stream with pause/clear controls
 *
 * **Important**: Only renders in development mode. Automatically excluded from production builds.
 *
 * @example
 * ```tsx
 * import { ConnectorDebugPanel } from '@solana/connector-debugger/react'
 *
 * function App() {
 *   return (
 *     <AppProvider connectorConfig={config}>
 *       {process.env.NODE_ENV === 'development' && <ConnectorDebugPanel />}
 *       <YourApp />
 *     </AppProvider>
 *   )
 * }
 * ```
 */
export function ConnectorDebugPanel({
    position = 'bottom-right',
    defaultOpen = false,
    defaultTab = 'overview',
    style = {},
    zIndex = 9999,
    maxEvents = 50,
}: DebugPanelProps) {
    // State
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
    const [events, setEvents] = useState<ConnectorEvent[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [isHeaderHovered, setIsHeaderHovered] = useState(false);
    const [isHeaderPressed, setIsHeaderPressed] = useState(false);

    // Hooks
    const client = useConnectorClient();
    const state = useConnector();
    const { address, formatted, copied, copy: accountCopy } = useAccount();
    const { cluster } = useCluster();
    const { signer, ready, capabilities } = useTransactionSigner();

    // Get RPC URL from client
    const rpcUrl = client?.getRpcUrl() || '';

    // Wrap copy function to adapt return type
    const copy = useCallback(async () => {
        const result = await accountCopy();
        return result.success;
    }, [accountCopy]);

    // Event subscription
    useEffect(() => {
        if (!client || isPaused) return;

        const unsubscribe = client.on((event: import('@solana/connector').ConnectorEvent) => {
            setEvents(prev => {
                const newEvents = [event, ...prev];
                return newEvents.slice(0, maxEvents);
            });
        });

        return unsubscribe;
    }, [client, isPaused, maxEvents]);

    // Early returns
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }

    if (!client) {
        return null;
    }

    // Now client is guaranteed to be non-null
    const health = client.getHealth();
    const metrics = client.getDebugMetrics();

    const handleClearEvents = useCallback(() => {
        setEvents([]);
    }, []);

    const handleTogglePause = useCallback(() => {
        setIsPaused(prev => !prev);
    }, []);

    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        ...POSITION_STYLES[position],
        zIndex,
        backgroundColor: isOpen
            ? 'rgba(0, 0, 0, 0.94)'
            : isHeaderHovered
              ? 'rgba(40, 40, 40, 0.96)'
              : 'rgba(0, 0, 0, 0.94)',
        color: '#fff',
        borderRadius: 18,
        padding: isOpen ? 0 : '10px 14px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace',
        fontSize: 12,
        width: isOpen ? 480 : 'auto',
        minHeight: isOpen ? 520 : 'auto',
        maxHeight: isOpen ? 620 : 'auto',
        boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        border:
            !isOpen && isHeaderHovered ? '2px solid rgba(255, 255, 255, 0.25)' : '2px solid rgba(255, 255, 255, 0.12)',
        transition: 'all 0.2s ease, transform 0.1s ease',
        overflow: 'hidden',
        cursor: isOpen ? 'default' : 'pointer',
        transform: !isOpen && isHeaderPressed ? 'scale(0.98)' : 'scale(1)',
        ...style,
    };

    const headerStyle: React.CSSProperties = {
        cursor: 'pointer',
        padding: isOpen ? '14px 16px' : '0',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        userSelect: 'none',
        backgroundColor: isOpen ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        borderBottom: isOpen ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        fontSize: 13,
    };

    return (
        <div
            style={containerStyle}
            onClick={() => !isOpen && setIsOpen(true)}
            onMouseEnter={() => setIsHeaderHovered(true)}
            onMouseLeave={() => {
                setIsHeaderHovered(false);
                setIsHeaderPressed(false);
            }}
            onMouseDown={() => !isOpen && setIsHeaderPressed(true)}
            onMouseUp={() => setIsHeaderPressed(false)}
        >
            <div
                style={headerStyle}
                onClick={e => {
                    if (isOpen) {
                        e.stopPropagation();
                        setIsOpen(false);
                    }
                }}
            >
                <BugIcon size={isOpen ? 18 : 16} color="rgb(255, 136, 71)" />
                <span style={{ flex: 1 }}>Connector Debug</span>
                {isOpen && (
                    <span style={{ marginLeft: 'auto' }}>
                        <CloseIcon size={12} color="rgba(255, 255, 255, 0.7)" />
                    </span>
                )}
            </div>

            {isOpen && (
                <>
                    <div
                        style={{
                            display: 'flex',
                            padding: '4px 8px',
                            gap: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                    >
                        {TABS.map(tab => (
                            <TabButton
                                key={tab.id}
                                tab={tab}
                                isActive={activeTab === tab.id}
                                onClick={() => setActiveTab(tab.id)}
                            />
                        ))}
                    </div>

                    <div
                        style={{
                            padding: 16,
                            minHeight: 420,
                            maxHeight: 480,
                            overflow: 'hidden',
                            position: 'relative',
                            transition: 'min-height 0.3s ease',
                        }}
                    >
                        <TabPanel isActive={activeTab === 'overview'}>
                            <EnhancedOverviewTab
                                state={state}
                                health={health}
                                address={address}
                                formatted={formatted}
                                copied={copied}
                                copy={copy}
                                cluster={cluster}
                                rpcUrl={rpcUrl}
                                ready={ready}
                                capabilities={capabilities}
                                client={client}
                            />
                        </TabPanel>

                        {/* <TabPanel isActive={activeTab === 'live'}>
                            <LiveTab client={client} rpcUrl={rpcUrl || ''} />
                        </TabPanel> */}

                        <TabPanel isActive={activeTab === 'transactions'}>
                            <TransactionsTab client={client as any} cluster={cluster} rpcUrl={rpcUrl} />
                        </TabPanel>

                        {/* <TabPanel isActive={activeTab === 'optimization'}>
                            <OptimizationTab />
                        </TabPanel> */}

                        <TabPanel isActive={activeTab === 'events'}>
                            <EventsTab
                                events={events}
                                onClear={handleClearEvents}
                                onPause={handleTogglePause}
                                isPaused={isPaused}
                            />
                        </TabPanel>
                    </div>

                    <div
                        style={{
                            padding: '8px 16px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                            fontSize: 9,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        }}
                    >
                        <span style={{ fontFamily: 'monospace', fontSize: 10 }}>
                            <span style={{ opacity: 0.5 }}>Events</span>{' '}
                            <span style={{ opacity: 1, fontWeight: 600 }}>{events.length}</span>
                        </span>
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 9,
                                fontWeight: 400,
                                fontFamily: 'monospace',
                                padding: '2px 8px',
                                borderRadius: 6,
                                backgroundColor: state.connected
                                    ? 'rgba(0, 255, 0, 0.12)'
                                    : state.connecting
                                      ? 'rgba(255, 255, 0, 0.12)'
                                      : 'rgba(255, 0, 0, 0.12)',
                                border: `1px solid ${state.connected ? 'rgba(0, 255, 0, 0.1)' : state.connecting ? 'rgba(255, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)'}`,
                            }}
                        >
                            <span
                                style={{
                                    position: 'relative',
                                    display: 'inline-block',
                                }}
                            >
                                <span
                                    style={{
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        backgroundColor: state.connected ? '#0f0' : state.connecting ? '#ff0' : '#f00',
                                        display: 'inline-block',
                                    }}
                                />
                                <span
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: 6,
                                        height: 6,
                                        borderRadius: '50%',
                                        backgroundColor: state.connected ? '#0f0' : state.connecting ? '#ff0' : '#f00',
                                        animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                                    }}
                                />
                            </span>
                            <span
                                style={{
                                    color: state.connected ? '#0f0' : state.connecting ? '#ff0' : '#f00',
                                    opacity: 0.9,
                                }}
                            >
                                {state.connected ? 'Connected' : state.connecting ? 'Connecting' : 'Disconnected'}
                            </span>
                        </div>
                    </div>

                    <style>{`
					@keyframes ping {
						75%, 100% {
							transform: translate(-50%, -50%) scale(2);
							opacity: 0;
						}
					}
				`}</style>
                </>
            )}
        </div>
    );
}

/**
 * Tab panel wrapper for smooth transitions
 */
function TabPanel({ isActive, children }: { isActive: boolean; children: React.ReactNode }) {
    return (
        <div
            style={{
                position: 'absolute',
                top: 16,
                left: 16,
                right: 16,
                bottom: 0,
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scale(1)' : 'scale(0.95)',
                filter: isActive ? 'blur(0)' : 'blur(5px)',
                transition:
                    'opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), filter 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: isActive ? 'auto' : 'none',
            }}
        >
            {children}
        </div>
    );
}

/**
 * Type alias for backward compatibility
 * @deprecated Use ConnectorDebugPanel instead
 */
export const DebugPanel = ConnectorDebugPanel;

// Re-export types
export type { DebugPanelProps, TabId } from './types';
