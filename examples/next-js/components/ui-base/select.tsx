'use client';

import * as React from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';

const Select = BaseSelect.Root;

const SelectTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>>(
    ({ className, children, ...props }, ref) => (
        <BaseSelect.Trigger
            ref={ref}
            className={cn(
                'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background select-none cursor-pointer hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-blue-800 data-[popup-open]:bg-accent data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
                className,
            )}
            {...props}
        >
            {children}
            <BaseSelect.Icon className="flex shrink-0">
                <ChevronDown className="h-4 w-4 opacity-50" />
            </BaseSelect.Icon>
        </BaseSelect.Trigger>
    ),
);
SelectTrigger.displayName = 'SelectTrigger';

const SelectValue = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Value>>(
    ({ className, ...props }, ref) => (
        <BaseSelect.Value ref={ref} className={cn('block truncate', className)} {...props} />
    ),
);
SelectValue.displayName = 'SelectValue';

const SelectPortal = BaseSelect.Portal;

const SelectPositioner = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Positioner>>(
    ({ className, sideOffset = 4, ...props }, ref) => (
        <BaseSelect.Positioner
            ref={ref}
            sideOffset={sideOffset}
            className={cn('outline-none select-none z-50', className)}
            {...props}
        />
    ),
);
SelectPositioner.displayName = 'SelectPositioner';

const SelectPopup = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Popup>>(
    ({ className, children, ...props }, ref) => (
        <BaseSelect.Popup
            ref={ref}
            className={cn(
                'min-w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md transition-[transform,scale,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                className,
            )}
            {...props}
        >
            <BaseSelect.ScrollUpArrow className="flex h-6 w-full cursor-default items-center justify-center bg-popover text-center text-xs" />
            <BaseSelect.List className="max-h-[var(--available-height)] overflow-y-auto p-1">
                {children}
            </BaseSelect.List>
            <BaseSelect.ScrollDownArrow className="flex h-6 w-full cursor-default items-center justify-center bg-popover text-center text-xs" />
        </BaseSelect.Popup>
    ),
);
SelectPopup.displayName = 'SelectPopup';

const SelectItem = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Item>>(
    ({ className, children, ...props }, ref) => (
        <BaseSelect.Item
            ref={ref}
            className={cn(
                'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                className,
            )}
            {...props}
        >
            <BaseSelect.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                <Check className="h-4 w-4" />
            </BaseSelect.ItemIndicator>
            <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
        </BaseSelect.Item>
    ),
);
SelectItem.displayName = 'SelectItem';

const SelectSeparator = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.Separator>>(
    ({ className, ...props }, ref) => (
        <BaseSelect.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />
    ),
);
SelectSeparator.displayName = 'SelectSeparator';

const SelectGroup = BaseSelect.Group;

const SelectGroupLabel = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof BaseSelect.GroupLabel>>(
    ({ className, ...props }, ref) => (
        <BaseSelect.GroupLabel
            ref={ref}
            className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)}
            {...props}
        />
    ),
);
SelectGroupLabel.displayName = 'SelectGroupLabel';

export {
    Select,
    SelectTrigger,
    SelectValue,
    SelectPortal,
    SelectPositioner,
    SelectPopup,
    SelectItem,
    SelectSeparator,
    SelectGroup,
    SelectGroupLabel,
};
