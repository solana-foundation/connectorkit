/* eslint-disable @next/next/no-img-element */
import { cn } from '@/lib/utils';

interface WalletIconSource {
    id: string;
    name: string;
    icon?: string | null;
}

interface HiddenWalletIconsProps {
    wallets: WalletIconSource[];
    maxIcons?: number;
    className?: string;
}

export function HiddenWalletIcons({ wallets, maxIcons = 4, className }: HiddenWalletIconsProps) {
    const previewWallets = wallets.slice(0, maxIcons);
    const placeholderCount = Math.max(0, maxIcons - previewWallets.length);

    return (
        <div className={cn('grid grid-cols-2 gap-1', className)} aria-hidden="true">
            {previewWallets.map(wallet => (
                <div
                    key={wallet.id}
                    className="relative h-4.5 w-4.5 overflow-hidden rounded-full border border-border bg-muted"
                >
                    {wallet.icon ? (
                        <img
                            src={wallet.icon}
                            alt=""
                            className="h-full w-full object-cover"
                            draggable={false}
                            onError={e => {
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                    ) : null}
                </div>
            ))}
            {Array.from({ length: placeholderCount }).map((_, index) => (
                <div key={`placeholder-${index}`} className="h-4.5 w-4.5 rounded-full border border-border bg-muted" />
            ))}
        </div>
    );
}
