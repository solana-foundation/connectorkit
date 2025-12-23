'use client';

import * as React from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-800 focus-visible:-outline-offset-1 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer',
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow hover:bg-primary/90 active:bg-primary/80',
                destructive:
                    'bg-destructive text-white shadow-sm hover:bg-destructive/90 active:bg-destructive/80',
                outline:
                    'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
                secondary:
                    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 active:bg-secondary/70',
                ghost: 'hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
                link: 'text-primary underline-offset-4 hover:underline',
            },
            size: {
                default: 'h-9 px-4 py-2 rounded-md',
                sm: 'h-8 rounded-md px-3 text-xs',
                lg: 'h-10 rounded-md px-8',
                icon: 'h-9 w-9 rounded-md',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
);

interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        return (
            <BaseButton
                ref={ref}
                className={cn(buttonVariants({ variant, size }), className)}
                {...props}
            />
        );
    },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
