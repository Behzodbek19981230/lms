import type { Metadata } from 'next';
import './globals.css';
import Providers from '../providers';

export const metadata: Metadata = {
	title: 'EduNimbus Connect',
	description: 'Migrated to Next.js App Router',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang='en' suppressHydrationWarning>
			<body>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
