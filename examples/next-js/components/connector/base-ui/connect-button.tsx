'use client';

import { useConnector } from '@solana/connector/react';
import { useState } from 'react';
import { WalletModal } from './wallet-modal';
import { WalletDropdownContent } from './wallet-dropdown-content';
import { Button } from '@/components/ui-base/button';
import { Menu, MenuTrigger, MenuPortal, MenuPositioner, MenuPopup } from '@/components/ui-base/menu';
import { Wallet, ChevronDown } from 'lucide-react';

interface ConnectButtonProps {
    className?: string;
}

// Custom Avatar component for Base UI
function Avatar({
    src,
    alt,
    fallback,
    className,
}: {
    src?: string;
    alt?: string;
    fallback?: React.ReactNode;
    className?: string;
}) {
    const [hasError, setHasError] = useState(false);

    return (
        <div className={`relative flex shrink-0 overflow-hidden rounded-full ${className}`}>
            {src && !hasError ? (
                <img
                    src={src}
                    alt={alt}
                    className="aspect-square h-full w-full object-cover"
                    onError={() => setHasError(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted">{fallback}</div>
            )}
        </div>
    );
}

// Spinner component
function Spinner({ className }: { className?: string }) {
    return (
        <div
            className={`animate-spin rounded-full border-2 border-current border-t-transparent ${className || 'h-4 w-4'}`}
        />
    );
}

export function ConnectButton({ className }: ConnectButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const {
        isConnected,
        isConnecting,
        account,
        connector,
        walletConnectUri,
        clearWalletConnectUri,
    } = useConnector();

    if (isConnected && account && connector) {
        const shortAddress = `${account.slice(0, 4)}...${account.slice(-4)}`;
        const walletIcon = connector.icon || undefined;

        return (
            <Menu>
                <MenuTrigger className={`h-8 px-3 ${className || ''}`}>
                    <Avatar
                        src={walletIcon}
                        alt={connector.name}
                        fallback={<Wallet className="h-3 w-3" />}
                        className="h-5 w-5"
                    />
                    <span className="text-xs">{shortAddress}</span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </MenuTrigger>
                <MenuPortal>
                    <MenuPositioner sideOffset={8} align="end">
                        <MenuPopup className="rounded-[20px] p-0 outline-none">
                            <WalletDropdownContent
                                selectedAccount={account}
                                walletIcon={walletIcon}
                                walletName={connector.name}
                            />
                        </MenuPopup>
                    </MenuPositioner>
                </MenuPortal>
            </Menu>
        );
    }

    // Show loading button when connecting (but modal stays rendered)
    const buttonContent = isConnecting ? (
        <>
            <Spinner className="h-4 w-4" />
            <span className="text-xs">Connecting...</span>
        </>
    ) : (
        <span className="!text-[14px]">Connect Wallet</span>
    );

    return (
        <>
            <Button size="sm" variant="outline" onClick={() => setIsModalOpen(true)} className={className}>
                {buttonContent}
            </Button>
            <WalletModal
                open={isModalOpen}
                onOpenChange={open => {
                    setIsModalOpen(open);
                    // Clear WalletConnect URI when modal closes
                    if (!open) {
                        clearWalletConnectUri();
                    }
                }}
                walletConnectUri={walletConnectUri}
                onClearWalletConnectUri={clearWalletConnectUri}
            />
        </>
    );
}
