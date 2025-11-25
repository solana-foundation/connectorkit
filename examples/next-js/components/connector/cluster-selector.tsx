'use client';

import { useCluster } from '@solana/connector/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SolanaClusterId, SolanaCluster } from '@solana/connector';

interface ClusterSelectorProps {
    className?: string;
}

const clusterLabels: Record<string, string> = {
    'mainnet-beta': 'Mainnet',
    devnet: 'Devnet',
    testnet: 'Testnet',
    localnet: 'Localnet',
};

const clusterColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'mainnet-beta': 'default',
    devnet: 'secondary',
    testnet: 'outline',
    localnet: 'destructive',
};

export function ClusterSelector({ className }: ClusterSelectorProps) {
    const { cluster, clusters, setCluster } = useCluster();

    const currentClusterLabel = clusterLabels[cluster?.id || ''] || cluster?.label || 'Unknown';
    const currentClusterColor = clusterColors[cluster?.id || ''] || 'outline';

    const handleClusterChange = async (clusterId: SolanaClusterId) => {
        try {
            await setCluster(clusterId);
        } catch (error) {
            console.error('❌ ClusterSelector: Cluster change failed:', error);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-8', className)}>
                    <Globe className="mr-2 h-3 w-3" />
                    <Badge variant={currentClusterColor} className="mr-2 text-xs">
                        {currentClusterLabel}
                    </Badge>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Select Network</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {clusters.map((c: SolanaCluster) => {
                    const isSelected = c.id === cluster?.id;
                    const label = clusterLabels[c.id] || c.label || c.id;
                    const color = clusterColors[c.id] || 'outline';

                    return (
                        <DropdownMenuItem
                            key={c.id}
                            onClick={() => handleClusterChange(c.id as SolanaClusterId)}
                            className={cn('cursor-pointer', isSelected && 'bg-accent')}
                        >
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <Badge variant={color} className="text-xs">
                                        {label}
                                    </Badge>
                                </div>
                                {isSelected && <Check className="ml-2 h-3 w-3 flex-shrink-0" />}
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
