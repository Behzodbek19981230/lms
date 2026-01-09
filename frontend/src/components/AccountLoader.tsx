import React, { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type AccountLoaderProps = {
	title?: string;
	subtitle?: string;
	active?: boolean;
	estimatedMs?: number;
	onComplete?: (durationMs: number) => void;
	fullscreen?: boolean;
	className?: string;
};

export default function AccountLoader({
	// kept for backward compatibility; intentionally not rendered
	title = 'Yuklanmoqda...',
	// kept for backward compatibility; intentionally not rendered
	subtitle,
	active = true,
	estimatedMs = 1200,
	onComplete,
	fullscreen = true,
	className,
}: AccountLoaderProps) {
	const [progress, setProgress] = useState(0);
	const [startTs, setStartTs] = useState<number>(() => performance.now());

	useEffect(() => {
		setProgress(0);
		setStartTs(performance.now());
	}, [active]);

	useEffect(() => {
		let raf = 0;
		let doneTimeout = 0;
		let completeCalled = false;

		const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
		const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

		const tick = (now: number) => {
			const elapsed = now - startTs;
			if (active) {
				const base = clamp(elapsed / Math.max(300, estimatedMs), 0, 1);
				const target = Math.min(95, Math.round(easeOut(base) * 95));
				setProgress((p) => (p >= target ? p : target));
				raf = window.requestAnimationFrame(tick);
				return;
			}

			// finishing: go to 100% smoothly, then notify parent
			const finishMs = 280;
			const base = clamp(elapsed / finishMs, 0, 1);
			const target = Math.round(95 + easeOut(base) * 5);
			setProgress((p) => (p >= target ? p : target));

			if (base < 1) {
				raf = window.requestAnimationFrame(tick);
				return;
			}

			if (!completeCalled && onComplete) {
				completeCalled = true;
				// small delay so 100% is visible
				doneTimeout = window.setTimeout(() => {
					onComplete(Math.max(0, Math.round(performance.now() - startTs)));
				}, 80);
			}
		};

		raf = window.requestAnimationFrame(tick);
		return () => {
			window.cancelAnimationFrame(raf);
			window.clearTimeout(doneTimeout);
		};
	}, [active, estimatedMs, onComplete, startTs]);

	return (
		<div
			role='status'
			aria-live='polite'
			className={cn(
				fullscreen ? 'min-h-screen' : 'h-full',
				'w-full flex items-center justify-center bg-gradient-subtle p-4',
				className
			)}
		>
			<div className='relative w-full max-w-md'>
				<div className='absolute -inset-0.5 rounded-3xl bg-gradient-primary opacity-20 blur-xl animate-pulse-glow' />
				<div className='relative rounded-3xl border border-border/60 bg-gradient-card shadow-card backdrop-blur-sm px-6 py-7 sm:px-8 sm:py-8'>
					<div className='flex items-center justify-center'>
						<div className='relative h-14 w-14 shrink-0'>
							<div className='absolute inset-0 rounded-full bg-primary/10 blur-md animate-pulse-glow' />
							<div className='absolute inset-0 rounded-full border border-border/70' />
							<div className='absolute inset-0 animate-spin'>
								<div className='absolute top-1 left-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full bg-primary shadow-glow' />
								<div className='absolute bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-accent/80' />
							</div>
							<div className='absolute inset-0 flex items-center justify-center'>
								<div className='text-xs font-semibold tabular-nums text-primary'>
									{progress}%
								</div>
								<span className='sr-only'>Yuklanmoqda</span>
							</div>
						</div>
					</div>

					<div
						className='mt-5 h-2 w-full overflow-hidden rounded-full bg-muted'
						role='progressbar'
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={progress}
						aria-label='Yuklanish jarayoni'
					>
						<div
							className='h-full bg-primary/70 transition-[width] duration-200 ease-out'
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
