'use client';
import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { ClipboardList, Loader2 } from 'lucide-react';

interface Group {
	id: number;
	name: string;
	subject?: string;
}

interface HistoryItem {
	date: string;
	notDoneCount: number;
}

export default function TasksHistoryPage() {
	const { toast } = useToast();
	const [groups, setGroups] = useState<Group[]>([]);
	const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [loading, setLoading] = useState(false);

	const selectedGroup = useMemo(
		() => groups.find((g) => g.id === selectedGroupId),
		[groups, selectedGroupId]
	);

	useEffect(() => {
		void loadGroups();
	}, []);

	useEffect(() => {
		if (!selectedGroupId) return;
		void loadHistory(selectedGroupId);
	}, [selectedGroupId]);

	const loadGroups = async () => {
		try {
			setLoading(true);
			const res = await request.get('/groups/me');
			setGroups(res.data || []);
		} catch (e: any) {
			console.error('Error loading groups for tasks history:', e);
			toast({
				title: 'Xato',
				description: "Guruhlarni yuklab bo'lmadi",
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const loadHistory = async (groupId: number) => {
		try {
			setLoading(true);
			const res = await request.get(`/tasks/history/${groupId}`, { params: { limit: 60 } });
			setHistory(Array.isArray(res.data) ? res.data : []);
		} catch (e: any) {
			console.error('Error loading tasks history:', e);
			toast({
				title: 'Xato',
				description: "Vazifalar tarixini yuklab bo'lmadi",
				variant: 'destructive',
			});
			setHistory([]);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className='space-y-6'>
			<Card className='border-border'>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<ClipboardList className='h-5 w-5' />
						Vazifalar tarixi
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-6'>
					<div className='space-y-2 max-w-md'>
						<label className='text-sm font-medium'>Guruh</label>
						<Select
							value={selectedGroupId?.toString() || ''}
							onValueChange={(value) => setSelectedGroupId(Number(value))}
						>
							<SelectTrigger>
								<SelectValue placeholder='Guruhni tanlang' />
							</SelectTrigger>
							<SelectContent>
								{groups.map((group) => (
									<SelectItem key={group.id} value={group.id.toString()}>
										{group.name} {group.subject && `(${group.subject})`}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{selectedGroupId && (
						<Card>
							<CardHeader>
								<CardTitle className='text-lg flex items-center'>
									Tarix
									{selectedGroup && (
										<Badge variant='outline' className='ml-2'>
											{selectedGroup.name}
										</Badge>
									)}
								</CardTitle>
							</CardHeader>
							<CardContent>
								{loading ? (
									<div className='flex items-center justify-center py-8'>
										<Loader2 className='h-6 w-6 animate-spin mr-2' />
										<span className='text-sm text-muted-foreground'>Yuklanmoqda...</span>
									</div>
								) : history.length === 0 ? (
									<div className='text-sm text-muted-foreground'>Tarix topilmadi</div>
								) : (
									<div className='space-y-2'>
										{history.map((h) => (
											<Link
												key={h.date}
												href={`/account/tasks?groupId=${selectedGroupId}&date=${h.date}`}
												className='flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/40 transition-colors'
											>
												<div className='font-medium'>{h.date}</div>
												<Badge variant={h.notDoneCount > 0 ? 'destructive' : 'outline'}>
													{h.notDoneCount} ta bajarmadi
												</Badge>
											</Link>
										))}
									</div>
								)}
							</CardContent>
						</Card>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
