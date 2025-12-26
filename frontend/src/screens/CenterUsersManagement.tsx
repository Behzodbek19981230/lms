import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
	Users,
	GraduationCap,
	UserCheck,
	UserX,
	Search,
	Filter,
	Download,
	User as UserIcon,
	Phone,
	Building,
	ChevronDown,
	ChevronUp,
	UserPlus,
	Eye,
	MoreHorizontal,
	AlertTriangle,
	Plus,
} from 'lucide-react';
import { request } from '@/configs/request';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PERMISSION_LABELS, type CenterPermissionKey } from '@/configs/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getApiErrorMessage } from '@/utils/api-error';

interface User {
	id: number;
	firstName: string;
	lastName: string;
	username: string;
	phone?: string;
	role: 'student' | 'teacher' | 'admin';
	isActive: boolean;
	lastLoginAt?: string;
	center?: {
		id: number;
		name: string;
	};
}

interface Center {
	id: number;
	name: string;
	isActive: boolean;
	description?: string;
	phone?: string;
	address?: string;
	users: User[];
	permissions?: Record<string, boolean>;
}

const CenterUsersManagement = () => {
	const [centers, setCenters] = useState<Center[]>([]);
	const [unassignedUsers, setUnassignedUsers] = useState<User[]>([]);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [roleFilter, setRoleFilter] = useState('all');
	const [expandedCenters, setExpandedCenters] = useState<Set<number>>(new Set());
	const [showUnassigned, setShowUnassigned] = useState(false);
	const [savingPermissions, setSavingPermissions] = useState<Record<number, boolean>>({});
	const [editCenterOpen, setEditCenterOpen] = useState(false);
	const [editCenter, setEditCenter] = useState<Partial<Center> | null>(null);
	const [importOpen, setImportOpen] = useState(false);
	const [importCenter, setImportCenter] = useState<Center | null>(null);
	const [importFile, setImportFile] = useState<File | null>(null);
	const [importLoading, setImportLoading] = useState(false);
	const { toast } = useToast();

	const loadCentersWithUsers = async () => {
		try {
			setLoading(true);

			// Get all centers
			const centersResponse = await request.get('/centers');
			const centersData = centersResponse.data;

			// Get unassigned users (users without center)
			const unassignedResponse = await request.get('/users?unassigned=true');
			setUnassignedUsers(unassignedResponse.data || []);

			// For each center, get its users
			const centersWithUsers = await Promise.all(
				centersData.map(async (center: any) => {
					try {
						const usersResponse = await request.get(`/users?centerId=${center.id}`);
						return {
							...center,
							users: usersResponse.data || [],
						};
					} catch (error) {
						console.error(`Failed to load users for center ${center.id}:`, error);
						return {
							...center,
							users: [],
						};
					}
				})
			);

			setCenters(centersWithUsers);
		} catch (error) {
			console.error('Failed to load centers:', error);
			toast({
				title: 'Xato',
				description: 'Markazlar va foydalanuvchilarni yuklashda xatolik',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadCentersWithUsers();
	}, []);

	const toggleCenterExpansion = (centerId: number) => {
		const newExpanded = new Set(expandedCenters);
		if (newExpanded.has(centerId)) {
			newExpanded.delete(centerId);
		} else {
			newExpanded.add(centerId);
		}
		setExpandedCenters(newExpanded);
	};

	const expandAllCenters = () => {
		setExpandedCenters(new Set(centers.map((c) => c.id)));
	};

	const collapseAllCenters = () => {
		setExpandedCenters(new Set());
	};

	const filteredCenters = centers.map((center) => {
		const filteredUsers = center.users.filter((user) => {
			const matchesSearch =
				user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
				user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
				user.username.toLowerCase().includes(searchTerm.toLowerCase());

			const matchesRole = roleFilter === 'all' || user.role === roleFilter;

			return matchesSearch && matchesRole;
		});

		return {
			...center,
			users: filteredUsers,
		};
	});

	const assignUserToCenter = async (userId: number, centerId: number) => {
		try {
			await request.patch(`/users/${userId}/assign-center`, { centerId });
			toast({
				title: 'Muvaffaqiyat!',
				description: 'Foydalanuvchi markazga muvaffaqiyatli biriktirildi',
				variant: 'default',
			});
			// Reload data
			loadCentersWithUsers();
		} catch (error) {
			console.error('Failed to assign user to center:', error);
			toast({
				title: 'Xato',
				description: 'Foydalanuvchini markazga biriktirishda xatolik',
				variant: 'destructive',
			});
		}
	};

	const updateCenterPermission = async (centerId: number, key: CenterPermissionKey, value: boolean) => {
		try {
			setSavingPermissions((p) => ({ ...p, [centerId]: true }));
			await request.patch(`/centers/${centerId}/permissions`, {
				permissions: {
					[key]: value,
				},
			});
			setCenters((prev) =>
				prev.map((c) =>
					c.id === centerId
						? { ...c, permissions: { ...(c.permissions || {}), [key]: value } }
						: c
				)
			);
			toast({
				title: 'Saqlandi',
				description: 'Permission muvaffaqiyatli yangilandi',
			});
		} catch (e) {
			toast({
				title: 'Xato',
				description: 'Permissionni saqlashda xatolik',
				variant: 'destructive',
			});
		} finally {
			setSavingPermissions((p) => ({ ...p, [centerId]: false }));
		}
	};

	const updateCenterStatus = async (centerId: number, isActive: boolean) => {
		try {
			await request.patch(`/centers/${centerId}/status`, { isActive });
			setCenters((prev) => prev.map((c) => (c.id === centerId ? { ...c, isActive } : c)));
			toast({
				title: 'Saqlandi',
				description: isActive ? 'Markaz faol qilindi' : 'Markaz nofaol qilindi',
			});
		} catch (e: any) {
			toast({
				title: 'Xato',
				description: e?.response?.data?.message || 'Markaz holatini o‘zgartirib bo‘lmadi',
				variant: 'destructive',
			});
		}
	};

	const saveCenterEdits = async () => {
		if (!editCenter?.id) return;
		try {
			await request.patch(`/centers/${editCenter.id}`, {
				name: editCenter.name,
				description: editCenter.description,
				phone: editCenter.phone,
				address: editCenter.address,
			});
			setEditCenterOpen(false);
			setEditCenter(null);
			toast({ title: 'Saqlandi', description: 'Markaz ma’lumotlari yangilandi' });
			loadCentersWithUsers();
		} catch (e: any) {
			toast({
				title: 'Xato',
				description: e?.response?.data?.message || 'Markazni tahrirlab bo‘lmadi',
				variant: 'destructive',
			});
		}
	};

	const downloadImportTemplate = async () => {
		try {
			const res = await request.get('/centers/import/template', { responseType: 'blob' as any });
			const url = URL.createObjectURL(res.data);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'center-import-template.xlsx';
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} catch (e: any) {
			toast({
				title: 'Xato',
				description: getApiErrorMessage(e) || 'Template yuklab bo‘lmadi',
				variant: 'destructive',
			});
		}
	};

	const uploadExcelImport = async () => {
		if (!importCenter?.id) return;
		if (!importFile) {
			toast({ title: 'Xato', description: 'Excel fayl tanlang', variant: 'destructive' });
			return;
		}
		try {
			setImportLoading(true);
			const fd = new FormData();
			fd.append('file', importFile);
			const { data } = await request.post(`/centers/${importCenter.id}/import/excel`, fd, {
				headers: { 'Content-Type': 'multipart/form-data' },
			});
			toast({ title: 'Import tugadi', description: "Ma'lumotlar yuklandi" });
			setImportOpen(false);
			setImportFile(null);
			setImportCenter(null);
			loadCentersWithUsers();
			console.log('Import result:', data);
		} catch (e: any) {
			toast({
				title: 'Import xatoligi',
				description: getApiErrorMessage(e) || "Importni bajarib bo'lmadi",
				variant: 'destructive',
			});
			if (e?.response?.data?.errors) {
				console.log('Import errors:', e.response.data.errors);
			}
		} finally {
			setImportLoading(false);
		}
	};

	const totalUsers = centers.reduce((sum, center) => sum + center.users.length, 0) + unassignedUsers.length;
	const totalStudents =
		centers.reduce((sum, center) => sum + center.users.filter((u) => u.role === 'student').length, 0) +
		unassignedUsers.filter((u) => u.role === 'student').length;
	const totalTeachers =
		centers.reduce((sum, center) => sum + center.users.filter((u) => u.role === 'teacher').length, 0) +
		unassignedUsers.filter((u) => u.role === 'teacher').length;
	const totalAdmins =
		centers.reduce((sum, center) => sum + center.users.filter((u) => u.role === 'admin').length, 0) +
		unassignedUsers.filter((u) => u.role === 'admin').length;

	const getRoleBadge = (role: string) => {
		switch (role) {
			case 'student':
				return <Badge className='bg-blue-100 text-blue-800'>Talaba</Badge>;
			case 'teacher':
				return <Badge className='bg-green-100 text-green-800'>O'qituvchi</Badge>;
			case 'admin':
				return <Badge className='bg-purple-100 text-purple-800'>Admin</Badge>;
			default:
				return <Badge variant='secondary'>{role}</Badge>;
		}
	};

	const getStatusBadge = (isActive: boolean) => {
		return isActive ? (
			<Badge className='bg-green-100 text-green-800'>Faol</Badge>
		) : (
			<Badge className='bg-red-100 text-red-800'>Nofaol</Badge>
		);
	};

	const getCenterStatusBadge = (isActive: boolean) => {
		return isActive ? (
			<Badge className='bg-green-100 text-green-800'>Markaz: Faol</Badge>
		) : (
			<Badge className='bg-red-100 text-red-800'>Markaz: Nofaol</Badge>
		);
	};

    const exportUsersData = () => {
        const csvData: string[][] = [];
		csvData.push(['Markaz', 'Ism', 'Familiya', 'Foydalanuvchi nomi', 'Telefon', 'Rol', 'Holat', 'Oxirgi kirish']);

		centers.forEach((center) => {
			center.users.forEach((user) => {
				csvData.push([
					center.name,
					user.firstName,
					user.lastName,
					user.username,
					user.phone || '',
					user.role,
					user.isActive ? 'Faol' : 'Nofaol',
					user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Hech qachon',
				]);
			});
		});

		const csvContent = csvData.map((row) => row.join(',')).join('\n');
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', 'markazlar_foydalanuvchilari.csv');
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	if (loading) {
		return (
			<div className='min-h-screen bg-gradient-subtle p-6'>
				<Card>
					<CardContent className='flex items-center justify-center py-8'>
						<p>Markazlar va foydalanuvchilar yuklanmoqda...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className='min-h-screen bg-gradient-subtle'>
			<Dialog
				open={editCenterOpen}
				onOpenChange={(v) => {
					setEditCenterOpen(v);
					if (!v) setEditCenter(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Markazni tahrirlash</DialogTitle>
					</DialogHeader>
					<div className='space-y-3'>
						<div>
							<Label>Nom</Label>
							<Input
								value={editCenter?.name || ''}
								onChange={(e) => setEditCenter((p) => ({ ...(p || {}), name: e.target.value }))}
							/>
						</div>
						<div>
							<Label>Tavsif</Label>
							<Input
								value={editCenter?.description || ''}
								onChange={(e) =>
									setEditCenter((p) => ({ ...(p || {}), description: e.target.value }))
								}
							/>
						</div>
						<div>
							<Label>Telefon</Label>
							<Input
								value={editCenter?.phone || ''}
								onChange={(e) => setEditCenter((p) => ({ ...(p || {}), phone: e.target.value }))}
							/>
						</div>
						<div>
							<Label>Manzil</Label>
							<Input
								value={editCenter?.address || ''}
								onChange={(e) => setEditCenter((p) => ({ ...(p || {}), address: e.target.value }))}
							/>
						</div>
						<Button onClick={saveCenterEdits}>Saqlash</Button>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog
				open={importOpen}
				onOpenChange={(v) => {
					setImportOpen(v);
					if (!v) {
						setImportCenter(null);
						setImportFile(null);
					}
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Excel import</DialogTitle>
					</DialogHeader>
					<div className='space-y-3'>
						<p className='text-sm text-muted-foreground'>
							Markaz: <span className='font-medium text-foreground'>{importCenter?.name}</span>
						</p>
						<div className='flex gap-2'>
							<Button variant='outline' onClick={downloadImportTemplate}>
								Template yuklab olish
							</Button>
						</div>
						<div className='space-y-2'>
							<Label>Excel fayl (.xlsx)</Label>
							<input
								type='file'
								accept='.xlsx,.xls'
								onChange={(e) => setImportFile(e.target.files?.[0] || null)}
							/>
						</div>
						<Button disabled={importLoading} onClick={uploadExcelImport}>
							{importLoading ? 'Yuklanmoqda...' : 'Import qilish'}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Header */}
			<header className='bg-card border-b border-border p-3 sm:p-4 md:p-6'>
				<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4'>
					<div>
						<h1 className='text-xl sm:text-2xl md:text-3xl font-bold text-foreground'>
							Markazlar va Foydalanuvchilar
						</h1>
						<p className='text-xs sm:text-sm text-muted-foreground'>
							Barcha markazlardagi foydalanuvchilarni boshqarish
						</p>
					</div>
					<div className='flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto'>
						<Button
							variant='outline'
							size='sm'
							onClick={exportUsersData}
							className='flex-1 sm:flex-initial'
						>
							<Download className='h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2' />
							<span className='hidden sm:inline text-xs sm:text-sm'>Ma'lumotlarni yuklash</span>
							<span className='sm:hidden text-xs'>Yuklash</span>
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={expandAllCenters}
							className='flex-1 sm:flex-initial hidden md:flex'
						>
							<ChevronDown className='h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2' />
							<span className='text-xs sm:text-sm'>Ochish</span>
						</Button>
						<Button
							variant='outline'
							size='sm'
							onClick={collapseAllCenters}
							className='flex-1 sm:flex-initial hidden md:flex'
						>
							<ChevronUp className='h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2' />
							<span className='text-xs sm:text-sm'>Yopish</span>
						</Button>
					</div>
				</div>
			</header>

			<div className='p-3 sm:p-4 md:p-6'>
				{/* Statistics */}
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8'>
					<Card>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-xs sm:text-sm font-medium text-muted-foreground'>
								Jami foydalanuvchilar
							</CardTitle>
							<Users className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary' />
						</CardHeader>
						<CardContent>
							<div className='text-xl sm:text-2xl font-bold text-foreground'>{totalUsers}</div>
							<p className='text-[10px] sm:text-xs text-muted-foreground'>{centers.length} ta markazda</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-xs sm:text-sm font-medium text-muted-foreground'>
								Talabalar
							</CardTitle>
							<GraduationCap className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500' />
						</CardHeader>
						<CardContent>
							<div className='text-xl sm:text-2xl font-bold text-foreground'>{totalStudents}</div>
							<p className='text-[10px] sm:text-xs text-muted-foreground'>
								{((totalStudents / totalUsers) * 100).toFixed(1)}% jami foydalanuvchilardan
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-xs sm:text-sm font-medium text-muted-foreground'>
								O'qituvchilar
							</CardTitle>
							<UserCheck className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500' />
						</CardHeader>
						<CardContent>
							<div className='text-xl sm:text-2xl font-bold text-foreground'>{totalTeachers}</div>
							<p className='text-[10px] sm:text-xs text-muted-foreground'>
								{((totalTeachers / totalUsers) * 100).toFixed(1)}% jami foydalanuvchilardan
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
							<CardTitle className='text-xs sm:text-sm font-medium text-muted-foreground'>
								Adminlar
							</CardTitle>
							<UserX className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500' />
						</CardHeader>
						<CardContent>
							<div className='text-xl sm:text-2xl font-bold text-foreground'>{totalAdmins}</div>
							<p className='text-[10px] sm:text-xs text-muted-foreground'>
								{((totalAdmins / totalUsers) * 100).toFixed(1)}% jami foydalanuvchilardan
							</p>
						</CardContent>
					</Card>
				</div>

				{/* Filters */}
				<Card className='mb-6'>
					<CardHeader>
						<CardTitle className='flex items-center'>
							<Filter className='h-5 w-5 mr-2' />
							Filtrlash
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='flex space-x-4'>
							<div className='flex-1'>
								<div className='relative'>
									<Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
									<Input
										placeholder="Ism, familiya yoki foydalanuvchi nomi bo'yicha qidirish..."
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className='pl-8'
									/>
								</div>
							</div>
							<div className='w-48'>
								<Select value={roleFilter} onValueChange={setRoleFilter}>
									<SelectTrigger>
										<SelectValue placeholder="Rol bo'yicha filtrlash" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='all'>Barcha rollar</SelectItem>
										<SelectItem value='student'>Talabalar</SelectItem>
										<SelectItem value='teacher'>O'qituvchilar</SelectItem>
										<SelectItem value='admin'>Adminlar</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Unassigned Users Alert */}
				{unassignedUsers.length > 0 && (
					<Card className='mb-6 border-yellow-200 bg-yellow-50'>
						<CardHeader>
							<div className='flex items-center justify-between'>
								<div className='flex items-center space-x-3'>
									<AlertTriangle className='h-5 w-5 text-yellow-600' />
									<CardTitle className='text-yellow-800'>
										Markaz biriktirilmagan foydalanuvchilar ({unassignedUsers.length})
									</CardTitle>
								</div>
								<Button variant='outline' size='sm' onClick={() => setShowUnassigned(!showUnassigned)}>
									{showUnassigned ? 'Yashirish' : "Ko'rsatish"}
								</Button>
							</div>
						</CardHeader>
						{showUnassigned && (
							<CardContent>
								<p className='text-yellow-700 mb-4'>
									Bu foydalanuvchilar hali hech qanday markazga biriktirilmagan. Ularni tegishli
									markazlarga biriktiring.
								</p>
								<Table className=''>
									<TableHeader>
										<TableRow>
											<TableHead>Foydalanuvchi</TableHead>
											<TableHead>Foydalanuvchi nomi</TableHead>
											<TableHead>Telefon</TableHead>
											<TableHead>Rol</TableHead>
											<TableHead>Holat</TableHead>
											<TableHead>Amallar</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{unassignedUsers.map((user) => (
											<TableRow key={user.id}>
												<TableCell>
													<div className='font-medium'>
														{user.firstName} {user.lastName}
													</div>
												</TableCell>
												<TableCell>
													<div className='flex items-center'>
														<UserIcon className='h-4 w-4 mr-2 text-muted-foreground' />
														{user.username}
													</div>
												</TableCell>
												<TableCell>
													{user.phone ? (
														<div className='flex items-center'>
															<Phone className='h-4 w-4 mr-2 text-muted-foreground' />
															{user.phone}
														</div>
													) : (
														<span className='text-muted-foreground'>—</span>
													)}
												</TableCell>
												<TableCell>{getRoleBadge(user.role)}</TableCell>
												<TableCell>{getStatusBadge(user.isActive)}</TableCell>
												<TableCell>
													<DropdownMenu>
														<DropdownMenuTrigger asChild>
															<Button variant='outline' size='sm'>
																<Plus className='h-4 w-4 mr-2' />
																Biriktirish
															</Button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align='end'>
															{centers.map((center) => (
																<DropdownMenuItem
																	key={center.id}
																	onClick={() =>
																		assignUserToCenter(user.id, center.id)
																	}
																>
																	<Building className='h-4 w-4 mr-2' />
																	{center.name}
																</DropdownMenuItem>
															))}
														</DropdownMenuContent>
													</DropdownMenu>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						)}
					</Card>
				)}

				{/* Centers with Users */}
				<div className='space-y-4'>
					{filteredCenters.map((center) => (
						<Card key={center.id} className='border-border'>
							<Collapsible
								open={expandedCenters.has(center.id)}
								onOpenChange={() => toggleCenterExpansion(center.id)}
							>
								<CollapsibleTrigger asChild>
									<CardHeader className='cursor-pointer hover:bg-muted/50'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center space-x-4'>
												<Building className='h-6 w-6 text-primary' />
												<div>
													<CardTitle className='text-lg'>{center.name}</CardTitle>
													<p className='text-sm text-muted-foreground'>
														{center.users.length} foydalanuvchi
														{center.description && ` • ${center.description}`}
													</p>
												</div>
											</div>
											<div className='flex items-center space-x-4'>
												{getCenterStatusBadge(center.isActive)}
												<div className='flex space-x-2'>
													<Badge variant='outline'>
														{center.users.filter((u) => u.role === 'student').length} talaba
													</Badge>
													<Badge variant='outline'>
														{center.users.filter((u) => u.role === 'teacher').length}{' '}
														o'qituvchi
													</Badge>
													<Badge variant='outline'>
														{center.users.filter((u) => u.role === 'admin').length} admin
													</Badge>
												</div>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button
															variant='ghost'
															size='sm'
															onClick={(e) => e.stopPropagation()}
														>
															<MoreHorizontal className='h-4 w-4' />
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align='end' onClick={(e) => e.stopPropagation()}>
														<DropdownMenuItem
															onClick={() => {
																setEditCenter(center);
																setEditCenterOpen(true);
															}}
														>
															Tahrirlash
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => updateCenterStatus(center.id, !center.isActive)}
														>
															{center.isActive ? 'Nofaol qilish' : 'Faol qilish'}
														</DropdownMenuItem>
														<DropdownMenuItem
															onClick={() => {
																setImportCenter(center);
																setImportOpen(true);
															}}
														>
															Excel import
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
												{expandedCenters.has(center.id) ? (
													<ChevronUp className='h-4 w-4' />
												) : (
													<ChevronDown className='h-4 w-4' />
												)}
											</div>
										</div>
									</CardHeader>
								</CollapsibleTrigger>

								<CollapsibleContent>
									<CardContent>
										{center.users.length === 0 ? (
											<div className='text-center py-8 text-muted-foreground'>
												Bu markazda hech qanday foydalanuvchi yo'q
											</div>
										) : (
											<Tabs defaultValue='users' className='w-full'>
												<TabsList>
													<TabsTrigger value='users'>Users</TabsTrigger>
													<TabsTrigger value='permissions'>Permissions</TabsTrigger>
												</TabsList>
												<TabsContent value='users'>
													<Table>
														<TableHeader>
															<TableRow>
																<TableHead>Foydalanuvchi</TableHead>
																<TableHead>Foydalanuvchi nomi</TableHead>
																<TableHead>Telefon</TableHead>
																<TableHead>Rol</TableHead>
																<TableHead>Holat</TableHead>
																<TableHead>Oxirgi kirish</TableHead>
																<TableHead></TableHead>
															</TableRow>
														</TableHeader>
														<TableBody>
															{center.users.map((user) => (
																<TableRow key={user.id}>
																	<TableCell>
																		<div>
																			<div className='font-medium'>
																				{user.firstName} {user.lastName}
																			</div>
																		</div>
																	</TableCell>
																	<TableCell>
																		<div className='flex items-center'>
																			<UserIcon className='h-4 w-4 mr-2 text-muted-foreground' />
																			{user.username}
																		</div>
																	</TableCell>
																	<TableCell>
																		{user.phone ? (
																			<div className='flex items-center'>
																				<Phone className='h-4 w-4 mr-2 text-muted-foreground' />
																				{user.phone}
																			</div>
																		) : (
																			<span className='text-muted-foreground'>—</span>
																		)}
																	</TableCell>
																	<TableCell>{getRoleBadge(user.role)}</TableCell>
																	<TableCell>{getStatusBadge(user.isActive)}</TableCell>
																	<TableCell>
																		{user.lastLoginAt ? (
																			new Date(user.lastLoginAt).toLocaleDateString()
																		) : (
																			<span className='text-muted-foreground'>Hech qachon</span>
																		)}
																	</TableCell>
																	<TableCell>
																		<DropdownMenu>
																			<DropdownMenuTrigger asChild>
																				<Button variant='ghost' size='sm'>
																					<MoreHorizontal className='h-4 w-4' />
																				</Button>
																			</DropdownMenuTrigger>
																			<DropdownMenuContent align='end'>
																				<DropdownMenuItem>
																					<Eye className='h-4 w-4 mr-2' />
																					Ko'rish
																				</DropdownMenuItem>
																			</DropdownMenuContent>
																		</DropdownMenu>
																	</TableCell>
																</TableRow>
															))}
														</TableBody>
													</Table>
												</TabsContent>
												<TabsContent value='permissions'>
													<div className='space-y-3 pt-2'>
														{(Object.keys(PERMISSION_LABELS) as CenterPermissionKey[]).map((key) => {
															const current = center.permissions?.[key];
															const checked = current !== false; // default ON
															return (
																<div key={key} className='flex items-center justify-between gap-4 border rounded-md p-3'>
																	<div className='space-y-1'>
																		<Label className='font-medium'>{PERMISSION_LABELS[key]}</Label>
																		<p className='text-xs text-muted-foreground'>{key}</p>
																	</div>
																	<Switch
																		checked={checked}
																		disabled={!!savingPermissions[center.id]}
																		onCheckedChange={(v) => updateCenterPermission(center.id, key, v)}
																	/>
																</div>
															);
														})}
													</div>
												</TabsContent>
											</Tabs>
										)}
									</CardContent>
								</CollapsibleContent>
							</Collapsible>
						</Card>
					))}
				</div>

				{filteredCenters.length === 0 && (
					<Card>
						<CardContent className='text-center py-8'>
							<Building className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
							<p className='text-muted-foreground'>Hech qanday markaz topilmadi</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
};

export default CenterUsersManagement;
