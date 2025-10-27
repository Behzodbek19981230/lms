import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground hover:bg-primary/90 shadow-card hover:shadow-hover hover:-translate-y-0.5 transition-all',
				destructive:
					'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm hover:shadow-md',
				outline:
					'border-2 border-primary/20 bg-background hover:bg-primary/5 hover:border-primary/40 hover:shadow-sm text-primary',
				secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md',
				ghost: 'hover:bg-accent/50 hover:text-accent-foreground',
				link: 'text-primary underline-offset-4 hover:underline hover:text-primary/80',
				hero: 'bg-gradient-primary text-primary-foreground hover:shadow-glow hover:scale-[1.02] hover:-translate-y-0.5 font-semibold transition-all',
				accent: 'bg-gradient-accent text-accent-foreground hover:shadow-elegant hover:scale-[1.02] font-semibold transition-all',
				glass: 'bg-white/10 backdrop-blur-sm border border-white/20 text-foreground hover:bg-white/20 hover:border-white/30 transition-all duration-300',
			},
			size: {
				default: 'h-9 sm:h-10 px-3 sm:px-4 py-2 text-sm',
				sm: 'h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm',
				lg: 'h-10 sm:h-11 px-6 sm:px-8 text-sm sm:text-base',
				icon: 'h-9 w-9 sm:h-10 sm:w-10',
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : 'button';
		return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
	}
);
Button.displayName = 'Button';

export { Button, buttonVariants };
