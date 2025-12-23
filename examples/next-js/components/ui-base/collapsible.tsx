'use client';

import * as React from 'react';
import { Collapsible as BaseCollapsible } from '@base-ui/react/collapsible';
import { cn } from '@/lib/utils';

const Collapsible = BaseCollapsible.Root;

const CollapsibleTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<typeof BaseCollapsible.Trigger>
>(({ className, ...props }, ref) => (
    <BaseCollapsible.Trigger
        ref={ref}
        className={cn(
            'flex w-full items-center justify-between py-2 text-sm font-medium transition-all hover:underline [&[data-panel-open]>svg]:rotate-180',
            className,
        )}
        {...props}
    />
));
CollapsibleTrigger.displayName = 'CollapsibleTrigger';

const CollapsibleContent = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof BaseCollapsible.Panel>
>(({ className, ...props }, ref) => (
    <BaseCollapsible.Panel
        ref={ref}
        className={cn(
            'h-[var(--collapsible-panel-height)] overflow-hidden transition-all data-[ending-style]:h-0 data-[starting-style]:h-0',
            className,
        )}
        {...props}
    />
));
CollapsibleContent.displayName = 'CollapsibleContent';

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
