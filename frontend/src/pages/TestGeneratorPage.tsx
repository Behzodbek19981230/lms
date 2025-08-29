import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { TestGenerator } from '@/components/TestGenerator';

export default function TestGeneratorPage() {
	const navigate = useNavigate();

	return (
		<div className='min-h-screen bg-gradient-subtle'>
			{/* Header */}
			<header className='bg-card border-b border-border p-6'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center space-x-4'>
						<Button variant='outline' onClick={() => navigate('/account/exams')}>
							<ArrowLeft className='h-4 w-4 mr-2' />
							Imtihonlarga qaytish
						</Button>
						<div>
							<h1 className='text-3xl font-bold text-foreground'>Test Generator</h1>
							<p className='text-muted-foreground'>
								Avtomatik test generatsiya qilish va PDF yuklash
							</p>
						</div>
					</div>
				</div>
			</header>

			{/* Test Generator Content */}
			<div className='p-6'>
				<TestGenerator />
			</div>
		</div>
	);
}