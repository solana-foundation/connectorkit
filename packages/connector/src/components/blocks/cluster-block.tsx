'use client';

import React from 'react';
import type { ReactNode } from 'react';
import { useCluster } from '../../hooks/use-cluster';
import type { SolanaCluster, SolanaClusterId } from '@wallet-ui/core';

export interface ClusterBlockRenderProps {
    cluster: SolanaCluster | null;
    clusters: SolanaCluster[];
    setCluster: (id: SolanaClusterId) => Promise<void>;
    isMainnet: boolean;
    isDevnet: boolean;
    isTestnet: boolean;
    isLocal: boolean;
}

export interface ClusterBlockProps {
    /** Display variant */
    variant?: 'badge' | 'select' | 'menuitem';
    /** Custom className */
    className?: string;
    /** Whether the cluster can be changed */
    allowChange?: boolean;
    /** Show cluster icon/indicator */
    showIndicator?: boolean;
    /** Custom cluster labels */
    labels?: Partial<Record<string, string>>;
    /** Custom render function for full control */
    render?: (props: ClusterBlockRenderProps) => ReactNode;
}

const DEFAULT_LABELS: Record<string, string> = {
    'mainnet-beta': 'Mainnet',
    'devnet': 'Devnet',
    'testnet': 'Testnet',
    'localnet': 'Localnet',
};

function getClusterColor(clusterId: string): string {
    switch (clusterId) {
        case 'mainnet-beta':
            return 'var(--ck-cluster-mainnet, #22c55e)';
        case 'devnet':
            return 'var(--ck-cluster-devnet, #3b82f6)';
        case 'testnet':
            return 'var(--ck-cluster-testnet, #eab308)';
        case 'localnet':
            return 'var(--ck-cluster-localnet, #ef4444)';
        default:
            return 'var(--ck-cluster-custom, #8b5cf6)';
    }
}

/**
 * Block for displaying and optionally changing the current cluster/network.
 * 
 * @example Badge (read-only)
 * ```tsx
 * <ClusterBlock variant="badge" />
 * ```
 * 
 * @example Select (changeable)
 * ```tsx
 * <ClusterBlock variant="select" allowChange />
 * ```
 * 
 * @example Custom render
 * ```tsx
 * <ClusterBlock
 *   render={({ cluster, clusters, setCluster }) => (
 *     <Select value={cluster?.id} onValueChange={setCluster}>
 *       {clusters.map(c => (
 *         <SelectItem key={c.id} value={c.id}>
 *           {c.label}
 *         </SelectItem>
 *       ))}
 *     </Select>
 *   )}
 * />
 * ```
 */
