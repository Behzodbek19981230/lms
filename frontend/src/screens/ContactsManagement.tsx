import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { request } from '@/configs/request';
import {
	MessageSquare,
	User,
	Phone,
	Calendar,
	Eye,
	EyeOff,
	Trash2,
	Search,
	Filter,
	ArrowLeft,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Contact {
	id: string;
	name: string;
	phone: string;
	message: string;
	isRead: boolean;
	createdAt: string;
}

const ContactsManagement = () => {
	const router = useRouter();
	const { toast } = useToast();
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
	const [searchTerm, setSearchTerm] = useState('');
	const [filter, setFilter] = useState<'all' | 'read' | 'unread'>('all');

	useEffect(() => {
		loadContacts();
	}, []);

	const loadContacts = async () => {
		try {
			const { data } = await request.get('/contacts');
			setContacts(data);
		} catch (error) {
			toast({
				title: 'Xatolik',
				description: 'Xabarlarni yuklashda xatolik yuz berdi',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const markAsRead = async (id: string) => {
		try {
			await request.patch(`/contacts/${id}/read`);
			setContacts(contacts.map(contact =>
				contact.id === id ? { ...contact, isRead: true } : contact
			));
			toast({
				title: 'Muvaffaqiyat',
				description: 'Xabar o\'qilgan deb belgilandi',
			});
		} catch (error) {
			toast({
				title: 'Xatolik',
				description: 'Xabarni belgilashda xatolik',
				variant: 'destructive',
			});
		}
	};

	const deleteContact = async (id: string) => {
		if (!confirm('Haqiqatan ham bu xabarni o\'chirmoqchimisiz?')) return;

		try {
			await request.delete(`/contacts/${id}`);
			setContacts(contacts.filter(contact => contact.id !== id));
			toast({
				title: 'Muvaffaqiyat',
				description: 'Xabar o\'chirildi',
			});
		} catch (error) {
			toast({
				title: 'Xatolik',
				description: 'Xabarni o\'chirishda xatolik',
				variant: 'destructive',
			});
		}
	};

	const filteredContacts = contacts.filter(contact => {
		const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			contact.phone.includes(searchTerm) ||
			contact.message.toLowerCase().includes(searchTerm.toLowerCase());

		const matchesFilter = filter === 'all' ||
			(filter === 'read' && contact.isRead) ||
			(filter === 'unread' && !contact.isRead);

		return matchesSearch && matchesFilter;
	});

	const unreadCount = contacts.filter(c => !c.isRead).length;

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 p-6">
				<div className="max-w-7xl mx-auto">
					<div className="animate-pulse">
						<div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
						<div className="space-y-4">
							{[...Array(5)].map((_, i) => (
								<div key={i} className="h-24 bg-gray-200 rounded"></div>
							))}
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-7xl mx-auto">
				<div className="flex items-center justify-between mb-6">
					<div className="flex items-center gap-4">
						<Button
							variant="outline"
							size="sm"
							onClick={() => router.push('/account/superadmin')}
							className="flex items-center gap-2"
						>
							<ArrowLeft className="w-4 h-4" />
							Orqaga
						</Button>
						<div>
							<h1 className="text-3xl font-bold text-gray-900">Kontakt xabarlari</h1>
							<p className="text-gray-600 mt-1">
								Jami {contacts.length} ta xabar, {unreadCount} ta o'qilmagan
							</p>
						</div>
					</div>
				</div>

				{/* Filters */}
				<Card className="mb-6">
					<CardContent className="pt-6">
						<div className="flex flex-col sm:flex-row gap-4">
							<div className="flex-1">
								<div className="relative">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
									<Input
										placeholder="Qidirish (ism, telefon, xabar)..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="pl-10"
									/>
								</div>
							</div>
							<div className="flex gap-2">
								<Button
									variant={filter === 'all' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setFilter('all')}
								>
									Barcha ({contacts.length})
								</Button>
								<Button
									variant={filter === 'unread' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setFilter('unread')}
								>
									O'qilmagan ({unreadCount})
								</Button>
								<Button
									variant={filter === 'read' ? 'default' : 'outline'}
									size="sm"
									onClick={() => setFilter('read')}
								>
									O'qilgan ({contacts.length - unreadCount})
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Contacts List */}
				<div className="space-y-4">
					{filteredContacts.length === 0 ? (
						<Card>
							<CardContent className="pt-6">
								<div className="text-center py-12">
									<MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
									<h3 className="text-lg font-medium text-gray-900 mb-2">
										Xabarlar topilmadi
									</h3>
									<p className="text-gray-500">
										{searchTerm || filter !== 'all'
											? 'Qidiruv natijalari bo\'yicha xabarlar yo\'q'
											: 'Hali xabarlar yo\'q'
										}
									</p>
								</div>
							</CardContent>
						</Card>
					) : (
						filteredContacts.map((contact) => (
							<Card key={contact.id} className={`transition-all hover:shadow-md ${!contact.isRead ? 'border-l-4 border-l-blue-500' : ''}`}>
								<CardContent className="pt-6">
									<div className="flex items-start justify-between">
										<div className="flex-1">
											<div className="flex items-center gap-3 mb-3">
												<div className="flex items-center gap-2">
													<User className="w-4 h-4 text-gray-500" />
													<span className="font-medium text-gray-900">{contact.name}</span>
												</div>
												<div className="flex items-center gap-2">
													<Phone className="w-4 h-4 text-gray-500" />
													<span className="text-gray-600">{contact.phone}</span>
												</div>
												<Badge variant={contact.isRead ? 'secondary' : 'default'}>
													{contact.isRead ? 'O\'qilgan' : 'Yangi'}
												</Badge>
											</div>
											<p className="text-gray-700 mb-3 line-clamp-2">{contact.message}</p>
											<div className="flex items-center gap-2 text-sm text-gray-500">
												<Calendar className="w-4 h-4" />
												{new Date(contact.createdAt).toLocaleString('uz-UZ')}
											</div>
										</div>
										<div className="flex gap-2 ml-4">
											<Dialog>
												<DialogTrigger asChild>
													<Button
														variant="outline"
														size="sm"
														onClick={() => setSelectedContact(contact)}
													>
														<Eye className="w-4 h-4" />
													</Button>
												</DialogTrigger>
												<DialogContent className="max-w-2xl">
													<DialogHeader>
														<DialogTitle>Xabar tafsilotlari</DialogTitle>
													</DialogHeader>
													<div className="space-y-4">
														<div>
															<Label>Ism familiya</Label>
															<Input value={selectedContact?.name} readOnly />
														</div>
														<div>
															<Label>Telefon</Label>
															<Input value={selectedContact?.phone} readOnly />
														</div>
														<div>
															<Label>Xabar</Label>
															<Textarea
																value={selectedContact?.message}
																readOnly
																rows={6}
															/>
														</div>
														<div>
															<Label>Yuborilgan vaqt</Label>
															<Input
																value={selectedContact ? new Date(selectedContact.createdAt).toLocaleString('uz-UZ') : ''}
																readOnly
															/>
														</div>
														{selectedContact && !selectedContact.isRead && (
															<Button
																onClick={() => {
																	markAsRead(selectedContact.id);
																	setSelectedContact({ ...selectedContact, isRead: true });
																}}
																className="w-full"
															>
																O'qilgan deb belgilash
															</Button>
														)}
													</div>
												</DialogContent>
											</Dialog>
											{!contact.isRead && (
												<Button
													variant="outline"
													size="sm"
													onClick={() => markAsRead(contact.id)}
													title="O'qilgan deb belgilash"
												>
													<EyeOff className="w-4 h-4" />
												</Button>
											)}
											<Button
												variant="outline"
												size="sm"
												onClick={() => deleteContact(contact.id)}
												className="text-red-600 hover:text-red-700 hover:bg-red-50"
												title="O'chirish"
											>
												<Trash2 className="w-4 h-4" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						))
					)}
				</div>
			</div>
		</div>
	);
};

export default ContactsManagement;