'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { request } from '@/configs/request';

export default function AnalyticsTracker() {
	const pathname = usePathname();
	const lastPath = useRef<string | null>(null);

	useEffect(() => {
		if (!pathname) return;
		if (lastPath.current === pathname) return;
		lastPath.current = pathname;

		// Only track account pages (logged-in area)
		if (!pathname.startsWith('/account')) return;

		request
			.post('/analytics/pageview', {
				path: pathname,
				referrer: typeof document !== 'undefined' ? document.referrer : undefined,
			})
			.catch(() => {
				// ignore
			});
	}, [pathname]);

	return null;
}
