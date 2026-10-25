import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/waypoint/utils';

// Feedback (hover tint, tap tint + press-in, focus ring, disabled) comes from the shared
// `btn` utilities in globals.css, so Waypoint buttons behave like Budget's and Recipes'.
const buttonVariants = cva('btn inline-flex whitespace-nowrap text-sm', {
  variants: {
    variant: {
      default: 'btn-primary',
      destructive: 'btn-destructive',
      outline: 'btn-outline',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-gridline active:bg-gridline',
      ghost: 'hover:bg-surface-muted hover:text-foreground active:bg-surface-muted',
      link: 'text-primary underline-offset-4 hover:underline active:opacity-70',
    },
    // Phones get a 44px tap height; from sm up (mouse) the compact sizes.
    size: {
      default: 'h-11 px-5 py-2 sm:h-10',
      sm: 'h-11 px-4 sm:h-9',
      lg: 'h-11 px-8',
      icon: 'h-11 w-11 sm:h-10 sm:w-10',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
