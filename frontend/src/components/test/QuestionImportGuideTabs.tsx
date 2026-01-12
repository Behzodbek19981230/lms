import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, FileSpreadsheet, FileText } from 'lucide-react';

type GuideItem = {
	title: string;
	details: string[];
};

function GuideList({ items }: { items: GuideItem[] }) {
	return (
		<div className='space-y-4'>
			{items.map((item, idx) => (
				<div key={idx} className='rounded-lg border bg-background p-4'>
					<div className='flex items-start gap-2'>
						<CheckCircle2 className='h-5 w-5 text-green-600 mt-0.5 flex-shrink-0' />
						<div className='min-w-0'>
							<p className='font-medium leading-6'>{item.title}</p>
							<ul className='mt-2 space-y-1 text-sm text-muted-foreground'>
								{item.details.map((d, j) => (
									<li key={j} className='leading-5'>
										{d}
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

export default function QuestionImportGuideTabs() {
	const word: GuideItem[] = [
		{
			title: '1) Word shablonini yuklab oling (.docx)',
			details: [
				"Yuqoridagi 'Word shablon' tugmasini bosing.",
				"Shablondagi jadvalni o'chirmang, faqat satrlarni to'ldiring.",
			],
		},
		{
			title: '2) Jadval ustunlarini to‘ldiring',
			details: [
				'1-ustun: Savol matni (matn/rasm/formula bo‘lishi mumkin).',
				'2-5 ustun: Variantlar (A, B, C, D) — kamida 2 tasi to‘ldirilgan bo‘lsin.',
				"6-ustun: To'g'ri javob — A/B/C/D (A), A. yoki A) ko‘rinishida ham bo‘ladi.",
				'7-ustun: Ball — 1 dan 10 gacha.',
			],
		},
		{
			title: '3) Rasm va formula bo‘lsa',
			details: [
				"Rasmni oddiy 'Insert → Pictures' orqali qo‘shing (savolga ham, variantga ham).",
				'Formula: Word Equation ishlatsa ham bo‘ladi; agar formula chiqmay qolsa, $...$ (LaTeX) bilan yozing yoki rasm qilib qo‘ying.',
			],
		},
		{
			title: '4) Faylni qayta yuklang',
			details: [
				"'Word yuklash' tugmasidan faylni tanlang.",
				"Sistemada topilgan savollar soni chiqadi — 'Savollarni qo‘shish' ni bosing.",
			],
		},
	];

	const excel: GuideItem[] = [
		{
			title: '1) Excel shablonini yuklab oling (.xlsx)',
			details: [
				"Yuqoridagi 'Excel shablon' tugmasini bosing.",
				"1-qator sarlavha (header) bo‘ladi; ma'lumotlarni 2-qatordan yozing.",
			],
		},
		{
			title: '2) Ustunlar tartibi (o‘zgartirmang)',
			details: [
				'1-ustun: Savol matni',
				'2-ustun: A)',
				'3-ustun: B)',
				'4-ustun: C)',
				'5-ustun: D)',
				"6-ustun: To'g'ri javob (A/B/C/D)",
				'7-ustun: Ball (1-10)',
			],
		},
		{
			title: '3) Tez-tez uchraydigan xatolar',
			details: [
				'Variantlar bo‘sh qolmasin (kamida 2 ta, tavsiya: A-D hammasi to‘liq).',
				"To'g'ri javob faqat A/B/C/D bo‘lsin.",
				'Ball 1-10 oralig‘ida bo‘lsin.',
			],
		},
		{
			title: '4) Faylni qayta yuklang',
			details: [
				"'Excel yuklash' tugmasidan faylni tanlang.",
				"Topilgan savollarni ko‘rib, 'Savollarni qo‘shish' ni bosing.",
			],
		},
	];

	return (
		<Card>
			<CardHeader>
				<div className='flex items-center justify-between gap-3 flex-wrap'>
					<CardTitle>Savol yaratish (import) bo‘yicha yo‘riqnoma</CardTitle>
					<Badge variant='secondary'>Word / Excel</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue='word' className='w-full'>
					<TabsList className='grid w-full grid-cols-2'>
						<TabsTrigger value='word' className='gap-2'>
							<FileText className='h-4 w-4' />
							Word (.docx)
						</TabsTrigger>
						<TabsTrigger value='excel' className='gap-2'>
							<FileSpreadsheet className='h-4 w-4' />
							Excel (.xlsx)
						</TabsTrigger>
					</TabsList>

					<TabsContent value='word' className='mt-4'>
						<GuideList items={word} />
					</TabsContent>

					<TabsContent value='excel' className='mt-4'>
						<GuideList items={excel} />
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
