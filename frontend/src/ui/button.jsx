import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const buttonVariants = {
  variant: {
    default:
      'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/95',
    destructive:
      'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
    outline:
      'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    success: 'bg-success text-success-foreground shadow-sm hover:bg-success/90',
    link: 'text-primary underline-offset-4 hover:underline',
  },
  size: {
    default: 'h-10 px-4 py-2',
    xs: 'h-8 rounded-md px-2.5 text-xs',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-lg px-8',
    icon: 'h-10 w-10',
  },
};

const Button = React.forwardRef(
  ({ className, variant = 'default', size = 'default', asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const variantClasses = buttonVariants.variant[variant] || buttonVariants.variant.default;
    const sizeClasses = buttonVariants.size[size] || buttonVariants.size.default;
    return (
      <Comp
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
          variantClasses,
          sizeClasses,
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };

