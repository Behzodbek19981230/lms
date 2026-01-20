'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import WeeklyTestsList from '@/screens/weekly-tests/WeeklyTestsList';

export default function SuperAdminWeeklyTestsPage() {
	const router = useRouter();
	const { user } = useAuth();

	useEffect(() => {
		if (!user) return;
		if (user.role !== 'superadmin') {
			router.replace('/account/profile');
		}
	}, [user, router]);

	return <WeeklyTestsList />;
}
