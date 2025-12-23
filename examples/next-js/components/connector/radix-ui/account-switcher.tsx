'use client';

import { useAccount } from '@solana/connector/react';
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
import { Check, ChevronDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AccountSwitcherProps {
    className?: string;
}

export function AccountSwitcher({ className }: AccountSwitcherProps) {
    const { accounts, address, selectAccount, connected } = useAccount();

    if (!connected || accounts.length === 0) {
        return null;
    }

    // Only show switcher if there are multiple accounts
    if (accounts.length === 1) {
        return null;
    }

    const shortAddress = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : 'No account';

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className={cn('h-8', className)}>
                    <User className="mr-2 h-3 w-3" />
                    <span className="font-mono text-xs">{shortAddress}</span>
                    <ChevronDown className="ml-2 h-3 w-3 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Switch Account</span>
                    <Badge variant="secondary" className="text-xs">
                        {accounts.length}
                    </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {accounts.map(account => {
                    const isSelected = account.address === address;
                    const short = `${account.address.slice(0, 6)}...${account.address.slice(-6)}`;

                    return (
                        <DropdownMenuItem
                            key={account.address}
                            onClick={() => selectAccount(account.address)}
                            className={cn('font-mono text-xs cursor-pointer', isSelected && 'bg-accent')}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="truncate">{short}</span>
                                {isSelected && <Check className="ml-2 h-3 w-3 flex-shrink-0" />}
                            </div>
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
