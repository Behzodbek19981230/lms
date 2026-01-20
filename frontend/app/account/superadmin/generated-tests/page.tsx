'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import GeneratedTestsPage from '@/screens/GeneratedTests';

export default function SuperAdminGeneratedTestsPage() {
	const router = useRouter();
	const { user } = useAuth();

	useEffect(() => {
		if (!user) return;
		if (user.role !== 'superadmin') {
			router.replace('/account/profile');
		}
	}, [user, router]);

	return <GeneratedTestsPage />;
}
