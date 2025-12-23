'use client';

import * as React from 'react';
import { Menu as BaseMenu } from '@base-ui/react/menu';
import { cn } from '@/lib/utils';

const Menu = BaseMenu.Root;

const MenuTrigger = React.forwardRef<
    HTMLButtonElement,
    React.ComponentPropsWithoutRef<typeof BaseMenu.Trigger>
>(({ className, ...props }, ref) => (
    <BaseMenu.Trigger
        ref={ref}
        className={cn(
            'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground cursor-pointer',
            className,
        )}
        {...props}
    />
));
MenuTrigger.displayName = 'MenuTrigger';

const MenuPortal = BaseMenu.Portal;

const MenuPositioner = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof BaseMenu.Positioner>
>(({ className, sideOffset = 8, ...props }, ref) => (
    <BaseMenu.Positioner
        ref={ref}
        sideOffset={sideOffset}
        className={cn('outline-none select-none z-50', className)}
        {...props}
    />
));
MenuPositioner.displayName = 'MenuPositioner';

const MenuPopup = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof BaseMenu.Popup>
>(({ className, ...props }, ref) => (
    <BaseMenu.Popup
        ref={ref}
        className={cn(
            'origin-[var(--transform-origin)] rounded-md bg-popover p-1 text-popover-foreground shadow-md outline outline-1 outline-border transition-[transform,scale,opacity] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
            className,
        )}
        {...props}
    />
));
MenuPopup.displayName = 'MenuPopup';

const MenuItem = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof BaseMenu.Item>
>(({ className, ...props }, ref) => (
    <BaseMenu.Item
        ref={ref}
        className={cn(
            'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
            className,
        )}
        {...props}
    />
));
MenuItem.displayName = 'MenuItem';

const MenuSeparator = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof BaseMenu.Separator>
>(({ className, ...props }, ref) => (
    <BaseMenu.Separator
        ref={ref}
        className={cn('-mx-1 my-1 h-px bg-muted', className)}
        {...props}
    />
));
MenuSeparator.displayName = 'MenuSeparator';

const MenuGroup = BaseMenu.Group;

const MenuGroupLabel = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel>
>(({ className, ...props }, ref) => (
    <BaseMenu.GroupLabel
        ref={ref}
        className={cn('px-2 py-1.5 text-sm font-semibold', className)}
        {...props}
    />
));
MenuGroupLabel.displayName = 'MenuGroupLabel';

export {
    Menu,
    MenuTrigger,
    MenuPortal,
    MenuPositioner,
    MenuPopup,
    MenuItem,
    MenuSeparator,
    MenuGroup,
    MenuGroupLabel,
};
