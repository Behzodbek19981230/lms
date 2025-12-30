'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Book,
	Users2,
	DollarSign,
	ChevronRight,
	CheckCircle2,
	ArrowRight,
	FileText,
	UserCheck,
} from 'lucide-react';
import Link from 'next/link';

export default function UserGuidePage() {
	const { user } = useAuth();
	const [activeSection, setActiveSection] = useState<string | null>(null);

	const adminGuide = [
		{
			id: 'subjects',
			title: '1. Fan yaratish va o\'qituvchilarni biriktirish',
			icon: Book,
			steps: [
				{
					step: 1,
					title: 'Fanlar sahifasiga kirish',
					description: 'Yon panel menyusidan "Mening fanlarim" bo\'limiga o\'ting.',
					action: 'Sahifa: /account/subjects',
					details: [
						'Yon panelda "Mening fanlarim" tugmasini bosing',
						'Yoki to\'g\'ridan-to\'g\'ri /account/subjects manziliga o\'ting',
					],
				},
				{
					step: 2,
					title: 'Yangi fan qo\'shish',
					description: 'Sahifaning yuqori qismida "Yangi fan qo\'shish" tugmasini bosing.',
					action: 'Tugma: "Yangi fan qo\'shish"',
					details: [
						'Dialog ochiladi',
						'Fan nomini kiriting (masalan: "Matematika", "Fizika")',
						'"Saqlash" tugmasini bosing',
					],
				},
				{
					step: 3,
					title: 'O\'qituvchilarni biriktirish',
					description: 'Yaratilgan fanga o\'qituvchilarni biriktirish.',
					action: 'Har bir fan qatorida "Teacher biriktirish" tugmasini bosing',
					details: [
						'Fanlar ro\'yxatida har bir fan qatorida "..." (uch nuqta) tugmasini bosing',
						'"Teacher biriktirish" variantini tanlang',
						'Dialogda mavjud o\'qituvchilar ro\'yxati ko\'rsatiladi',
						'Kerakli o\'qituvchilarni belgilang (checkbox)',
						'"Saqlash" tugmasini bosing',
					],
				},
				{
					step: 4,
					title: 'Biriktirilgan o\'qituvchilarni ko\'rish',
					description: 'Qaysi o\'qituvchilar fanga biriktirilganini ko\'rish.',
					action: 'Fan qatorida "Biriktirilgan o\'qituvchilarni ko\'rish"',
					details: [
						'Fan qatorida "..." (uch nuqta) tugmasini bosing',
						'"Biriktirilgan o\'qituvchilarni ko\'rish" variantini tanlang',
						'Dialogda biriktirilgan barcha o\'qituvchilar ro\'yxati ko\'rsatiladi',
					],
				},
			],
		},
		{
			id: 'groups',
			title: '2. Guruh yaratish',
			icon: Users2,
			steps: [
				{
					step: 1,
					title: 'Guruhlar sahifasiga kirish',
					description: 'Yon panel menyusidan "Guruhlar" bo\'limiga o\'ting.',
					action: 'Sahifa: /account/groups',
					details: [
						'Yon panelda "Guruhlar" tugmasini bosing',
						'Yoki to\'g\'ridan-to\'g\'ri /account/groups manziliga o\'ting',
					],
				},
				{
					step: 2,
					title: 'Yangi guruh yaratish',
					description: 'Sahifaning yuqori qismida "Yangi guruh" tugmasini bosing.',
					action: 'Tugma: "Yangi guruh"',
					details: [
						'Yangi sahifaga o\'tadi: /account/groups/new',
						'Guruh ma\'lumotlarini to\'ldiring',
					],
				},
				{
					step: 3,
					title: 'Guruh ma\'lumotlarini to\'ldirish',
					description: 'Guruh uchun asosiy ma\'lumotlarni kiriting.',
					action: 'Forma to\'ldirish',
					details: [
						'<b>Guruh nomi:</b> Masalan "Matematika 1-guruh"',
						'<b>Fan:</b> Dropdown\'dan fan tanlang (majburiy)',
						'<b>O\'qituvchi:</b> Dropdown\'dan o\'qituvchi tanlang (majburiy)',
						'<b>Tavsif:</b> Ixtiyoriy tavsif',
					],
				},
				{
					step: 4,
					title: 'Dars jadvalini belgilash',
					description: 'Guruh uchun dars kunlarini va vaqtlarini belgilash.',
					action: 'Dars jadvali bo\'limi',
					details: [
						'Har bir kun uchun checkbox belgilang',
						'Belgilangan kunlar uchun vaqt kiriting (masalan: "09:00 - 10:30")',
					],
				},
				{
					step: 5,
					title: 'O\'quvchilarni tanlash',
					description: 'Guruhga o\'quvchilarni qo\'shish.',
					action: 'O\'quvchilar bo\'limi',
					details: [
						'Search qutisidan o\'quvchi qidiring',
						'Kerakli o\'quvchilarni checkbox bilan tanlang',
						'"Barcha tanlanganlarni tanlash" tugmasidan foydalaning',
						'Tanlangan o\'quvchilar soni ko\'rsatiladi',
					],
				},
				{
					step: 6,
					title: 'Guruhni saqlash',
					description: 'Barcha ma\'lumotlarni to\'ldirib, guruhni yaratish.',
					action: 'Tugma: "Guruh yaratish"',
					details: [
						'Barcha majburiy maydonlar to\'ldirilganligini tekshiring',
						'"Guruh yaratish" tugmasini bosing',
						'Muvaffaqiyatli yaratilgandan so\'ng guruhlar ro\'yxatiga qaytadi',
					],
				},
			],
		},
		{
			id: 'payments',
			title: '3. To\'lovlar qismi',
			icon: DollarSign,
			steps: [
				{
					step: 1,
					title: 'To\'lovlar sahifasiga kirish',
					description: 'Yon panel menyusidan "To\'lovlar" bo\'limiga o\'ting.',
					action: 'Sahifa: /account/payments',
					details: [
						'Yon panelda "To\'lovlar" tugmasini bosing',
						'Yoki to\'g\'ridan-to\'g\'ri /account/payments manziliga o\'ting',
					],
				},
				{
					step: 2,
					title: 'Oylik to\'lovlar jadvalini ko\'rish',
					description: 'Oylik to\'lovlar jadvalida o\'quvchilar va ularning to\'lov holatini ko\'rish.',
					action: 'Oylik to\'lovlar bo\'limi',
					details: [
						'Oy tanlash dropdown\'dan kerakli oyni tanlang',
						'Jadvalda quyidagi ma\'lumotlar ko\'rsatiladi:',
						'  - O\'quvchi ismi va familiyasi',
						'  - Guruh nomi',
						'  - Qo\'shilgan sana',
						'  - Oylik summa',
						'  - Muddat va jami summa',
						'  - To\'langan summa',
						'  - Qoldiq summa',
						'  - Holat (Kutilayotgan/To\'langan/Kechikkan)',
					],
				},
				{
					step: 3,
					title: 'Yangi to\'lov yaratish',
					description: 'O\'quvchiga yangi to\'lov yaratish.',
					action: 'Tugma: "Yangi to\'lov"',
					details: [
						'Sahifaning yuqori qismida "Yangi to\'lov" tugmasini bosing',
						'Dialog ochiladi',
						'<b>Guruh:</b> Dropdown\'dan guruh tanlang (majburiy)',
						'<b>O\'quvchi:</b> Dropdown\'dan o\'quvchi tanlang (majburiy)',
						'<b>Summa:</b> To\'lov summasini kiriting',
						'"Yaratish" tugmasini bosing',
					],
				},
				{
					step: 4,
					title: 'To\'lov kiritish',
					description: 'O\'quvchidan to\'lov qabul qilish.',
					action: 'Jadvalda "To\'lov kiritish" tugmasi',
					details: [
						'Oylik to\'lovlar jadvalida o\'quvchi qatorida "..." (uch nuqta) tugmasini bosing',
						'"To\'lov kiritish" variantini tanlang',
						'Dialogda:',
						'  - <b>Oy:</b> Dropdown\'dan oyni tanlang',
						'  - <b>To\'langan summa:</b> Qabul qilingan summani kiriting',
						'  - <b>Izoh:</b> Ixtiyoriy izoh',
						'"Kiritish" tugmasini bosing',
					],
				},
				{
					step: 5,
					title: 'O\'quvchi sozlamalarini tahrirlash',
					description: 'O\'quvchi uchun oylik summa, qo\'shilgan sana va to\'lov kunini belgilash.',
					action: 'Jadvalda "Sozlash" tugmasi',
					details: [
						'O\'quvchi qatorida "..." (uch nuqta) tugmasini bosing',
						'"Sozlash (join/oylik/kuni)" variantini tanlang',
						'Dialogda:',
						'  - <b>Qo\'shilgan sana:</b> Datepicker bilan sana tanlang',
						'  - <b>Oylik summa:</b> Oylik to\'lov summasini kiriting',
						'  - <b>To\'lov kuni:</b> Har oy qaysi kunda to\'lov olinishi (1-31)',
						'"Saqlash" tugmasini bosing',
					],
				},
				{
					step: 6,
					title: 'Qarzdorliklar ro\'yxatini ko\'rish',
					description: 'Barcha qarzdor o\'quvchilarni ko\'rish.',
					action: 'Tugma: "Qarzdorliklar"',
					details: [
						'Oylik to\'lovlar bo\'limida "Qarzdorliklar" tugmasini bosing',
						'Modal ochiladi',
						'Ro\'yxatda quyidagi ma\'lumotlar ko\'rsatiladi:',
						'  - O\'quvchi ismi va familiyasi',
						'  - Umumiy qarz summasi',
						'  - Qaysi oylardan qarzdorligi',
					],
				},
				{
					step: 7,
					title: 'Eslatma yuborish',
					description: 'Qarzdor o\'quvchilarga eslatma yuborish.',
					action: 'Tugma: "Eslatma yuborish"',
					details: [
						'Oylik to\'lovlar bo\'limida "Eslatma yuborish" tugmasini bosing',
						'Dialog ochiladi',
						'Xabarni o\'qib, "Yuborish" tugmasini bosing',
						'Eslatmalar quyidagilarga yuboriladi:',
						'  - Telegram bot (shaxsiy xabar)',
						'  - Tizimdagi profil (bildirishnoma)',
						'  - Telegram kanal (umumiy ro\'yxat)',
					],
				},
				{
					step: 8,
					title: 'Excel export',
					description: 'To\'lovlar ma\'lumotlarini Excel faylga export qilish.',
					action: 'Tugma: "Excel export"',
					details: [
						'Oylik to\'lovlar bo\'limida "Excel export" tugmasini bosing',
						'Excel fayl avtomatik yuklanadi',
						'Fayl nomi: oylik_tolovlar_YYYY-MM_timestamp.xlsx',
					],
				},
			],
		},
	];

	const currentGuide = adminGuide;

	return (
		<div className='container mx-auto py-6 px-4 max-w-5xl'>
			<div className='mb-6'>
				<h1 className='text-3xl font-bold mb-2'>Foydalanish qo'llanmasi</h1>
				<p className='text-muted-foreground'>
					Platformadan foydalanish bo'yicha bosqichma-bosqich ko'rsatmalar
				</p>
			</div>

			{user?.role === 'admin' && (
				<div className='space-y-4'>
					{currentGuide.map((section) => (
						<Card key={section.id} className='overflow-hidden'>
							<CardHeader
								className='cursor-pointer hover:bg-muted/50 transition-colors'
								onClick={() =>
									setActiveSection(activeSection === section.id ? null : section.id)
								}
							>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-3'>
										<section.icon className='h-6 w-6 text-primary' />
										<CardTitle className='text-xl'>{section.title}</CardTitle>
									</div>
									<ChevronRight
										className={`h-5 w-5 text-muted-foreground transition-transform ${
											activeSection === section.id ? 'rotate-90' : ''
										}`}
									/>
								</div>
							</CardHeader>

							{activeSection === section.id && (
								<CardContent className='pt-0'>
									<div className='space-y-6'>
										{section.steps.map((step, idx) => (
											<div key={idx} className='relative'>
												<div className='flex gap-4'>
													<div className='flex-shrink-0'>
														<div className='w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center'>
															<span className='text-primary font-bold'>{step.step}</span>
														</div>
														{idx < section.steps.length - 1 && (
															<div className='w-0.5 h-full bg-border ml-5 -mt-2' style={{ height: 'calc(100% + 1rem)' }} />
														)}
													</div>
													<div className='flex-1 pb-6'>
														<div className='flex items-start gap-2 mb-2'>
															<h3 className='font-semibold text-lg'>{step.title}</h3>
														</div>
														<p className='text-muted-foreground mb-3'>{step.description}</p>
														<Badge variant='outline' className='mb-3'>
															{step.action}
														</Badge>
														<ul className='space-y-2 mt-3'>
															{step.details.map((detail, detailIdx) => (
																<li key={detailIdx} className='flex items-start gap-2 text-sm'>
																	<CheckCircle2 className='h-4 w-4 text-green-500 mt-0.5 flex-shrink-0' />
																	<span dangerouslySetInnerHTML={{ __html: detail }} />
																</li>
															))}
														</ul>
													</div>
												</div>
											</div>
										))}
									</div>
								</CardContent>
							)}
						</Card>
					))}
				</div>
			)}

			{user?.role !== 'admin' && (
				<Card>
					<CardContent className='py-8 text-center'>
						<p className='text-muted-foreground'>
							Qo'llanma hozircha faqat admin roli uchun mavjud. Tez orada boshqa rollar uchun ham qo'shiladi.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
