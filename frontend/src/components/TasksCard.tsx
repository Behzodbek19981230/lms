import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { ClipboardList, Plus } from 'lucide-react';
import TasksModal from '@/components/TasksModal';

export default function TasksCard() {
	const { toast } = useToast();
	const [loading, setLoading] = useState(false);
	const [groups, setGroups] = useState<any[]>([]);
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		void loadGroups();
	}, []);

	const loadGroups = async () => {
		try {
			setLoading(true);
			const groupsRes = await request.get('/groups/me');
			setGroups(groupsRes.data || []);
		} catch (error: any) {
			console.error('Error loading groups for tasks:', error);
			toast({
				title: 'Xato',
				description: "Guruhlarni yuklab bo'lmadi",
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	const handleOpen = () => {
		if (groups.length === 0) {
			toast({
				title: 'Xato',
				description: 'Avval guruhlar mavjud bo\'lishi kerak',
				variant: 'destructive',
			});
			return;
		}
		setShowModal(true);
	};

	return (
		<div className="space-y-6">
			<Card className="border-border shadow-card hover:shadow-hover transition-all duration-500 hover:-translate-y-1 bg-gradient-card backdrop-blur-sm animate-slide-up">
				<CardHeader className="pb-4">
					<CardTitle className="text-card-foreground flex items-center justify-between">
						<div className="flex items-center">
							<div className="p-2 rounded-lg bg-gradient-primary mr-3">
								<ClipboardList className="h-5 w-5 text-white" />
							</div>
							<span className="bg-gradient-hero bg-clip-text text-transparent font-bold">
								Vazifalar
							</span>
						</div>
						<Button
							size="sm"
							className="bg-gradient-primary hover:shadow-glow transition-all duration-300 hover:scale-105"
							onClick={handleOpen}
							disabled={loading}
						>
							<Plus className="h-4 w-4 mr-1" />
							Vazifa belgilash
						</Button>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-sm text-muted-foreground">
						Bugun vazifani bajarmagan o'quvchilarni belgilang.
					</div>
				</CardContent>
			</Card>

			<TasksModal
				isOpen={showModal}
				onClose={() => setShowModal(false)}
				onSuccess={loadGroups}
				groups={groups}
			/>
		</div>
	);
}