export function ClusterBlock({
    variant = 'badge',
    className,
    allowChange = false,
    showIndicator = true,
    labels = {},
    render,
}: ClusterBlockProps) {
    const { cluster, clusters, setCluster, isMainnet, isDevnet, isTestnet, isLocal } = useCluster();
    const [isOpen, setIsOpen] = React.useState(false);
    
    // Custom render
    if (render) {
        return <>{render({ cluster, clusters, setCluster, isMainnet, isDevnet, isTestnet, isLocal })}</>;
    }
    
    if (!cluster) return null;
    
    const allLabels = { ...DEFAULT_LABELS, ...labels };
    const displayLabel = allLabels[cluster.id] || cluster.label || cluster.id;
    const color = getClusterColor(cluster.id);
    
    const indicator = showIndicator && (
        <span 
            className="ck-cluster-indicator"
            style={{ backgroundColor: color }}
            data-slot="cluster-block-indicator"
            aria-hidden="true"
        />
    );
    
    // Badge variant
    if (variant === 'badge') {
        return (
            <span 
                className={`ck-cluster-block ck-cluster-block--badge ${className || ''}`}
                data-slot="cluster-block"
                data-variant="badge"
                data-cluster={cluster.id}
            >
                {indicator}
                <span data-slot="cluster-block-label">{displayLabel}</span>
            </span>
        );
    }
    
    // Menu item variant (for dropdowns)
    if (variant === 'menuitem') {
        if (!allowChange) {
            return (
                <div 
                    className={`ck-cluster-block ck-cluster-block--menuitem ${className || ''}`}
                    role="menuitem"
                    data-slot="cluster-block"
                    data-variant="menuitem"
                    data-cluster={cluster.id}
                >
                    {indicator}
                    <span data-slot="cluster-block-label">{displayLabel}</span>
                </div>
            );
        }
        
        // Submenu for changing cluster
        return (
            <div 
                className={`ck-cluster-block ck-cluster-block--menuitem ${className || ''}`}
                data-slot="cluster-block"
                data-variant="menuitem"
                data-cluster={cluster.id}
            >
                <button
                    type="button"
                    className="ck-cluster-block-trigger"
                    onClick={() => setIsOpen(!isOpen)}
                    data-slot="cluster-block-trigger"
                >
                    {indicator}
                    <span data-slot="cluster-block-label">{displayLabel}</span>
                    <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`ck-cluster-block-chevron ${isOpen ? 'ck-cluster-block-chevron--open' : ''}`}
                        data-slot="cluster-block-chevron"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                </button>
                {isOpen && (
                    <div className="ck-cluster-block-options" data-slot="cluster-block-options">
                        {clusters.map((c: SolanaCluster) => {
                            const cLabel = allLabels[c.id] || c.label || c.id;
                            const cColor = getClusterColor(c.id);
                            const isSelected = c.id === cluster.id;
                            
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    className={`ck-cluster-block-option ${isSelected ? 'ck-cluster-block-option--selected' : ''}`}
                                    onClick={() => {
                                        setCluster(c.id as SolanaClusterId);
                                        setIsOpen(false);
                                    }}
                                    data-slot="cluster-block-option"
                                    data-selected={isSelected}
                                >
                                    <span 
                                        className="ck-cluster-indicator"
                                        style={{ backgroundColor: cColor }}
                                        data-slot="cluster-block-indicator"
                                    />
                                    <span>{cLabel}</span>
                                    {isSelected && (
                                        <svg 
                                            width="12" 
                                            height="12" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            className="ck-cluster-block-check"
                                            data-slot="cluster-block-check"
                                        >
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }
    
    // Select variant
    return (
        <div 
            className={`ck-cluster-block ck-cluster-block--select ${className || ''}`}
            data-slot="cluster-block"
            data-variant="select"
            data-cluster={cluster.id}
        >
            <button
                type="button"
                className="ck-cluster-block-trigger"
                onClick={() => setIsOpen(!isOpen)}
                disabled={!allowChange}
                data-slot="cluster-block-trigger"
            >
                {indicator}
                <span data-slot="cluster-block-label">{displayLabel}</span>
                {allowChange && (
                    <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`ck-cluster-block-chevron ${isOpen ? 'ck-cluster-block-chevron--open' : ''}`}
                        data-slot="cluster-block-chevron"
                    >
                        <polyline points="6 9 12 15 18 9" />
                    </svg>
                )}
            </button>
            {isOpen && allowChange && (
                <>
                    <div 
                        className="ck-cluster-block-backdrop"
                        onClick={() => setIsOpen(false)}
                        aria-hidden="true"
                    />
                    <div className="ck-cluster-block-options" data-slot="cluster-block-options">
                        {clusters.map((c: SolanaCluster) => {
                            const cLabel = allLabels[c.id] || c.label || c.id;
                            const cColor = getClusterColor(c.id);
                            const isSelected = c.id === cluster.id;
                            
                            return (
                                <button
                                    key={c.id}
                                    type="button"
                                    className={`ck-cluster-block-option ${isSelected ? 'ck-cluster-block-option--selected' : ''}`}
                                    onClick={() => {
                                        setCluster(c.id as SolanaClusterId);
                                        setIsOpen(false);
                                    }}
                                    data-slot="cluster-block-option"
                                    data-selected={isSelected}
                                >
                                    <span 
                                        className="ck-cluster-indicator"
                                        style={{ backgroundColor: cColor }}
                                        data-slot="cluster-block-indicator"
                                    />
                                    <span>{cLabel}</span>
                                    {isSelected && (
                                        <svg 
                                            width="12" 
                                            height="12" 
                                            viewBox="0 0 24 24" 
                                            fill="none" 
                                            stroke="currentColor"
                                            strokeWidth="3"
                                            className="ck-cluster-block-check"
                                            data-slot="cluster-block-check"
                                        >
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

ClusterBlock.displayName = 'ClusterBlock';


