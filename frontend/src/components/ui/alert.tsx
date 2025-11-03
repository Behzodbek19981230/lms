import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const alertVariants = cva(
	'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground transition-all duration-300 hover:shadow-sm',
	{
		variants: {
			variant: {
				default: 'bg-background text-foreground border-border/60',
				destructive:
					'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive bg-destructive/5',
				success: 'border-green-500/50 text-green-700 dark:border-green-500 [&>svg]:text-green-500 bg-green-50',
				warning:
					'border-yellow-500/50 text-yellow-700 dark:border-yellow-500 [&>svg]:text-yellow-500 bg-yellow-50',
				info: 'border-blue-500/50 text-blue-700 dark:border-blue-500 [&>svg]:text-blue-500 bg-blue-50',
				telegram:
					'border-blue-500/50 text-blue-700 dark:border-blue-500 [&>svg]:text-blue-500 bg-gradient-to-r from-blue-50 to-purple-50',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	}
);

const Alert = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
	<div ref={ref} role='alert' className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
	({ className, ...props }, ref) => (
		<h5 ref={ref} className={cn('mb-1 font-semibold leading-none tracking-tight', className)} {...props} />
	)
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
	)
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
