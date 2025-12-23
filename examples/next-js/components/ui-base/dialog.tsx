'use client';

import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react/dialog';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

const Dialog = BaseDialog.Root;

const DialogTrigger = BaseDialog.Trigger;

const DialogPortal = BaseDialog.Portal;

const DialogClose = BaseDialog.Close;

const DialogBackdrop = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof BaseDialog.Backdrop>
>(({ className, ...props }, ref) => (
    <BaseDialog.Backdrop
        ref={ref}
        className={cn(
            'fixed inset-0 min-h-dvh z-50 bg-black/50 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 dark:bg-black/80 supports-[-webkit-touch-callout:none]:absolute',
            className,
        )}
        {...props}
    />
));
DialogBackdrop.displayName = 'DialogBackdrop';

const DialogContent = React.forwardRef<
    HTMLDivElement,
    React.ComponentPropsWithoutRef<typeof BaseDialog.Popup> & {
        showCloseButton?: boolean;
    }
>(({ className, children, showCloseButton = true, ...props }, ref) => (
    <DialogPortal>
        <DialogBackdrop />
        <BaseDialog.Popup
            ref={ref}
            className={cn(
                'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 z-[9999]',
                className,
            )}
            {...props}
        >
            {children}
            {showCloseButton && (
                <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 data-[disabled]:pointer-events-none">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </DialogClose>
            )}
        </BaseDialog.Popup>
    </DialogPortal>
));
DialogContent.displayName = 'DialogContent';

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
        {...props}
    />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.ComponentPropsWithoutRef<typeof BaseDialog.Title>
>(({ className, ...props }, ref) => (
    <BaseDialog.Title
        ref={ref}
        className={cn('text-lg font-semibold leading-none tracking-tight', className)}
        {...props}
    />
));
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.ComponentPropsWithoutRef<typeof BaseDialog.Description>
>(({ className, ...props }, ref) => (
    <BaseDialog.Description
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
DialogDescription.displayName = 'DialogDescription';

export {
    Dialog,
    DialogPortal,
    DialogBackdrop,
    DialogClose,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
};
