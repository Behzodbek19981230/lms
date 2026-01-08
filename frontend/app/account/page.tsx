'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const roleHome: Record<string, string> = {
	superadmin: '/account/superadmin',
	admin: '/account/admin',
	teacher: '/account/teacher',
	student: '/account/student',
};

export default function AccountIndexPage() {
	const { user } = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (!user) return;
		const target = roleHome[user.role];
		if (target) router.replace(target);
	}, [user, router]);

	return null;
}
