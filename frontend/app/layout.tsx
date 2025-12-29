import type { Metadata } from 'next';
import './globals.css';
import Providers from '../providers';

export const metadata: Metadata = {
	title: 'EduOne  - Ta\'limni Raqamlashtirish',
	description: 'EduOne  - zamonaviy ta\'lim boshqaruv tizimi. Testlar yaratish, baholash, o\'quvchilar monitoringi va akademik muvaffaqiyatni kuzatish uchun mukammal platforma.',
	openGraph: {
		title: 'EduOne  - Ta\'limni Raqamlashtirish',
		description: 'EduOne  - zamonaviy ta\'lim boshqaruv tizimi. Testlar yaratish, baholash, o\'quvchilar monitoringi va akademik muvaffaqiyatni kuzatish uchun mukammal platforma.',
		url: 'https://lms.universal-uz.uz/',
		siteName: 'EduOne ',
		images: [
			{
				url: '/hero-education.jpg',
				width: 1200,
				height: 630,
				alt: 'EduOne - Ta\'lim Boshqaruv Tizimi',
			},
		],
		locale: 'uz_UZ',
		type: 'website',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'EduOne - Ta\'limni Raqamlashtirish',
		description: 'EduOne - zamonaviy ta\'lim boshqaruv tizimi. Testlar yaratish, baholash, o\'quvchilar monitoringi va akademik muvaffaqiyatni kuzatish uchun mukammal platforma.',
		images: ['/hero-education.jpg'],
	},
	keywords: ['ta\'lim', 'testlar', 'baholash', 'o\'quvchilar', 'monitoring', 'akademik', 'platforma', 'EduOne'],
	authors: [{ name: 'EduOne Team' }],
	creator: 'EduOne',
	publisher: 'EduOne',
	robots: 'index, follow',
	viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang='uz' suppressHydrationWarning>
			<body>
                <Providers>{children}</Providers>
            </body>
		</html>
	);

}
