'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Index from '@/screens/Index';
import { getToken } from '@/utils/auth';

export default function HomePage() {
	const router = useRouter();

	useEffect(() => {
		const token = getToken();
		if (token) router.replace('/account');
	}, [router]);

	return <Index />;
}
