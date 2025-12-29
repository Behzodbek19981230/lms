'use client';

import { Button } from '@/components/ui/button';
import { BookOpen, Menu, X } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const router = useRouter();
	const { user } = useAuth();

	const handleLogout = () => {
		localStorage.removeItem('token');
		localStorage.removeItem('EduOne_user');
		router.push('/login');
	};

	return (
		<header className='fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-border z-50'>
			<div className='container mx-auto px-4 py-4 flex items-center justify-between'>
				<div className='flex items-center space-x-2'>
					<div className='p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg'>
						<BookOpen className='h-6 w-6 text-white' />
					</div>
					<span className='text-xl font-bold text-foreground bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
						EduOne
					</span>
				</div>

				{/* Desktop Navigation */}
				<nav className='hidden md:flex items-center space-x-8'>
					<a
						href='#features'
						className='text-muted-foreground hover:text-foreground transition-colors font-medium'
					>
						Xususiyatlar
					</a>
					<a
						href='#pricing'
						className='text-muted-foreground hover:text-foreground transition-colors font-medium'
					>
						Narxlar
					</a>
					<a
						href='#about'
						className='text-muted-foreground hover:text-foreground transition-colors font-medium'
					>
						Biz haqimizda
					</a>
					<a
						href='#contact'
						className='text-muted-foreground hover:text-foreground transition-colors font-medium'
					>
						Aloqa
					</a>
				</nav>

				<div className='hidden md:flex items-center space-x-4'>
					{user ? (
						<div className='flex items-center space-x-3'>
							<Button className='text-sm font-medium text-foreground' variant='ghost' > 
								{user.firstName} {user.lastName}
							</Button>
							<Button variant='outline' onClick={handleLogout} size='sm'>
								Chiqish
							</Button>
						</div>
					) : (
						<>
							<Button variant='ghost' asChild>
								<Link href='/login'>Kirish</Link>
							</Button>
							<Button
								className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
								asChild
							>
								<Link href='#contact'>Bepul sinab ko'ring</Link>
							</Button>
						</>
					)}
				</div>

				{/* Mobile Menu Button */}
				<button
					className='md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors'
					onClick={() => setIsMenuOpen(!isMenuOpen)}
				>
					{isMenuOpen ? <X className='h-6 w-6' /> : <Menu className='h-6 w-6' />}
				</button>

				{/* Mobile Menu */}
				{isMenuOpen && (
					<div className='absolute top-full left-0 w-full bg-white border-b border-border md:hidden shadow-lg'>
						<nav className='flex flex-col space-y-4 p-4'>
							<a
								href='#features'
								className='text-muted-foreground hover:text-foreground transition-colors py-2'
								onClick={() => setIsMenuOpen(false)}
							>
								Xususiyatlar
							</a>
							<a
								href='#pricing'
								className='text-muted-foreground hover:text-foreground transition-colors py-2'
								onClick={() => setIsMenuOpen(false)}
							>
								Narxlar
							</a>
							<a
								href='#about'
								className='text-muted-foreground hover:text-foreground transition-colors py-2'
								onClick={() => setIsMenuOpen(false)}
							>
								Biz haqimizda
							</a>
							<a
								href='#contact'
								className='text-muted-foreground hover:text-foreground transition-colors py-2'
								onClick={() => setIsMenuOpen(false)}
							>
								Aloqa
							</a>
							<div className='flex flex-col space-y-3 pt-4 border-t border-border'>
								{user ? (
									<div className='flex flex-col space-y-3'>
										<span className='text-sm font-medium text-foreground'>
											{user.firstName} {user.lastName}
										</span>
										<Button variant='outline' onClick={handleLogout}>
											Chiqish
										</Button>
									</div>
								) : (
									<>
										<Button
											variant='ghost'
											onClick={() => {
												router.push('/login');
												setIsMenuOpen(false);
											}}
										>
											Kirish
										</Button>
										<Button
											className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
											onClick={() => {
												router.push('/register');
												setIsMenuOpen(false);
											}}
										>
											Bepul sinab ko'ring
										</Button>
									</>
								)}
							</div>
						</nav>
					</div>
				)}
			</div>
		</header>
	);
};

export default Header;
