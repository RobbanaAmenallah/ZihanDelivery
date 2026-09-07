import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// eslint-disable-next-line react-refresh/only-export-components
export const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        // Bleu principal ZIHAN (#1B3D87)
        default:
          'bg-[#1B3D87] text-white shadow-sm hover:bg-[#15316E] active:bg-[#102555] dark:bg-blue-600 dark:hover:bg-blue-700',
        // Bleu secondaire ZIHAN (#1D5AA5)
        secondary:
          'bg-[#EEF3F9] text-[#1B3D87] hover:bg-[#DCE3EC] border border-[#DCE3EC]/60 dark:bg-slate-800 dark:text-blue-400 dark:border-slate-700 dark:hover:bg-slate-700',
        // Rouge principal ZIHAN (#EA4E52) pour actions critiques & express
        accent:
          'bg-[#EA4E52] text-white shadow-sm hover:bg-[#D93D41] active:bg-[#C83236] dark:bg-[#EF4D52] dark:hover:bg-[#D93D41]',
        destructive:
          'bg-[#EA4E52] text-white shadow-sm hover:bg-[#D93D41] dark:bg-[#EF4D52]',
        // Contour épuré
        outline:
          'border border-border bg-background shadow-xs hover:bg-muted hover:text-foreground text-[#162033] dark:text-slate-200',
        // Discret
        ghost:
          'hover:bg-muted text-[#162033] hover:text-[#1B3D87] dark:text-slate-300 dark:hover:text-white',
        // Lien
        link: 'text-[#1B3D87] underline-offset-4 hover:underline dark:text-blue-400 p-0 h-auto',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-xl px-6 text-base font-semibold',
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0 rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            <span>{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="mr-2 inline-flex">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button };
