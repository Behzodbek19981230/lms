import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TestGenerator } from '@/components/TestGenerator';

export default function TestGeneratorPage() {
	const router = useRouter();

	return (
		<div className='min-h-screen bg-gradient-subtle'>
			{/* Header */}
			<header className='bg-card border-b border-border p-3 sm:p-6'>
				<div className='flex flex-col gap-3'>
					<div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4'>
						<Button
							variant='outline'
							onClick={() => router.push('/account/exams')}
							className='w-full sm:w-auto justify-center sm:justify-start'
						>
							<ArrowLeft className='h-4 w-4 mr-2' />
							Imtihonlarga qaytish
						</Button>
						<div>
							<h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground'>Test Generator</h1>
							<p className='text-muted-foreground'>Avtomatik test generatsiya qilish va PDF yuklash</p>
						</div>
					</div>
				</div>
			</header>

			{/* Test Generator Content */}
			<div className='p-3 sm:p-6'>
				<TestGenerator />
			</div>
		</div>
	);
}
