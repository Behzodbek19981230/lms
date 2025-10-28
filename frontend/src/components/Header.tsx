import { Button } from '@/components/ui/button';
import { BookOpen, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const Header = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const router = useRouter();
	return (
		<header className='fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-border z-50'>
			<div className='container mx-auto px-4 py-4 flex items-center justify-between'>
				<div className='flex items-center space-x-2'>
					<div className='p-2 bg-gradient-primary rounded-lg'>
						<BookOpen className='h-6 w-6 text-primary-foreground' />
					</div>
					<span className='text-xl font-bold text-foreground'>EduOne</span>
				</div>

				{/* Desktop Navigation */}
				<nav className='hidden md:flex items-center space-x-8'>
					<a href='#pricing' className='text-muted-foreground hover:text-foreground transition-colors'>
						Narxlar
					</a>
					<a href='#about' className='text-muted-foreground hover:text-foreground transition-colors'>
						Biz haqimizda
					</a>
					<a href='#contact' className='text-muted-foreground hover:text-foreground transition-colors'>
						Aloqa
					</a>
				</nav>

				<div className='hidden md:flex items-center space-x-4'>
					<Button variant='ghost' asChild>
						<Link href='/login'>Kirish</Link>
					</Button>
					<Button variant='hero' asChild>
						<Link href='/register'>Bepul sinab ko'ring</Link>
					</Button>
				</div>

				{/* Mobile Menu Button */}
				<button className='md:hidden p-2' onClick={() => setIsMenuOpen(!isMenuOpen)}>
					{isMenuOpen ? <X className='h-6 w-6' /> : <Menu className='h-6 w-6' />}
				</button>

				{/* Mobile Menu */}
				{isMenuOpen && (
					<div className='absolute top-full left-0 w-full bg-white border-b border-border md:hidden'>
						<nav className='flex flex-col space-y-4 p-4'>
							<a
								href='#features'
								className='text-muted-foreground hover:text-foreground transition-colors'
							>
								Xususiyatlar
							</a>
							<a
								href='#pricing'
								className='text-muted-foreground hover:text-foreground transition-colors'
							>
								Narxlar
							</a>
							<a href='#about' className='text-muted-foreground hover:text-foreground transition-colors'>
								Biz haqimizda
							</a>
							<a
								href='#contact'
								className='text-muted-foreground hover:text-foreground transition-colors'
							>
								Aloqa
							</a>
							<div className='flex flex-col space-y-2 pt-4'>
								<Button variant='ghost' onClick={() => router.push('/login')}>
									Kirish
								</Button>
								<Button variant='hero'>Bepul sinab ko'ring</Button>
							</div>
						</nav>
					</div>
				)}
			</div>
		</header>
	);
};

export default Header;
